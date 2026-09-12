import type { Block } from "blockly/core";
import * as Blockly from "blockly/core";
import { resolveOutputTypes } from "./resolve";
import { matchingSends } from "./cables";
import {
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
  return field?.getVariable()?.getType() ?? "integer";
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
    apply(this);
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
  safeSetCheck(block.outputConnection, varTypeToOutput(varTypeOf(block)));
}

function applySetVar(block: Block) {
  safeSetCheck(block.getInput("VALUE")?.connection ?? null, assignmentChecks(varTypeOf(block)));
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

export function installDynamicTypes() {
  patchInit("lsl_get_var", applyGetVar);
  patchInit("lsl_set_var", applySetVar);
  patchInit("lsl_change_var", applyChangeVar);
  patchInit("lsl_cast", applyCast);
  patchInit("lsl_param", applyParam);
  patchInit("lsl_component", applyComponent);
  patchInit("lsl_paren", applyParen);
  patchInit("lsl_negate", applyNegate);
  patchInit("lsl_arithmetic", applyArithmetic);
  patchInit("lsl_compare", applyCompare);
  patchInit("lsl_call_expr", applyCallExpr);
  patchInit("lsl_cable_recv", applyCableRecv);
}
