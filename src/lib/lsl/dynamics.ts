import type { Block } from "blockly/core";
import * as Blockly from "blockly/core";
import { resolveOutputTypes } from "./resolve";
import { matchingSends } from "./cables";
import {
  ALL_TYPES,
  allowedForOperand,
  arithmeticOutput,
  assignmentChecks,
  castOutput,
  compareAllowed,
  componentSubject,
  EVENT_PARAM_TYPE,
  varTypeToOutput,
} from "./types";

function varTypeOf(block: Block): string {
  const field = block.getField("VAR") as Blockly.FieldVariable | null;
  return field?.getVariable()?.getType() ?? "";
}

function safeSetCheck(conn: Blockly.Connection | null | undefined, check: string | string[] | null) {
  if (!conn) return;
  try {
    conn.setCheck(check);
  } catch {
    /* unplug may throw while disposing */
  }
}

function patchInit(type: string, apply: (block: Block) => void) {
  const def = Blockly.Blocks[type];
  if (!def?.init) return;
  const orig = def.init;
  def.init = function (this: Block) {
    orig.call(this);
    // Do not apply() here — FieldVariable / dropdowns still have JSON defaults,
    // and serialization connects children in the same turn. Tightening now
    // unplugs legal snaps (string get_var into llSetText, (string) cast, etc.).
    this.setOnChange(function (this: Block) {
      if (this.isDeadOrDying?.() || this.isInsertionMarker?.()) return;
      if ((this.workspace as Blockly.WorkspaceSvg | null)?.isDragging?.()) return;
      if ((this as Block & { __lslApplying?: boolean }).__lslApplying) return;
      (this as Block & { __lslApplying?: boolean }).__lslApplying = true;
      try {
        apply(this);
      } finally {
        (this as Block & { __lslApplying?: boolean }).__lslApplying = false;
      }
    });
  };
}

function applyGetVar(block: Block) {
  const t = varTypeOf(block);
  // Unbound / dummy FieldVariable during serialization load — accept every LSL
  // type so a string get_var can still snap into llSetText. reapplyDynamicTypes
  // tightens this after the VAR field is bound.
  safeSetCheck(block.outputConnection, t ? varTypeToOutput(t) : ALL_TYPES);
}

function applySetVar(block: Block) {
  const t = varTypeOf(block);
  safeSetCheck(
    block.getInput("VALUE")?.connection ?? null,
    t ? assignmentChecks(t) : ALL_TYPES,
  );
}

function applyChangeVar(block: Block) {
  const t = varTypeOf(block);
  safeSetCheck(
    block.getInput("DELTA")?.connection ?? null,
    t === "float" ? ["Number", "Integer", "Boolean"] : ["Integer", "Boolean"],
  );
}

function applyCast(block: Block) {
  safeSetCheck(block.outputConnection, castOutput(String(block.getFieldValue("TYPE") || "integer")));
}

function applyParam(block: Block) {
  const name = String(block.getFieldValue("NAME") || "");
  const t = EVENT_PARAM_TYPE[name];
  safeSetCheck(block.outputConnection, t ?? null);
}

function applyComponent(block: Block) {
  const comp = String(block.getFieldValue("COMP") || "x");
  safeSetCheck(block.getInput("VAL")?.connection ?? null, componentSubject(comp));
  safeSetCheck(block.outputConnection, "Number");
}

function applyParen(block: Block) {
  const inner = resolveOutputTypes(block.getInputTargetBlock("VAL"));
  safeSetCheck(block.outputConnection, inner);
}

function applyNegate(block: Block) {
  const inner = resolveOutputTypes(block.getInputTargetBlock("A"));
  const out = inner?.[0] === "Vector" ? "Vector" : inner?.[0] === "Number" ? "Number" : "Integer";
  safeSetCheck(block.outputConnection, out);
  safeSetCheck(block.getInput("A")?.connection ?? null, ["Integer", "Number", "Boolean", "Vector"]);
}

function applyArithmetic(block: Block) {
  const op = String(block.getFieldValue("OP") || "+");
  const aT = resolveOutputTypes(block.getInputTargetBlock("A"));
  const bT = resolveOutputTypes(block.getInputTargetBlock("B"));
  safeSetCheck(block.getInput("A")?.connection ?? null, allowedForOperand(op, "A", bT));
  safeSetCheck(block.getInput("B")?.connection ?? null, allowedForOperand(op, "B", aT));
  if (aT?.[0] && bT?.[0]) {
    const out = arithmeticOutput(op, aT[0], bT[0]);
    safeSetCheck(block.outputConnection, out);
  } else if (aT?.[0] && op === "+") {
    if (aT[0] === "String" || aT[0] === "Key") safeSetCheck(block.outputConnection, "String");
    else if (aT[0] === "List") safeSetCheck(block.outputConnection, "List");
    else if (aT[0] === "Vector") safeSetCheck(block.outputConnection, "Vector");
    else if (aT[0] === "Rotation") safeSetCheck(block.outputConnection, "Rotation");
    else safeSetCheck(block.outputConnection, aT[0] === "Number" ? "Number" : "Integer");
  } else {
    safeSetCheck(block.outputConnection, ["Integer", "Number", "String", "Vector", "Rotation", "List"]);
  }
}

function applyCompare(block: Block) {
  const op = String(block.getFieldValue("OP") || "==");
  const aT = resolveOutputTypes(block.getInputTargetBlock("A"));
  const bT = resolveOutputTypes(block.getInputTargetBlock("B"));
  safeSetCheck(block.getInput("A")?.connection ?? null, compareAllowed(op, bT));
  safeSetCheck(block.getInput("B")?.connection ?? null, compareAllowed(op, aT));
  safeSetCheck(block.outputConnection, "Boolean");
}

function applyCallExpr(block: Block) {
  const types = resolveOutputTypes(block);
  safeSetCheck(block.outputConnection, types && types.length ? types : null);
}

function applyCableRecv(block: Block) {
  const name = String(block.getFieldValue("CABLE") || "").trim();
  const send = name ? matchingSends(block.workspace, name)[0] : null;
  const from = send
    ? resolveOutputTypes(send.getInputTargetBlock("VALUE"))
    : null;
  safeSetCheck(
    block.outputConnection,
    from && from.length ? from : ["Integer", "Number", "String", "Key", "Vector", "Rotation", "List", "Boolean"],
  );
}

const APPLIERS: Record<string, (block: Block) => void> = {
  lsl_get_var: applyGetVar,
  lsl_set_var: applySetVar,
  lsl_change_var: applyChangeVar,
  lsl_cast: applyCast,
  lsl_param: applyParam,
  lsl_component: applyComponent,
  lsl_paren: applyParen,
  lsl_negate: applyNegate,
  lsl_arithmetic: applyArithmetic,
  lsl_compare: applyCompare,
  lsl_call_expr: applyCallExpr,
  lsl_cable_recv: applyCableRecv,
};

const PRODUCERS = new Set([
  "lsl_get_var",
  "lsl_param",
  "lsl_cast",
  "lsl_component",
  "lsl_cable_recv",
]);

export function installDynamicTypes() {
  for (const type of Object.keys(APPLIERS)) {
    patchInit(type, APPLIERS[type]);
  }
}

/** Call after serialization load — Events are disabled during load, so onChange never ran.
 *  Producers first so a later setCheck on a parent socket does not unplug them. */
export function reapplyDynamicTypes(workspace: Blockly.Workspace) {
  const blocks = workspace.getAllBlocks(false);
  for (const block of blocks) {
    if (PRODUCERS.has(block.type)) APPLIERS[block.type]?.(block);
  }
  for (const block of blocks) {
    if (!PRODUCERS.has(block.type)) APPLIERS[block.type]?.(block);
  }
  for (const block of blocks) {
    if (PRODUCERS.has(block.type)) APPLIERS[block.type]?.(block);
  }
}
