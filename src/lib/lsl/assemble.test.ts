import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleScript } from "./assemble.ts";
import { lslStringLiteral, sanitizeIdent, sanitizeStateName } from "./reserved.ts";

describe("assembleScript", () => {
  it("emits default first even when empty", () => {
    const src = assembleScript({
      globals: [],
      functions: [],
      states: { open: ["touch_start(integer num_detected)\n{\n    llSay(0, \"hi\");\n}"] },
    });
    const defAt = src.indexOf("\ndefault\n");
    const openAt = src.indexOf("\nstate open\n");
    assert.ok(defAt >= 0);
    assert.ok(openAt > defAt);
    assert.ok(src.includes("state_entry()"));
    assert.match(src, /default\s*\{[\s\S]*\}\s*state open/m);
  });

  it("puts globals then functions then states", () => {
    const src = assembleScript({
      globals: ["integer count = 0;"],
      functions: ["integer inc()\n{\n    return count + 1;\n}"],
      states: {
        default: ["state_entry()\n{\n    llSetTimerEvent(1.0);\n}"],
      },
    });
    const g = src.indexOf("integer count");
    const f = src.indexOf("integer inc()");
    const s = src.indexOf("\ndefault\n");
    assert.ok(g >= 0 && f > g && s > f);
  });

  it("does not emit a void keyword on events", () => {
    const src = assembleScript({
      globals: [],
      functions: [],
      states: { default: ["touch_start(integer num_detected)\n{\n    llOwnerSay((string)num_detected);\n}"] },
    });
    assert.doesNotMatch(src, /\bvoid\b/);
    assert.ok(src.includes("touch_start(integer num_detected)"));
  });
});

describe("identifiers", () => {
  it("sanitizes state names", () => {
    assert.equal(sanitizeStateName("default"), "default");
    assert.equal(sanitizeStateName("  Open Door "), "Open_Door");
    assert.equal(sanitizeStateName("if"), "if_");
  });

  it("rejects keywords", () => {
    assert.equal(sanitizeIdent("state", "x"), "state_");
    assert.equal(sanitizeIdent("2bad", "x"), "_2bad");
  });

  it("escapes string literals", () => {
    assert.equal(lslStringLiteral('say "hi"'), '"say \\"hi\\""');
    assert.equal(lslStringLiteral("a\\b\n"), '"a\\\\b\\n"');
  });
});
