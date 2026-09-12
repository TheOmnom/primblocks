import type { Block, Connection } from "blockly/core";
import * as Blockly from "blockly/core";
import { LSL_EVENT_DEFS } from "./events";
import { LSL_FUNCTIONS } from "./functions";
import { sanitizeIdent } from "./reserved";
import {
  type LslType,
  arithmeticOutput,
  asLslTypes,
  assignmentChecks,
  castOutput,
  EVENT_PARAM_TYPE,
  varTypeToOutput,
} from "./types";

const FN_RETURNS = new Map(LSL_FUNCTIONS.map((f) => [f.type, f.returns]));
const FN_ARGS = new Map(LSL_FUNCTIONS.map((f) => [f.type, f]));

export function eventIdFromType(type: string): string | null {
  return type.startsWith("lsl_event_") ? type.slice("lsl_event_".length) : null;
}

export function ancestorEvent(block: Block): Block | null {
  let p: Block | null = block;
  while (p) {
    if (eventIdFromType(p.type)) return p;
    p = p.getSurroundParent() ?? p.getParent();
  }
  return null;
}

export function ancestorFunction(block: Block): Block | null {
  let p: Block | null = block;
  while (p) {
    if (p.type === "lsl_function") return p;
    p = p.getSurroundParent() ?? p.getParent();
  }
  return null;
}

export function isInsideFunction(block: Block): boolean {
  return !!ancestorFunction(block);
}

export function eventParams(eventType: string): { type: string; name: string }[] {
  const id = eventIdFromType(eventType);
  const def = LSL_EVENT_DEFS.find((e) => e.id === id);
  return def?.params ?? [];
}

function varTypeOf(block: Block): string {
  const field = block.getField("VAR") as Blockly.FieldVariable | null;
  return field?.getVariable()?.getType() ?? "integer";
}

export function resolveOutputTypes(block: Block | null): LslType[] | null {
  if (!block) return null;
  switch (block.type) {
    case "lsl_integer":
      return ["Integer"];
    case "lsl_float":
      return ["Number"];
    case "lsl_string":
      return ["String"];
    case "lsl_vector":
    case "lsl_color_named":
    case "lsl_const_zerovec":
      return ["Vector"];
    case "lsl_rotation":
    case "lsl_euler_rot":
    case "lsl_const_zerorot":
      return ["Rotation"];
    case "lsl_list":
    case "lsl_empty_list":
      return ["List"];
    case "lsl_const_bool":
      return ["Boolean"];
    case "lsl_const_nullkey":
      return ["Key"];
    case "lsl_const_eof":
      return ["String"];
    case "lsl_const_math":
      return ["Number"];
    case "lsl_get_var":
      return [varTypeToOutput(varTypeOf(block))];
    case "lsl_cast":
      return [castOutput(String(block.getFieldValue("TYPE") || "integer"))];
    case "lsl_param": {
      const name = String(block.getFieldValue("NAME") || "");
      return EVENT_PARAM_TYPE[name] ? [EVENT_PARAM_TYPE[name]] : null;
    }
    case "lsl_compare":
    case "lsl_logic":
    case "lsl_not":
      return ["Boolean"];
    case "lsl_bitwise":
      return ["Integer"];
    case "lsl_component":
      return ["Number"];
    case "lsl_paren":
      return resolveOutputTypes(block.getInputTargetBlock("VAL"));
    case "lsl_negate": {
      const inner = resolveOutputTypes(block.getInputTargetBlock("A"));
      if (inner?.[0] === "Vector") return ["Vector"];
      if (inner?.[0] === "Number") return ["Number"];
      return ["Integer"];
    }
    case "lsl_arithmetic": {
      const a = resolveOutputTypes(block.getInputTargetBlock("A"));
      const b = resolveOutputTypes(block.getInputTargetBlock("B"));
      if (a?.[0] && b?.[0]) {
        const out = arithmeticOutput(String(block.getFieldValue("OP")), a[0], b[0]);
        return out ? [out] : a;
      }
      return asLslTypes(block.outputConnection?.getCheck() ?? null);
    }
    case "lsl_call_expr": {
      const name = sanitizeIdent(String(block.getFieldValue("NAME") || "doThing"), "doThing");
      const tops = block.workspace?.getTopBlocks(false) ?? [];
      const fn = tops.find(
        (t) =>
          t.type === "lsl_function" &&
          sanitizeIdent(String(t.getFieldValue("NAME") || ""), "doThing") === name,
      );
      if (fn) {
        const ret = String(fn.getFieldValue("RET") || "");
        if (!ret) return [];
        return [castOutput(ret)];
      }
      return null;
    }
    default: {
      const ret = FN_RETURNS.get(block.type);
      if (ret) return [ret as LslType];
      if (block.type.startsWith("lsl_const_")) return ["Integer"];
      return asLslTypes(block.outputConnection?.getCheck() ?? null);
    }
  }
}

export function resolveInputTypes(conn: Connection): LslType[] | null {
  const block = conn.getSourceBlock();
  const input = block.inputList.find((i) => i.connection === conn);
  const name = input?.name ?? "";

  if (block.type === "lsl_set_var" && name === "VALUE") {
    return assignmentChecks(varTypeOf(block));
  }
  if (block.type === "lsl_change_var" && name === "DELTA") {
    return varTypeOf(block) === "float" ? ["Number", "Integer", "Boolean"] : ["Integer", "Boolean"];
  }
  if (block.type === "lsl_list") {
    return ["Integer", "Number", "String", "Key", "Vector", "Rotation", "Boolean"];
  }
  if (
    (block.type === "lsl_if" ||
      block.type === "lsl_ifelse" ||
      block.type === "lsl_while" ||
      block.type === "lsl_dowhile") &&
    name === "COND"
  ) {
    return ["Boolean", "Integer"];
  }
  if (block.type === "lsl_component" && name === "VAL") {
    return String(block.getFieldValue("COMP")) === "s" ? ["Rotation"] : ["Vector", "Rotation"];
  }
  if (block.type === "lsl_bitwise") return ["Integer", "Boolean"];
  if (block.type === "lsl_logic" || block.type === "lsl_not") return ["Boolean", "Integer"];
  if (block.type === "lsl_negate" && name === "A") return ["Integer", "Number", "Boolean", "Vector"];

  const fn = FN_ARGS.get(block.type);
  if (fn) {
    const arg = fn.args.find((a) => a.name === name);
    if (arg) {
      const c = arg.check;
      return (Array.isArray(c) ? c : [c]) as LslType[];
    }
  }
  return asLslTypes(conn.getCheck());
}

export function literalNumber(block: Block | null): number | null {
  if (!block) return null;
  switch (block.type) {
    case "lsl_integer":
    case "lsl_float":
      return Number(block.getFieldValue("NUM"));
    case "lsl_negate": {
      const n = literalNumber(block.getInputTargetBlock("A"));
      return n == null ? null : -n;
    }
    case "lsl_paren":
      return literalNumber(block.getInputTargetBlock("VAL"));
    case "lsl_cast": {
      const t = String(block.getFieldValue("TYPE"));
      if (t === "integer" || t === "float") return literalNumber(block.getInputTargetBlock("VAL"));
      return null;
    }
    case "lsl_const_bool":
      return block.getFieldValue("VAL") === "TRUE" ? 1 : 0;
    case "lsl_const_math": {
      const v = String(block.getFieldValue("VAL"));
      const map: Record<string, number> = {
        PI: Math.PI,
        TWO_PI: Math.PI * 2,
        PI_BY_TWO: Math.PI / 2,
        DEG_TO_RAD: Math.PI / 180,
        RAD_TO_DEG: 180 / Math.PI,
        SQRT2: Math.SQRT2,
      };
      return map[v] ?? null;
    }
    case "lsl_const_channel":
      return block.getFieldValue("VAL") === "DEBUG_CHANNEL" ? 2147483647 : 0;
    case "lsl_const_face": {
      const v = String(block.getFieldValue("VAL"));
      if (v === "ALL_SIDES") return -1;
      return Number(v);
    }
    default:
      return null;
  }
}

export function literalString(block: Block | null): string | null {
  if (!block) return null;
  if (block.type === "lsl_string") return String(block.getFieldValue("TEXT") ?? "");
  if (block.type === "lsl_paren") return literalString(block.getInputTargetBlock("VAL"));
  if (block.type === "lsl_cast" && String(block.getFieldValue("TYPE")) === "string") {
    const inner = block.getInputTargetBlock("VAL");
    const s = literalString(inner);
    if (s != null) return s;
    const n = literalNumber(inner);
    if (n != null) return String(n);
  }
  return null;
}

export function literalConst(block: Block | null): string | null {
  if (!block) return null;
  if (block.type.startsWith("lsl_const_") && block.getField("VAL")) {
    return String(block.getFieldValue("VAL"));
  }
  return null;
}

export function eachStatement(start: Block | null, visit: (b: Block) => void) {
  let b: Block | null = start;
  while (b) {
    visit(b);
    for (const input of b.inputList) {
      if (input.connection?.type === Blockly.ConnectionType.NEXT_STATEMENT) {
        eachStatement(input.connection.targetBlock(), visit);
      }
    }
    b = b.getNextBlock();
  }
}
