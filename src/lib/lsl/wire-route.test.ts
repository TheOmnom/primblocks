import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cubicHits, pointInRect, routeCable, type Rect } from "./wire-route.ts";

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function through(samples: { x: number; y: number }[], brick: Rect, from: { x: number; y: number }, to: { x: number; y: number }) {
  const interior = { x: brick.x + 4, y: brick.y + 4, w: brick.w - 8, h: brick.h - 8 };
  return samples.filter((p) => {
    if (dist(p, from) < 28 || dist(p, to) < 28) return false;
    return pointInRect(p, interior);
  });
}

describe("wire route", () => {
  it("keeps a cubic when nothing is in the way", () => {
    const from = { x: 0, y: 40 };
    const to = { x: 280, y: 40 };
    const r = routeCable(from, to, []);
    assert.equal(r.kind, "cubic");
    assert.match(r.d, /C /);
    assert.equal(cubicHits(from, to, []), false);
  });

  it("does not cut through a brick sitting between send and receive", () => {
    const from = { x: 0, y: 50 };
    const to = { x: 320, y: 50 };
    const brick = { x: 120, y: 10, w: 80, h: 80 };
    const r = routeCable(from, to, [brick]);
    assert.equal(r.kind, "around");
    assert.equal(through(r.samples, brick, from, to).length, 0);
  });

  it("goes around a tall wall instead of through it", () => {
    const from = { x: 20, y: 100 };
    const to = { x: 300, y: 100 };
    const wall = { x: 140, y: 0, w: 40, h: 220 };
    const r = routeCable(from, to, [wall]);
    const pierced = r.samples.filter((p) => p.x > 144 && p.x < 176 && p.y > 8 && p.y < 212);
    assert.equal(pierced.length, 0, JSON.stringify(pierced.slice(0, 3)));
  });

  it("grows the detour when two bricks sit in the corridor", () => {
    const from = { x: 0, y: 80 };
    const to = { x: 400, y: 80 };
    const a = { x: 80, y: 20, w: 60, h: 120 };
    const b = { x: 220, y: -40, w: 60, h: 120 };
    const r = routeCable(from, to, [a, b]);
    assert.equal(through(r.samples, a, from, to).length, 0);
    assert.equal(through(r.samples, b, from, to).length, 0);
  });

  it("still reaches the receive when the receive sits left of the send", () => {
    const from = { x: 280, y: 40 };
    const to = { x: 40, y: 180 };
    const brick = { x: 80, y: 60, w: 140, h: 80 };
    const r = routeCable(from, to, [brick]);
    assert.ok(r.samples.length > 4);
    const last = r.samples[r.samples.length - 1];
    assert.ok(dist(last, to) < 2);
    assert.equal(through(r.samples, brick, from, to).length, 0);
  });

  it("walks the hull of a stack instead of cutting through it", () => {
    const stack = { x: 0, y: 0, w: 240, h: 300 };
    const from = { x: 210, y: 70 };
    const to = { x: 36, y: 250 };
    const r = routeCable(from, to, [stack]);
    assert.equal(r.kind, "around");
    const deep = { x: 36, y: 50, w: 160, h: 180 };
    const hits = r.samples.filter(
      (p) => pointInRect(p, deep) && dist(p, from) > 36 && dist(p, to) > 36,
    );
    assert.equal(hits.length, 0, JSON.stringify(hits.slice(0, 4)));
  });
});
