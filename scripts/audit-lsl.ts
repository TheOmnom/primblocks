// @ts-nocheck
import assert from "node:assert/strict";
import * as Blockly from "blockly/core";
import * as En from "blockly/msg/en";
import { registerBlocks } from "../src/lib/lsl/blocks.ts";
import { LslConnectionChecker, registerLslChecker } from "../src/lib/lsl/checker.ts";
import { reapplyDynamicTypes } from "../src/lib/lsl/dynamics.ts";
import { EXAMPLES } from "../src/lib/lsl/examples.ts";
import { generateLsl } from "../src/lib/lsl/generator.ts";
import { validateWorkspace } from "../src/lib/lsl/validate.ts";
import { TUTORIALS, LEVELS, stepSatisfied } from "../src/lib/lsl/tutorials.ts";
import { LSL_EVENT_DEFS } from "../src/lib/lsl/events.ts";
import { LSL_FUNCTIONS } from "../src/lib/lsl/functions.ts";
import { LSL_EVENTS, LSL_KEYWORDS } from "../src/lib/lsl/reserved.ts";
import { buildToolbox } from "../src/lib/lsl/toolbox.ts";
import { lslGenerator } from "../src/lib/lsl/generator.ts";

Blockly.setLocale(En as unknown as { [key: string]: string });
registerLslChecker();
registerBlocks();

const issues = [];
function fail(id, msg) { issues.push(`[FAIL] ${id}: ${msg}`); console.log(`[FAIL] ${id}: ${msg}`); }
function warn(id, msg) { issues.push(`[WARN] ${id}: ${msg}`); console.log(`[WARN] ${id}: ${msg}`); }
function ok(id, msg) { console.log(`[ok]   ${id}: ${msg}`); }

function load(state) {
  const ws = new Blockly.Workspace(new Blockly.Options({
    plugins: { connectionChecker: LslConnectionChecker },
  }));
  const vars = state.variables;
  if (vars) {
    const map = ws.getVariableMap();
    for (const v of vars) {
      if (!v?.name) continue;
      try { map.createVariable(v.name, v.type || "", v.id); } catch {}
    }
  }
  Blockly.serialization.workspaces.load(state, ws);
  reapplyDynamicTypes(ws);
  return ws;
}

// --- brace / syntax lints on generated LSL ---
function lintLsl(id, code) {
  if (!/\ndefault\n\{/.test(code)) fail(id, "missing default state");
  if (/\bvoid\b/.test(code)) fail(id, "emitted void");
  if (/\bswitch\b/.test(code)) fail(id, "emitted switch");
  if (/for\s*\(\s*integer\b/.test(code)) fail(id, "declared integer inside for() — LSL compile error");
  if (/if\s*\(\s*\)/.test(code)) fail(id, "empty if()");
  // unmatched braces
  let n = 0;
  for (const ch of code) { if (ch === "{") n++; if (ch === "}") n--; if (n < 0) { fail(id, "unmatched }"); break; } }
  if (n !== 0) fail(id, `unbalanced braces (delta ${n})`);
  // unmatched parens outside comments/strings — rough
  const stripped = code.replace(/\/\/.*$/gm, "").replace(/"(?:\\.|[^"\\])*"/g, '""');
  let p = 0;
  for (const ch of stripped) { if (ch === "(") p++; if (ch === ")") p--; if (p < 0) { fail(id, "unmatched )"); break; } }
  if (p !== 0) fail(id, `unbalanced parens (delta ${p})`);
  // state default must be first state
  const states = [...code.matchAll(/^(default|state \w+)\n\{/gm)].map(m => m[1]);
  if (states[0] !== "default") fail(id, `first state is ${states[0]}`);
  // illegal: two same events in one state (rough)
  const handlers = [...code.matchAll(/^\s{4}(\w+)\(/gm)].map(m => m[1]);
  // skip — events can share names across states
  if (/\bundefined\b/.test(code)) fail(id, "emitted undefined");
  if (/\bNaN\b/.test(code)) fail(id, "emitted NaN");
  if (/\/\/ group \w+\n {12,}\S/.test(code)) fail(id, "group body extra-indented");
  if (/,\s*,/.test(code)) warn(id, "double comma in a call/list");
  if (/\(\s*,/.test(code) || /,\s*\)/.test(code)) fail(id, "leading/trailing comma in call");
}

console.log("\n===== EXAMPLES =====");
for (const ex of EXAMPLES) {
  const ws = load(ex.state);
  const code = generateLsl(ws);
  const diags = validateWorkspace(ws);
  const errors = diags.filter(d => d.severity === "error");
  const warns = diags.filter(d => d.severity === "warning");
  console.log(`\n----- ${ex.id} (${ex.level}) bricks=${ws.getAllBlocks(false).length} errors=${errors.length} warns=${warns.length} -----`);
  console.log(code);
  lintLsl(ex.id, code);
  if (errors.length) fail(ex.id, "workspace errors: " + errors.map(e => e.message).join(" | "));
  for (const w of warns) console.log(`  warn: ${w.message}`);
  ws.dispose();
}

console.log("\n===== CATALOG =====");
const registered = new Set(Object.keys(lslGenerator.forBlock).filter(k => lslGenerator.forBlock[k]));
const missingGen = [];
for (const fn of LSL_FUNCTIONS) {
  if (!registered.has(fn.type) && !lslGenerator.forBlock[fn.type]) missingGen.push(fn.type);
}
if (missingGen.length) fail("catalog", "functions without generators: " + missingGen.join(", "));
else ok("catalog", `${LSL_FUNCTIONS.length} ll* bricks, all have generators`);

const eventIds = LSL_EVENT_DEFS.map(e => e.id);
const reservedEvents = [...LSL_EVENTS];
for (const id of reservedEvents) {
  if (!eventIds.includes(id)) fail("events", `reserved event ${id} has no hat`);
}
for (const ev of LSL_EVENT_DEFS) {
  if (!lslGenerator.forBlock[ev.type]) fail("events", `no generator for ${ev.type}`);
  // signature must match params
  const want = `${ev.id}(${ev.params.map(p => `${p.type} ${p.name}`).join(", ")})`;
  if (ev.signature !== want) fail("events", `signature mismatch ${ev.signature} vs ${want}`);
}
ok("events", `${LSL_EVENT_DEFS.length} event hats`);

// functions that return values but are typically used as statements
const stmtPreferred = ["llSetRegionPos", "llGiveMoney", "llHTTPRequest", "llRequestURL", "llRequestSecureURL", "llGetNotecardLine", "llGetNumberOfNotecardLines", "llRequestAgentData", "llLinksetDataWrite", "llLinksetDataDelete", "llCreateLink"];
for (const name of stmtPreferred) {
  const f = LSL_FUNCTIONS.find(x => x.ll === name);
  if (!f) { warn("catalog", `missing ${name}`); continue; }
  if (f.returns && !f.discardReturn) warn("catalog", `${name} is a reporter (returns ${f.returns}) — cannot snap under a hat without assigning/if. LSL allows discarding the return. Wrap with Control → run (discard return).`);
}
const listen = LSL_FUNCTIONS.find(x => x.ll === "llListen");
if (listen?.returns) fail("llListen", "should be a statement brick");
else ok("llListen", "statement brick (LSL allows discarding the handle)");

console.log("\n===== TUTORIALS =====");
const toolbox = buildToolbox();
const catNames = toolbox.contents.map(c => c.name);
const allBlockTypes = new Set();
function walk(items) {
  if (!items) return;
  for (const it of items) {
    if (it.type) allBlockTypes.add(it.type);
    if (it.contents) walk(it.contents);
  }
}
walk(toolbox.contents);
for (const fn of LSL_FUNCTIONS) allBlockTypes.add(fn.type);
for (const ev of LSL_EVENT_DEFS) allBlockTypes.add(ev.type);
["lsl_if","lsl_ifelse","lsl_repeat","lsl_while","lsl_dowhile","lsl_forever","lsl_state_change","lsl_return","lsl_comment","lsl_raw_stmt","lsl_raw_expr","lsl_eval","lsl_group","lsl_cable_send","lsl_cable_recv","lsl_notecard_read","lsl_nc_if_key","lsl_nc_assign","lsl_nc_line","lsl_nc_key","lsl_nc_value","lsl_nc_index","lsl_nc_ready","lsl_param","lsl_function","lsl_call","lsl_call_expr","lsl_get_var","lsl_set_var","lsl_change_var","lsl_integer","lsl_float","lsl_string","lsl_list","lsl_empty_list","lsl_cast","lsl_arithmetic","lsl_compare","lsl_logic","lsl_not","lsl_color_named"].forEach(t => allBlockTypes.add(t));

const byLevel = {};
for (const t of TUTORIALS) {
  byLevel[t.level] = (byLevel[t.level] || 0) + 1;
  if (!t.startEmpty) fail(t.id, "does not start empty");
  if (!t.steps.length) fail(t.id, "no steps");
  if (!t.steps[0].expect) fail(t.id, "step 1 has no expect — Next is free");
  if (t.exampleId && !EXAMPLES.some(e => e.id === t.exampleId)) fail(t.id, `exampleId ${t.exampleId} missing`);
  for (const [i, s] of t.steps.entries()) {
    if (s.toolbox && !catNames.includes(s.toolbox)) fail(t.id, `step ${i+1} toolbox "${s.toolbox}" is not a category (${catNames.join(",")})`);
    if (s.expect?.type && !allBlockTypes.has(s.expect.type) && !s.expect.type.startsWith("lsl_event_") && !s.expect.type.startsWith("lsl_fn_")) {
      fail(t.id, `step ${i+1} expect type ${s.expect.type} not in toolbox/catalog`);
    }
    if (s.expect?.type && s.expect.type.startsWith("lsl_fn_") && !LSL_FUNCTIONS.some(f => f.type === s.expect.type)) {
      fail(t.id, `step ${i+1} expect ${s.expect.type} is not a catalog function`);
    }
    if (s.expect?.type && s.expect.type.startsWith("lsl_event_") && !LSL_EVENT_DEFS.some(e => e.type === s.expect.type)) {
      fail(t.id, `step ${i+1} expect ${s.expect.type} is not an event hat`);
    }
  }
  const empty = new Blockly.Workspace();
  if (t.steps[0].expect && stepSatisfied(empty, t.steps[0])) fail(t.id, "step 1 already satisfied on empty workspace");
  empty.dispose();
  ok("tutorial", `${t.level.padEnd(13)} ${t.id.padEnd(18)} ${t.steps.length} steps`);
}
console.log("counts", byLevel);
for (const lv of LEVELS) {
  if ((byLevel[lv.id] || 0) < 2) warn("tutorials", `${lv.id} only has ${byLevel[lv.id] || 0} walkthroughs`);
}

// greeter satisfies hello tutorial
const hello = TUTORIALS.find(t => t.id === "hello");
const greeterWs = load(EXAMPLES.find(e => e.id === "greeter").state);
for (const [i, s] of hello.steps.entries()) {
  if (!s.expect) continue;
  const hit = stepSatisfied(greeterWs, s);
  if (!hit) fail("hello", `greeter does not satisfy step ${i+1} (${s.title})`);
  else ok("hello", `greeter satisfies step ${i+1} ${s.title}`);
}
greeterWs.dispose();

const dialogTut = TUTORIALS.find(t => t.id === "touch-dialog");
const dialogWs = load(EXAMPLES.find(e => e.id === "dialog").state);
for (const [i, s] of dialogTut.steps.entries()) {
  if (!s.expect) continue;
  const hit = stepSatisfied(dialogWs, s);
  console.log(`  dialog example vs tut step ${i+1} ${s.title}: ${hit}`);
}
dialogWs.dispose();

const wiredTut = TUTORIALS.find(t => t.id === "cables-wire");
const wiredWs = load(EXAMPLES.find(e => e.id === "wired").state);
for (const [i, s] of wiredTut.steps.entries()) {
  if (!s.expect) continue;
  console.log(`  wired example vs tut step ${i+1} ${s.title}: ${stepSatisfied(wiredWs, s)}`);
}
wiredWs.dispose();

const moneyIds = ["tipjar", "tipjar-hud", "split-tips"];
for (const id of moneyIds) {
  const ex = EXAMPLES.find((e) => e.id === id);
  if (!ex) { fail(id, "missing example"); continue; }
  const ws = load(ex.state);
  const code = generateLsl(ws);
  if (!/money\(key id, integer amount\)/.test(code)) fail(id, "money signature wrong");
  if (/llDetected/.test(code)) fail(id, "money path used llDetected*");
  if (!/total \+= amount;/.test(code)) fail(id, "did not add event amount");
  ok(id, "money path uses amount, not llDetected");
  ws.dispose();
}

const wear = EXAMPLES.find((e) => e.id === "wearable");
if (wear) {
  const ws = load(wear.state);
  const code = generateLsl(ws);
  if (/llSay\(/.test(code)) fail("wearable", "HUD used Nearby say");
  if (!/attach\(key id\)/.test(code)) fail("wearable", "missing attach hat");
  ok("wearable", "owner-say only");
  ws.dispose();
}

const split = EXAMPLES.find((e) => e.id === "split-tips");
if (split) {
  const ws = load(split.state);
  const code = generateLsl(ws);
  if (!/PERMISSION_DEBIT/.test(code)) fail("split-tips", "missing debit");
  if (!/llGiveMoney\(partner, amount \/ 2\)/.test(code)) fail("split-tips", "give half missing or wrong");
  ok("split-tips", "debit + give half");
  ws.dispose();
}

console.log("\n===== SUMMARY =====");
const fails = issues.filter(i => i.startsWith("[FAIL]"));
const warns = issues.filter(i => i.startsWith("[WARN]"));
console.log(`${fails.length} fails, ${warns.length} warns, ${TUTORIALS.length} tutorials, ${EXAMPLES.length} examples, ${LSL_FUNCTIONS.length} functions, ${LSL_EVENT_DEFS.length} events`);
for (const i of issues) console.log(i);
if (fails.length) process.exit(1);
