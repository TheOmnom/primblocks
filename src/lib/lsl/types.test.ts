import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowedForOperand,
  arithmeticInputsLegal,
  arithmeticOutput,
  assignmentChecks,
  compareLegal,
  componentSubject,
  typesAccept,
  utf8Bytes,
  varTypeToOutput,
} from "./types.ts";
import { inspectCall } from "./limits.ts";

describe("LSL type snaps", () => {
  it("promotes integer into float sockets but not the reverse", () => {
    assert.equal(typesAccept(["Number"], ["Integer"]), true);
    assert.equal(typesAccept(["Integer"], ["Number"]), false);
    assert.equal(typesAccept(["Integer"], ["Boolean"]), true);
    assert.equal(typesAccept(["String"], ["Key"]), true);
    assert.equal(typesAccept(["Key"], ["String"]), true);
    assert.equal(typesAccept(["Vector"], ["Rotation"]), false);
    assert.equal(typesAccept(["Boolean", "Integer"], ["Number"]), false);
  });

  it("rejects string + number and float modulo", () => {
    assert.equal(arithmeticInputsLegal("+", "String", "Integer"), false);
    assert.equal(arithmeticInputsLegal("+", "String", "String"), true);
    assert.equal(arithmeticInputsLegal("%", "Number", "Number"), false);
    assert.equal(arithmeticInputsLegal("%", "Integer", "Integer"), true);
    assert.equal(arithmeticInputsLegal("%", "Vector", "Vector"), true);
    assert.equal(arithmeticInputsLegal("*", "Vector", "Number"), true);
    assert.equal(arithmeticInputsLegal("/", "Integer", "Vector"), false);
    assert.equal(arithmeticOutput("+", "Integer", "Number"), "Number");
    assert.equal(arithmeticOutput("+", "Integer", "Integer"), "Integer");
    assert.equal(arithmeticOutput("*", "Vector", "Vector"), "Number");
    assert.equal(arithmeticOutput("%", "Vector", "Vector"), "Vector");
    assert.equal(arithmeticOutput("+", "List", "Integer"), "List");
  });

  it("does not allow list comparison or float in integer assignment", () => {
    assert.equal(compareLegal("==", "List", "List"), false);
    assert.equal(compareLegal("==", "String", "Key"), true);
    assert.equal(compareLegal("<", "Integer", "Number"), true);
    assert.equal(compareLegal("<", "Vector", "Vector"), false);
    assert.deepEqual(assignmentChecks("integer"), ["Integer", "Boolean"]);
    assert.ok(assignmentChecks("float").includes("Integer"));
    assert.equal(varTypeToOutput("integer"), "Integer");
    assert.equal(varTypeToOutput("float"), "Number");
    assert.deepEqual(componentSubject("s"), ["Rotation"]);
    assert.ok(componentSubject("x").includes("Vector"));
  });

  it("limits + operand when the other side is a string", () => {
    const allowed = allowedForOperand("+", "B", ["String"]);
    assert.ok(allowed.includes("String"));
    assert.ok(allowed.includes("Key"));
    assert.ok(!allowed.includes("Integer"));
  });
});

describe("in-world limits", () => {
  it("warns when a timer is faster than a sim frame", () => {
    const hits = inspectCall("llSetTimerEvent", { SEC: { number: 0.001 } });
    assert.ok(hits.some((h) => h.kind === "limit" && h.message.includes("0.022")));
  });

  it("does not warn on a stopped timer", () => {
    const hits = inspectCall("llSetTimerEvent", { SEC: { number: 0 } });
    assert.equal(hits.filter((h) => h.kind === "limit").length, 0);
  });

  it("clamps sensor range and volume", () => {
    const range = inspectCall("llSensor", { RANGE: { number: 200 } });
    assert.ok(range.some((h) => h.message.includes("96")));
    const vol = inspectCall("llPlaySound", { VOL: { number: 2 } });
    assert.ok(vol.some((h) => h.message.includes("0.0–1.0")));
  });

  it("errors on llRegionSay channel 0", () => {
    const hits = inspectCall("llRegionSay", { CHANNEL: { number: 0 }, MSG: { string: "hi" } });
    assert.ok(hits.some((h) => h.severity === "error" && h.message.includes("channel 0")));
  });

  it("warns on oversized chat and long IM delay", () => {
    const msg = "x".repeat(2000);
    const chat = inspectCall("llSay", { MSG: { string: msg } });
    assert.ok(chat.some((h) => h.message.includes("1023")));
    assert.equal(utf8Bytes(msg), 2000);
    const im = inspectCall("llInstantMessage", { MSG: { string: "hi" } });
    assert.ok(im.some((h) => h.kind === "delay" && h.message.includes("2s")));
  });
});
