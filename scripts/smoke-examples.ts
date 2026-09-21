import assert from "node:assert/strict";
import * as Blockly from "blockly/core";
import * as En from "blockly/msg/en";
import { registerBlocks } from "../src/lib/lsl/blocks.ts";
import { LslConnectionChecker, registerLslChecker } from "../src/lib/lsl/checker.ts";
import { reapplyDynamicTypes } from "../src/lib/lsl/dynamics.ts";
import { EXAMPLES } from "../src/lib/lsl/examples.ts";
import { generateLsl } from "../src/lib/lsl/generator.ts";
import { stepSatisfied, TUTORIALS } from "../src/lib/lsl/tutorials.ts";

Blockly.setLocale(En as unknown as { [key: string]: string });
registerLslChecker();
registerBlocks();

function load(state: object) {
  const ws = new Blockly.Workspace(
    new Blockly.Options({
      plugins: { connectionChecker: LslConnectionChecker },
    } as Blockly.BlocklyOptions),
  );
  const vars = (state as { variables?: { name: string; type?: string; id?: string }[] }).variables;
  if (vars) {
    const map = ws.getVariableMap();
    for (const v of vars) {
      if (!v?.name) continue;
      try {
        map.createVariable(v.name, v.type || "", v.id);
      } catch {
        /* */
      }
    }
  }
  Blockly.serialization.workspaces.load(state, ws);
  reapplyDynamicTypes(ws);
  return ws;
}

for (const ex of EXAMPLES) {
  const ws = load(ex.state);
  const blocks = ws.getAllBlocks(false);
  const code = generateLsl(ws);
  assert.ok(blocks.length > 0, `${ex.id} loaded zero bricks`);
  assert.match(code, /\ndefault\n\{/, `${ex.id} missing default`);
  assert.doesNotMatch(code, /\bvoid\b/, `${ex.id} emitted void`);
  if (ex.id === "dialog") {
    assert.match(code, /llListen\(-42,/);
    assert.match(code, /llDialog\(/);
    assert.match(code, /\["Red", "Green", "Blue"\]/);
    assert.match(code, /llSetColor\(<1\.000, 0\.000, 0\.000>, ALL_SIDES\)/);
    assert.match(code, /llDetectedKey\(0\)/);
  }
  if (ex.id === "listen") {
    assert.match(code, /llListen\(/);
    assert.match(code, /llGetOwner\(\)/);
    assert.match(code, /llTargetOmega\(/);
    assert.match(code, /message == "spin"/);
    assert.match(code, /message == "stop"/);
    assert.doesNotMatch(code, /0 == "spin"/);
  }
  if (ex.id === "wired") {
    assert.match(code, /string cbl_who = "";/);
    assert.match(code, /cbl_who = llDetectedName\(0\);/);
    assert.match(code, /llSay\(0, cbl_who\);/);
  }
  if (ex.id === "wired-sensor") {
    assert.match(code, /llSensorRepeat\(/);
    assert.match(code, /cbl_who = llDetectedName\(0\);/);
    assert.match(code, /llSay\(0, cbl_who\);/);
  }
  if (ex.id === "wired-id") {
    assert.match(code, /string cbl_who = "";/);
    assert.match(code, /key cbl_id = NULL_KEY;/);
    assert.match(code, /cbl_who = llDetectedName\(0\);/);
    assert.match(code, /cbl_id = llDetectedKey\(0\);/);
    assert.match(code, /llSay\(0, cbl_who\);/);
    assert.match(code, /llRegionSayTo\(cbl_id, 0, "private hello"\);/);
  }
  if (ex.id === "counter") {
    assert.match(code, /integer count = 0;/);
    assert.match(code, /count \+= 1;/);
    assert.match(code, /\(string\)count/);
  }
  if (ex.id === "notecard") {
    assert.match(code, /dataserver\(/);
    assert.match(code, /string greeting = "";/);
    assert.match(code, /llSetText\(greeting,/);
  }
  if (ex.id === "placeable") {
    assert.match(code, /on_rez\(integer start_param\)/);
    assert.match(code, /llResetScript\(\);/);
    assert.match(code, /llSetText\("Touch me"/);
    assert.match(code, /llSay\(0, "Hello, Avatar!"\);/);
  }
  if (ex.id === "tipjar") {
    assert.match(code, /integer total = 0;/);
    assert.match(code, /llSetClickAction\(CLICK_ACTION_PAY\)/);
    assert.match(code, /llSetPayPrice\(PAY_DEFAULT,/);
    assert.match(code, /money\(key id, integer amount\)/);
    assert.match(code, /total \+= amount;/);
    assert.doesNotMatch(code, /llDetected/);
    assert.doesNotMatch(code, /PERMISSION_DEBIT/);
  }
  if (ex.id === "wearable") {
    assert.match(code, /attach\(key id\)/);
    assert.match(code, /id != NULL_KEY/);
    assert.match(code, /llOwnerSay\("HUD on"\)/);
    assert.match(code, /llOwnerSay\("Detached"\)/);
    assert.doesNotMatch(code, /llSay\(/);
  }
  if (ex.id === "dual") {
    assert.match(code, /llGetAttached\(\) != 0/);
    assert.match(code, /llOwnerSay\("Ready \(worn\)"\)/);
    assert.match(code, /llSay\(0, "Hello, Avatar!"\)/);
  }
  if (ex.id === "tipjar-hud") {
    assert.match(code, /PAY_HIDE/);
    assert.match(code, /change & CHANGED_OWNER/);
    assert.match(code, /money\(key id, integer amount\)/);
  }
  if (ex.id === "split-tips") {
    assert.match(code, /key partner = NULL_KEY;/);
    assert.match(code, /llRequestPermissions\(llGetOwner\(\), PERMISSION_DEBIT\)/);
    assert.match(code, /run_time_permissions\(integer perm\)/);
    assert.match(code, /llGiveMoney\(partner, amount \/ 2\)/);
    assert.match(code, /money\(key id, integer amount\)/);
  }
  console.log("ok", ex.id, "bricks", blocks.length);
  ws.dispose();
}

const empty = new Blockly.Workspace();
for (const tut of TUTORIALS) {
  assert.equal(tut.startEmpty, true, `${tut.id} should start empty`);
  const first = tut.steps[0];
  if (first?.expect) {
    assert.equal(
      stepSatisfied(empty, first),
      false,
      `${tut.id} step 1 must be locked on an empty workspace`,
    );
  }
}
empty.dispose();

const hello = TUTORIALS.find((t) => t.id === "hello");
assert.ok(hello);
const greeterWs = load(EXAMPLES.find((e) => e.id === "greeter")!.state);
assert.equal(stepSatisfied(greeterWs, hello.steps[0]), true, "greeter has touch_start");
assert.equal(stepSatisfied(greeterWs, hello.steps[1]), true, "greeter has say");
assert.equal(stepSatisfied(greeterWs, hello.steps[2]), true, "greeter has owner-say");
greeterWs.dispose();

console.log("all examples emit pasteable LSL");
console.log("tutorials start empty and wait on the first brick");
