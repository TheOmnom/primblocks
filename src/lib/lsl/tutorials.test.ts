import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TUTORIALS } from "./tutorials.ts";

describe("tutorials", () => {
  it("every walkthrough starts empty and waits on a brick", () => {
    assert.ok(TUTORIALS.length >= 8);
    for (const t of TUTORIALS) {
      assert.equal(t.startEmpty, true, `${t.id} must start empty`);
      assert.ok(t.steps.length >= 1, `${t.id} has no steps`);
      const first = t.steps[0];
      assert.ok(first.expect, `${t.id} step 1 has nothing to wait on`);
    }
  });

  it("intermediate and above include a cable walkthrough", () => {
    const cable = TUTORIALS.filter((t) =>
      t.steps.some((s) => s.expect?.type === "lsl_cable_send" || s.expect?.type === "lsl_cable_recv"),
    );
    assert.ok(cable.some((t) => t.level === "intermediate"));
    assert.ok(cable.some((t) => t.level === "advanced"));
    assert.ok(cable.some((t) => t.level === "expert"));
  });
});
