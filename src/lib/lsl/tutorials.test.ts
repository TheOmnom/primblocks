import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAMPLES } from "./examples.ts";
import { LEVELS, TUTORIALS } from "./tutorials.ts";

describe("tutorials", () => {
  it("every walkthrough starts empty and waits on a brick", () => {
    assert.ok(TUTORIALS.length >= 16);
    for (const t of TUTORIALS) {
      assert.equal(t.startEmpty, true, `${t.id} must start empty`);
      assert.ok(t.steps.length >= 1, `${t.id} has no steps`);
      const first = t.steps[0];
      assert.ok(first.expect, `${t.id} step 1 has nothing to wait on`);
    }
  });

  it("covers tipjar, wearable, placeable, and dual-use", () => {
    const ids = new Set(TUTORIALS.map((t) => t.id));
    for (const need of ["place-on-land", "tip-jar", "wear-hud", "worn-or-placed", "tipjar-travels", "split-tips"]) {
      assert.ok(ids.has(need), `missing ${need}`);
    }
  });

  it("exampleId rows exist", () => {
    for (const t of TUTORIALS) {
      if (!t.exampleId) continue;
      assert.ok(
        EXAMPLES.some((e) => e.id === t.exampleId),
        `${t.id} exampleId ${t.exampleId} is missing`,
      );
    }
  });

  it("intermediate and above include a data-link walkthrough", () => {
    const wired = TUTORIALS.filter((t) =>
      t.steps.some((s) => s.expect?.type === "lsl_set_var" || s.expect?.type === "lsl_get_var"),
    );
    assert.ok(wired.some((t) => t.level === "intermediate"));
    assert.ok(wired.some((t) => t.level === "advanced"));
    assert.ok(wired.some((t) => t.level === "expert"));
  });

  it("keeps all four difficulty bands populated", () => {
    for (const lv of LEVELS) {
      const n = TUTORIALS.filter((t) => t.level === lv.id).length;
      assert.ok(n >= 3, `${lv.id} only has ${n}`);
    }
  });

  it("first time a brick is required, the step names the left list and the brick", () => {
    for (const t of TUTORIALS) {
      const seen = new Set<string>();
      for (const s of t.steps) {
        const key = s.expect?.variable
          ? `var:${s.expect.variable.name}`
          : s.expect?.type;
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        assert.ok(
          s.find && s.find.length > 0,
          `${t.id} / ${s.title} never says where to find ${key}`,
        );
        for (const f of s.find) {
          assert.match(
            f,
            /→/,
            `${t.id} / ${s.title} find line should be Category → brick: ${f}`,
          );
        }
      }
    }
  });
});
