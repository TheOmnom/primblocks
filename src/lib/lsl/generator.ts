import { CodeGenerator } from "blockly/core";
import type { Block, Workspace } from "blockly/core";
import { assembleScript } from "./assemble";
import { fallbackLiteral, LSL_FUNCTIONS } from "./functions";
import {
  applyReadersToStates,
  readerGlobals,
  readerStartFunction,
  type NotecardReaderSpec,
} from "./notecard-gen";
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

/** statementToCode pads with INDENT; the notecard merger re-indents itself. */
function stripIndent(src: string): string {
  const text = String(src || "").replace(/\s+$/g, "");
  if (!text) return "";
  const lines = text.split("\n");
  const xs = lines.filter((l) => l.trim()).map((l) => (l.match(/^[ \t]*/)?.[0].length ?? 0));
  const min = xs.length ? Math.min(...xs) : 0;
  return `${lines.map((l) => l.slice(min)).join("\n")}\n`;
}

export function generateLsl(workspace: Workspace): string {
  lslGenerator.init(workspace);

  const notes: string[] = [];
  const globals: string[] = [];
  const functions: string[] = [];
  const states: Record<string, string[]> = { default: [] };
  const seenEvent = new Set<string>();
  const readers: NotecardReaderSpec[] = [];
  const seenNc = new Set<string>();

  const variables = workspace.getVariableMap().getAllVariables();
  for (const v of variables) {
    const ident = sanitizeIdent(v.getName(), "var1");
    const rawType = v.getType();
    if (!rawType || !VAR_DEFAULTS[rawType]) continue;
    globals.push(`${rawType} ${ident} = ${VAR_DEFAULTS[rawType]};`);
  }

  const tops = workspace.getTopBlocks(true);
  let userFns = false;
  for (const block of tops) {
    if (block.isInsertionMarker?.()) continue;
    const t = block.type;
    if (t === "lsl_function") {
      const code = lslGenerator.blockToCode(block);
      if (typeof code === "string" && code.trim()) functions.push(code);
      userFns = true;
      continue;
    }
    if (t === "lsl_notecard_read") {
      const name = String(block.getFieldValue("NAME") || "config").trim() || "config";
      const state = sanitizeStateName(block.getFieldValue("STATE") || "default");
      const key = `${state}::${name}`;
      if (seenNc.has(key)) {
        notes.push(`Dropped extra notecard reader for "${name}" in state ${state}.`);
        continue;
      }
      seenNc.add(key);
      readers.push({
        name,
        state,
        reload: String(block.getFieldValue("RELOAD") || "TRUE") !== "FALSE",
        doBody: stripIndent(String(lslGenerator.statementToCode(block, "DO") || "")),
        doneBody: stripIndent(String(lslGenerator.statementToCode(block, "DONE") || "")),
        missingBody: stripIndent(String(lslGenerator.statementToCode(block, "MISSING") || "")),
      });
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

  if (readers.length) {
    const names = [...new Set(readers.map((r) => r.name))];
    notes.push(
      `Pair with notecard${names.length > 1 ? "s" : ""} named ${names.map((n) => `"${n}"`).join(", ")} in this prim. Format: key = value. # comments. 255 bytes/line.`,
    );
    for (const r of readers) {
      globals.push(...readerGlobals(r));
      functions.push(readerStartFunction(r));
    }
  }

  if (userFns) {
    notes.push("User functions are emitted above states. LSL forbids changing state from inside a function.");
  }

  const merged = readers.length ? applyReadersToStates(states, readers) : states;
  const assembled = assembleScript({ globals, functions, states: merged, notes });
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
