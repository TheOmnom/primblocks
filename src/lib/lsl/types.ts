/** Blockly / LSL value types. Integer and Number (float) are distinct — LSL will not implicitly store a float in an integer. */
export type LslType =
  | "Integer"
  | "Number"
  | "String"
  | "Key"
  | "Vector"
  | "Rotation"
  | "List"
  | "Boolean";

export const ALL_TYPES: LslType[] = [
  "Integer",
  "Number",
  "String",
  "Key",
  "Vector",
  "Rotation",
  "List",
  "Boolean",
];

export const LIST_ITEM_TYPES: LslType[] = [
  "Integer",
  "Number",
  "String",
  "Key",
  "Vector",
  "Rotation",
  "Boolean",
];

const NUMERIC = new Set<LslType>(["Integer", "Number", "Boolean"]);
const INTISH = new Set<LslType>(["Integer", "Boolean"]);
const STRINGY = new Set<LslType>(["String", "Key"]);

export function isNumeric(t: LslType): boolean {
  return NUMERIC.has(t);
}
export function isIntish(t: LslType): boolean {
  return INTISH.has(t);
}
export function isStringy(t: LslType): boolean {
  return STRINGY.has(t);
}

/** What a socket labelled `input` will accept from an output of type `output`. */
export function expandInput(input: LslType[]): Set<LslType> {
  const s = new Set<LslType>(input);
  if (s.has("Number")) {
    s.add("Integer");
    s.add("Boolean");
  }
  if (s.has("Integer")) s.add("Boolean");
  if (s.has("String")) s.add("Key");
  if (s.has("Key")) s.add("String");
  return s;
}

export function typesAccept(input: LslType[] | null, output: LslType[] | null): boolean {
  if (!input || !output) return true;
  if (!input.length || !output.length) return false;
  const allowed = expandInput(input);
  return output.some((t) => allowed.has(t));
}

export function varTypeToOutput(t: string): LslType {
  switch (t) {
    case "float":
      return "Number";
    case "string":
      return "String";
    case "key":
      return "Key";
    case "vector":
      return "Vector";
    case "rotation":
      return "Rotation";
    case "list":
      return "List";
    case "integer":
    case "":
    default:
      return "Integer";
  }
}

export function assignmentChecks(varType: string): LslType[] {
  switch (varType) {
    case "float":
      return ["Number", "Integer", "Boolean"];
    case "string":
      return ["String", "Key"];
    case "key":
      return ["Key", "String"];
    case "vector":
      return ["Vector"];
    case "rotation":
      return ["Rotation"];
    case "list":
      return ["List"];
    case "integer":
    case "":
    default:
      return ["Integer", "Boolean"];
  }
}

export function castOutput(lsl: string): LslType {
  switch (lsl) {
    case "float":
      return "Number";
    case "string":
      return "String";
    case "key":
      return "Key";
    case "vector":
      return "Vector";
    case "rotation":
      return "Rotation";
    case "list":
      return "List";
    case "integer":
    default:
      return "Integer";
  }
}

export function arithmeticInputsLegal(op: string, a: LslType, b: LslType): boolean {
  switch (op) {
    case "+":
      if (isNumeric(a) && isNumeric(b)) return true;
      if (isStringy(a) && isStringy(b)) return true;
      if (a === "Vector" && b === "Vector") return true;
      if (a === "Rotation" && b === "Rotation") return true;
      if (a === "List" || b === "List") return true;
      return false;
    case "-":
      if (isNumeric(a) && isNumeric(b)) return true;
      if (a === "Vector" && b === "Vector") return true;
      if (a === "Rotation" && b === "Rotation") return true;
      return false;
    case "*":
      if (isNumeric(a) && isNumeric(b)) return true;
      if (a === "Vector" && (isNumeric(b) || b === "Vector" || b === "Rotation")) return true;
      if (isNumeric(a) && b === "Vector") return true;
      if (a === "Rotation" && (b === "Rotation" || b === "Vector")) return true;
      return false;
    case "/":
      if (isNumeric(a) && isNumeric(b)) return true;
      if (a === "Vector" && isNumeric(b)) return true;
      if (a === "Rotation" && b === "Rotation") return true;
      return false;
    case "%":
      if (isIntish(a) && isIntish(b)) return true;
      if (a === "Vector" && b === "Vector") return true;
      return false;
    default:
      return false;
  }
}

export function arithmeticOutput(op: string, a: LslType, b: LslType): LslType | null {
  if (!arithmeticInputsLegal(op, a, b)) return null;
  switch (op) {
    case "+":
      if (a === "List" || b === "List") return "List";
      if (isStringy(a) || isStringy(b)) return "String";
      if (a === "Vector") return "Vector";
      if (a === "Rotation") return "Rotation";
      if (a === "Number" || b === "Number") return "Number";
      return "Integer";
    case "-":
      if (a === "Vector") return "Vector";
      if (a === "Rotation") return "Rotation";
      if (a === "Number" || b === "Number") return "Number";
      return "Integer";
    case "*":
      if (a === "Vector" && b === "Vector") return "Number";
      if (a === "Vector" || b === "Vector") return "Vector";
      if (a === "Rotation" && b === "Rotation") return "Rotation";
      if (a === "Rotation" || b === "Rotation") return "Vector";
      if (a === "Number" || b === "Number") return "Number";
      return "Integer";
    case "/":
      if (a === "Vector") return "Vector";
      if (a === "Rotation") return "Rotation";
      if (a === "Number" || b === "Number") return "Number";
      return "Integer";
    case "%":
      if (a === "Vector") return "Vector";
      return "Integer";
    default:
      return null;
  }
}

export function operandTypesForOp(op: string, side: "A" | "B"): LslType[] {
  switch (op) {
    case "+":
      return ALL_TYPES;
    case "-":
    case "*":
      return ["Integer", "Number", "Boolean", "Vector", "Rotation"];
    case "/":
      return side === "B"
        ? ["Integer", "Number", "Boolean", "Rotation"]
        : ["Integer", "Number", "Boolean", "Vector", "Rotation"];
    case "%":
      return ["Integer", "Boolean", "Vector"];
    default:
      return ALL_TYPES;
  }
}

export function allowedForOperand(op: string, side: "A" | "B", other: LslType[] | null): LslType[] {
  if (!other?.length) return operandTypesForOp(op, side);
  const allowed: LslType[] = [];
  for (const t of ALL_TYPES) {
    const ok = other.some((o) =>
      side === "A" ? arithmeticInputsLegal(op, t, o) : arithmeticInputsLegal(op, o, t),
    );
    if (ok) allowed.push(t);
  }
  return allowed;
}

export function compareLegal(op: string, a: LslType, b: LslType): boolean {
  if (a === "List" || b === "List") return false;
  if (op === "==" || op === "!=") {
    if (isNumeric(a) && isNumeric(b)) return true;
    if (isStringy(a) && isStringy(b)) return true;
    return a === b;
  }
  return isNumeric(a) && isNumeric(b);
}

export function compareAllowed(op: string, other: LslType[] | null): LslType[] {
  if (op === "==" || op === "!=") {
    if (!other?.length) return ALL_TYPES.filter((t) => t !== "List");
    const allowed: LslType[] = [];
    for (const t of ALL_TYPES) {
      if (other.some((o) => compareLegal(op, t, o))) allowed.push(t);
    }
    return allowed;
  }
  if (!other?.length) return ["Integer", "Number", "Boolean"];
  return other.some(isNumeric) ? ["Integer", "Number", "Boolean"] : [];
}

export function conditionChecks(): LslType[] {
  return ["Boolean", "Integer"];
}

export function componentSubject(comp: string): LslType[] {
  return comp === "s" ? ["Rotation"] : ["Vector", "Rotation"];
}

export function lslTypeLabel(t: LslType): string {
  switch (t) {
    case "Number":
      return "float";
    case "Integer":
      return "integer";
    case "Boolean":
      return "integer (TRUE/FALSE)";
    default:
      return t.toLowerCase();
  }
}

export function describeTypes(types: LslType[] | null): string {
  if (!types?.length) return "any";
  const uniq = [...new Set(types.map(lslTypeLabel))];
  if (uniq.length === 1) return uniq[0];
  if (uniq.length === 2) return `${uniq[0]} or ${uniq[1]}`;
  return `${uniq.slice(0, -1).join(", ")}, or ${uniq[uniq.length - 1]}`;
}

export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

export const EVENT_PARAM_TYPE: Record<string, LslType> = {
  num_detected: "Integer",
  channel: "Integer",
  name: "String",
  id: "Key",
  message: "String",
  change: "Integer",
  perm: "Integer",
  start_param: "Integer",
  queryid: "Key",
  data: "String",
  pos: "Vector",
  amount: "Integer",
  str: "String",
  num: "Integer",
  sender_num: "Integer",
  request_id: "Key",
  status: "Integer",
  body: "String",
  method: "String",
  tnum: "Integer",
  targetpos: "Vector",
  ourpos: "Vector",
  targetrot: "Rotation",
  ourrot: "Rotation",
  agent_id: "Key",
  reason: "Integer",
  time: "String",
  address: "String",
  subject: "String",
  num_left: "Integer",
  event_type: "Integer",
  message_id: "Key",
  sender: "String",
  idata: "Integer",
  sdata: "String",
  success: "Integer",
  type: "Integer",
  reserved: "List",
  action: "Integer",
  value: "String",
  metadata: "List",
};

export function asLslTypes(raw: string | string[] | null | undefined): LslType[] | null {
  if (raw == null) return null;
  const arr = Array.isArray(raw) ? raw : [raw];
  const out: LslType[] = [];
  for (const t of arr) {
    if (ALL_TYPES.includes(t as LslType)) out.push(t as LslType);
  }
  return out.length ? out : null;
}
