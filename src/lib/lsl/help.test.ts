import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LSL_EVENT_DEFS } from "./events.ts";
import { LSL_FUNCTIONS } from "./functions.ts";
import { brickHelpMap, helpCoverage, helpFor } from "./help.ts";

describe("brick help", () => {
  it("covers every event hat and ll* brick", () => {
    const map = brickHelpMap();
    for (const ev of LSL_EVENT_DEFS) {
      const h = map.get(ev.type);
      assert.ok(h, `missing help for ${ev.type}`);
      assert.ok(h.tip.length > 8, `${ev.type} tip too short`);
    }
    for (const fn of LSL_FUNCTIONS) {
      const h = map.get(fn.type);
      assert.ok(h, `missing help for ${fn.ll}`);
      assert.ok(h.tip.length > 8, `${fn.ll} tip too short`);
    }
    const cov = helpCoverage();
    assert.equal(cov.events, LSL_EVENT_DEFS.length);
    assert.equal(cov.functions, LSL_FUNCTIONS.length);
    assert.ok(cov.extras >= 20, "control / cable extras should be written, not generated");
  });

  it("falls back for unknown constants without throwing", () => {
    const h = helpFor("lsl_const_pay");
    assert.equal(h.title, "constant");
    assert.match(h.tip, /wiki name/i);
  });

  it("uses handwritten copy for if / group / notecard", () => {
    assert.match(helpFor("lsl_if").tip, /integer/i);
    assert.match(helpFor("lsl_group").tip, /comment/i);
    assert.match(helpFor("lsl_notecard_read").why, /NAK/i);
    assert.match(helpFor("lsl_param").tip, /amount|num_detected|official/i);
  });

  it("does not tell you debit is required to receive a tip", () => {
    const money = helpFor("lsl_event_money");
    assert.match(money.tip, /amount/i);
    assert.match(money.why, /do not need PERMISSION_DEBIT to receive/i);
    assert.match(helpFor("lsl_fn_llGiveMoney").tip, /PERMISSION_DEBIT/i);
    assert.match(helpFor("lsl_fn_llSetPayPrice").tip, /PAY_DEFAULT/i);
    assert.match(helpFor("lsl_event_attach").tip, /NULL_KEY/i);
  });
});
