import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { packTops } from "./layout.ts";

describe("packTops", () => {
  it("leaves two hats alone when they already have a gap", () => {
    const out = packTops([
      { ox: 40, oy: 20, w: 200, h: 80 },
      { ox: 40, oy: 200, w: 200, h: 80 },
    ]);
    assert.deepEqual(out, [
      { x: 40, y: 20 },
      { x: 40, y: 200 },
    ]);
  });

  it("pushes a second hat down when it sits on the first", () => {
    const out = packTops([
      { ox: 40, oy: 20, w: 220, h: 180 },
      { ox: 40, oy: 140, w: 180, h: 90 },
    ], 48);
    assert.equal(out[0].x, 40);
    assert.equal(out[0].y, 20);
    assert.equal(out[1].x, 40);
    assert.equal(out[1].y, 20 + 180 + 48);
  });

  it("slides a hat that started to the right, instead of stacking it", () => {
    const out = packTops([
      { ox: 40, oy: 20, w: 400, h: 120 },
      { ox: 300, oy: 20, w: 160, h: 80 },
    ], 48);
    assert.equal(out[0].x, 40);
    assert.ok(out[1].x >= 40 + 400 + 48);
    assert.equal(out[1].y, 20);
  });
});
