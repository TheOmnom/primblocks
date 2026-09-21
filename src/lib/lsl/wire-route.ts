export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

const STUB = 22;
const CLEAR = 16;
const PAD = 8;
const SAMPLES = 24;

export function inflate(r: Rect, p: number): Rect {
  return { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p };
}

export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

export function pointInRect(p: Pt, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function bezierCtrl(a: Pt, b: Pt) {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45);
  return { p1: { x: a.x + dx, y: a.y }, p2: { x: b.x - dx, y: b.y } };
}

export function cubicPath(a: Pt, b: Pt): string {
  const { p1, p2 } = bezierCtrl(a, b);
  return `M ${fmt(a.x)} ${fmt(a.y)} C ${fmt(p1.x)} ${fmt(p1.y)}, ${fmt(p2.x)} ${fmt(p2.y)}, ${fmt(b.x)} ${fmt(b.y)}`;
}

function bezierPoint(a: Pt, b: Pt, t: number): Pt {
  const { p1, p2 } = bezierCtrl(a, b);
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * b.y,
  };
}

export function cubicHits(a: Pt, b: Pt, obs: Rect[]): boolean {
  for (let i = 1; i < SAMPLES; i++) {
    const p = bezierPoint(a, b, i / SAMPLES);
    for (const o of obs) if (pointInRect(p, o)) return true;
  }
  return false;
}

/** Liang–Barsky. Edge-grazing counts as a hit. */
export function segmentHitsRect(a: Pt, b: Pt, r: Rect): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  if (!clip(-dx, a.x - r.x)) return false;
  if (!clip(dx, r.x + r.w - a.x)) return false;
  if (!clip(-dy, a.y - r.y)) return false;
  if (!clip(dy, r.y + r.h - a.y)) return false;
  return t0 <= t1;
}

function pathHits(pts: Pt[], obs: Rect[]): Rect[] {
  const hit: Rect[] = [];
  const last = pts.length - 2;
  for (const o of obs) {
    for (let i = 1; i < last; i++) {
      if (segmentHitsRect(pts[i], pts[i + 1], o)) {
        hit.push(o);
        break;
      }
    }
  }
  return hit;
}

function hull(cluster: Rect) {
  return {
    left: cluster.x - CLEAR,
    right: cluster.x + cluster.w + CLEAR,
    top: cluster.y - CLEAR,
    bottom: cluster.y + cluster.h + CLEAR,
  };
}

function alreadyOut(p: Pt, cluster: Rect): boolean {
  return !pointInRect(p, inflate(cluster, 1));
}

/** Nearest point on the padded hull. Sends prefer the right edge, receives the left. */
function exitPoint(p: Pt, cluster: Rect, side: "out" | "in"): Pt {
  const h = hull(cluster);
  if (alreadyOut(p, cluster)) {
    return side === "out" ? { x: p.x + STUB, y: p.y } : { x: p.x - STUB, y: p.y };
  }
  const opts = [
    { pt: { x: h.right, y: p.y }, cost: Math.abs(h.right - p.x) + (side === "in" ? 28 : 0) },
    { pt: { x: h.left, y: p.y }, cost: Math.abs(p.x - h.left) + (side === "out" ? 28 : 0) },
    { pt: { x: p.x, y: h.top }, cost: Math.abs(p.y - h.top) + 10 },
    { pt: { x: p.x, y: h.bottom }, cost: Math.abs(h.bottom - p.y) + 10 },
  ];
  opts.sort((a, b) => a.cost - b.cost);
  return opts[0].pt;
}

function pathLen(pts: Pt[]): number {
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) n += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  return n;
}

function aroundPoints(from: Pt, to: Pt, cluster: Rect): Pt[] {
  const leave = exitPoint(from, cluster, "out");
  const enter = exitPoint(to, cluster, "in");
  const h = hull(cluster);

  const via = (y: number): Pt[] => [from, leave, { x: leave.x, y }, { x: enter.x, y }, enter, to];
  const above = via(h.top);
  const below = via(h.bottom);
  const wrapRight: Pt[] = [from, leave, { x: h.right, y: leave.y }, { x: h.right, y: enter.y }, enter, to];
  const wrapLeft: Pt[] = [from, leave, { x: h.left, y: leave.y }, { x: h.left, y: enter.y }, enter, to];

  const candidates = [above, below, wrapRight, wrapLeft];
  const clear = candidates.filter((c) => pathHits(c, [cluster]).length === 0);
  const pool = clear.length ? clear : [above, below];
  pool.sort((a, b) => pathLen(a) - pathLen(b));
  return pool[0];
}

function collapse(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.75) out.push(p);
  }
  return out;
}

function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

export function roundedPath(pts: Pt[], radius = 14): string {
  const p = collapse(pts);
  if (p.length < 2) return "";
  if (p.length === 2) return cubicPath(p[0], p[1]);
  let d = `M ${fmt(p[0].x)} ${fmt(p[0].y)}`;
  for (let i = 1; i < p.length - 1; i++) {
    const prev = p[i - 1];
    const cur = p[i];
    const next = p[i + 1];
    const d1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const d2 = Math.hypot(next.x - cur.x, next.y - cur.y);
    if (d1 < 0.75 || d2 < 0.75) continue;
    const r = Math.min(radius, d1 / 2, d2 / 2);
    const a = {
      x: cur.x + ((prev.x - cur.x) / d1) * r,
      y: cur.y + ((prev.y - cur.y) / d1) * r,
    };
    const b = {
      x: cur.x + ((next.x - cur.x) / d2) * r,
      y: cur.y + ((next.y - cur.y) / d2) * r,
    };
    d += ` L ${fmt(a.x)} ${fmt(a.y)} Q ${fmt(cur.x)} ${fmt(cur.y)} ${fmt(b.x)} ${fmt(b.y)}`;
  }
  const last = p[p.length - 1];
  d += ` L ${fmt(last.x)} ${fmt(last.y)}`;
  return d;
}

export function densify(pts: Pt[], step = 8): Pt[] {
  const p = collapse(pts);
  const out: Pt[] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i];
    const b = p[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  if (p.length) out.push(p[p.length - 1]);
  return out;
}

export type CableRoute = { d: string; samples: Pt[]; kind: "cubic" | "around" };

export function routeCable(from: Pt, to: Pt, obstacles: Rect[]): CableRoute {
  const obs = obstacles
    .map((o) => inflate(o, PAD))
    .filter((o) => o.w > 4 && o.h > 4);

  if (!obs.length || !cubicHits(from, to, obs)) {
    return {
      d: cubicPath(from, to),
      samples: Array.from({ length: 21 }, (_, i) => bezierPoint(from, to, i / 20)),
      kind: "cubic",
    };
  }

  let cluster: Rect | null = null;
  let pts: Pt[] = [from, to];
  for (let n = 0; n < 12; n++) {
    const hits = n === 0 ? obs.filter((o) => cubicHits(from, to, [o])) : pathHits(pts, obs);
    if (!hits.length) break;
    cluster = hits.reduce((acc, o) => (acc ? unionRect(acc, o) : o), cluster);
    pts = aroundPoints(from, to, cluster!);
  }

  return { d: roundedPath(pts), samples: densify(pts), kind: "around" };
}
