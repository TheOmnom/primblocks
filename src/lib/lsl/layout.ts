import type { WorkspaceSvg } from "blockly/core";
import type * as Blockly from "blockly/core";

export type Box = { x: number; y: number; w: number; h: number };

function hits(a: Box, b: Box, gap: number) {
  return (
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y
  );
}

/** Push stacked hats apart. Same column goes down; a hat that started to the right slides right. */
export function packTops(
  items: { ox: number; oy: number; w: number; h: number }[],
  gap = 48,
): { x: number; y: number }[] {
  const order = items.map((it, i) => ({ ...it, i })).sort((a, b) => a.oy - b.oy || a.ox - b.ox);
  const placed: Box[] = [];
  const pos: { x: number; y: number }[] = items.map((it) => ({ x: it.ox, y: it.oy }));

  for (const it of order) {
    let x = Math.max(24, it.ox);
    let y = Math.max(16, it.oy);
    for (let n = 0; n < 80; n++) {
      const box = { x, y, w: it.w, h: it.h };
      const hit = placed.find((p) => hits(box, p, gap));
      if (!hit) break;
      if (it.ox >= hit.x + 120) {
        x = hit.x + hit.w + gap;
        y = Math.max(y, hit.y);
      } else {
        y = hit.y + hit.h + gap;
      }
    }
    placed.push({ x, y, w: it.w, h: it.h });
    pos[it.i] = { x, y };
  }
  return pos;
}

function stackBox(root: Blockly.BlockSvg): Box | null {
  const xy = root.getRelativeToSurfaceXY?.();
  const hw = root.getHeightWidth?.();
  if (!xy || !hw) return null;
  let x1 = xy.x;
  let y1 = xy.y;
  let x2 = xy.x + Math.max(hw.width, 80);
  let y2 = xy.y + Math.max(hw.height, 40);
  for (const b of root.getDescendants(true)) {
    if (b.isShadow?.() || b.isInsertionMarker?.()) continue;
    const svg = b as Blockly.BlockSvg;
    const p = svg.getRelativeToSurfaceXY?.();
    const size = svg.getHeightWidth?.();
    if (!p || !size || size.width < 4 || size.height < 4) continue;
    x1 = Math.min(x1, p.x);
    y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x + size.width);
    y2 = Math.max(y2, p.y + size.height);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function spaceTopBlocks(workspace: WorkspaceSvg, gap = 48) {
  const tops = workspace.getTopBlocks(false).filter((b) => !b.isShadow?.() && !b.isInsertionMarker?.());
  if (tops.length < 2) return;
  for (const b of tops) {
    try {
      (b as Blockly.BlockSvg).render?.();
    } catch {
      /* */
    }
  }
  const items = tops.map((b) => {
    const svg = b as Blockly.BlockSvg;
    const xy = svg.getRelativeToSurfaceXY();
    const box = stackBox(svg);
    return {
      b: svg,
      ox: xy.x,
      oy: xy.y,
      w: box?.w ?? 160,
      h: box?.h ?? 64,
    };
  });
  const next = packTops(
    items.map(({ ox, oy, w, h }) => ({ ox, oy, w, h })),
    gap,
  );
  for (let i = 0; i < items.length; i++) {
    const cur = items[i].b.getRelativeToSurfaceXY();
    const dx = next[i].x - cur.x;
    const dy = next[i].y - cur.y;
    if (dx || dy) items[i].b.moveBy(dx, dy);
  }
}
