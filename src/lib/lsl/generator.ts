import { CodeGenerator } from "blockly/core";
import type { Block, Workspace } from "blockly/core";
import { assembleScript } from "./assemble";
import { fallbackLiteral, LSL_FUNCTIONS } from "./functions";
import { Order } from "./order";
import { sanitizeIdent, sanitizeStateName } from "./reserved";

export { Order };

export const lslGenerator = new CodeGenerator("LSL");
lslGenerator.INDENT = "    ";
lslGenerator.COMMENT_WRAP = 80;
lslGenerator.STATEMENT_PREFIX = "";
lslGenerator.STATEMENT_SUFFIX = "";

lslGenerator.scrub_ = function (block, code, thisOnly) {
  let commentCode = "";
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    const comment = block.getCommentText();
    if (comment) {
      commentCode += this.prefixLines(`${comment}\n`, "// ");
    }
  }
  const next = block.getNextBlock();
  const nextCode = thisOnly || !next ? "" : this.blockToCode(next);
  return commentCode + code + (typeof nextCode === "string" ? nextCode : "");
};

const VAR_DEFAULTS: Record<string, string> = {
  integer: "0",
  float: "0.0",
  string: '""',
  key: "NULL_KEY",
  vector: "ZERO_VECTOR",
  rotation: "ZERO_ROTATION",
  list: "[]",
};

export function valueCode(
  block: Block,
  generator: CodeGenerator,
  name: string,
  fallback: string,
  order: number = Order.NONE,
): string {
  return generator.valueToCode(block, name, order) || fallback;
}

export function generateLsl(workspace: Workspace): string {
  lslGenerator.init(workspace);

  const notes: string[] = [];
  const globals: string[] = [];
  const functions: string[] = [];
  const states: Record<string, string[]> = { default: [] };
  const seenEvent = new Set<string>();

  const variables = workspace.getVariableMap().getAllVariables();
  for (const v of variables) {
    const ident = sanitizeIdent(v.getName(), "var1");
    const t = v.getType() && VAR_DEFAULTS[v.getType()] ? v.getType() : "integer";
    globals.push(`${t} ${ident} = ${VAR_DEFAULTS[t]};`);
  }

  const tops = workspace.getTopBlocks(true);
  for (const block of tops) {
    if (block.isInsertionMarker?.()) continue;
    const t = block.type;
    if (t === "lsl_function") {
      const code = lslGenerator.blockToCode(block);
      if (typeof code === "string" && code.trim()) functions.push(code);
      continue;
    }
    if (t.startsWith("lsl_event_")) {
      const state = sanitizeStateName(block.getFieldValue("STATE") || "default");
      const eventId = t.slice("lsl_event_".length);
      const key = `${state}::${eventId}`;
      if (seenEvent.has(key)) {
        notes.push(`Dropped duplicate ${eventId} in state ${state} — LSL allows one handler per event per state.`);
        continue;
      }
      seenEvent.add(key);
      const code = lslGenerator.blockToCode(block);
      if (typeof code === "string" && code.trim()) {
        if (!states[state]) states[state] = [];
        states[state].push(code);
      }
      continue;
    }
    if (t === "lsl_comment" || t === "lsl_raw_stmt") {
      notes.push("A comment or raw brick sat outside an event and was ignored. Snap it under a yellow hat.");
    }
  }

  if (functions.length) {
    notes.push("User functions are emitted above states. LSL forbids changing state from inside a function.");
  }

  const assembled = assembleScript({ globals, functions, states, notes });
  return lslGenerator.finish(assembled);
}

export function wireFunctionGenerators() {
  for (const fn of LSL_FUNCTIONS) {
    lslGenerator.forBlock[fn.type] = (block, generator) => {
      const names = fn.order ?? fn.args.map((a) => a.name);
      const vals = names.map((n) => {
        const arg = fn.args.find((a) => a.name === n);
        const fb = arg ? fallbackLiteral(arg.check) : "0";
        return generator.valueToCode(block, n, Order.NONE) || fb;
      });
      const call = `${fn.ll}(${vals.join(", ")})`;
      if (fn.returns) return [call, Order.FUNCTION_CALL];
      return `${call};\n`;
    };
  }
}
