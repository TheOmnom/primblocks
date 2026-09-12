import { ncGlobalNames } from "./notecard.ts";

export type NotecardReaderSpec = {
  name: string;
  state: string;
  reload: boolean;
  doBody: string;
  doneBody: string;
  missingBody: string;
};

const INDENT = "    ";

function indent(src: string, n = 1): string {
  const pad = INDENT.repeat(n);
  return src
    .replace(/\s+$/g, "")
    .split("\n")
    .map((line) => (line.length ? pad + line : line))
    .join("\n");
}

/** Insert statements at the top of an existing `event(...) { body }` handler. */
export function prependInHandler(handler: string, statements: string): string {
  const open = handler.indexOf("{");
  const close = handler.lastIndexOf("}");
  if (open < 0 || close < 0 || close < open) return handler;
  const head = handler.slice(0, open + 1);
  const body = handler.slice(open + 1, close);
  const tail = handler.slice(close);
  const insert = indent(statements.trim(), 1);
  const bodyStartsEmpty = !body.trim();
  if (bodyStartsEmpty) return `${head}\n${insert}\n${tail}`;
  return `${head}\n${insert}\n${body.replace(/^\n/, "")}${tail.startsWith("\n") ? "" : ""}${tail}`;
}

export function readerGlobals(spec: NotecardReaderSpec): string[] {
  const n = ncGlobalNames(spec.name);
  return [
    `string ${n.nameVar} = ${n.literal};`,
    `integer ${n.lineVar};`,
    `key ${n.queryVar};`,
    `integer ${n.readyVar};`,
  ];
}

export function readerStartFunction(spec: NotecardReaderSpec): string {
  const n = ncGlobalNames(spec.name);
  const missing = spec.missingBody.trim()
    ? spec.missingBody.replace(/\s+$/g, "")
    : `llOwnerSay("Drop a notecard named \\"" + ${n.nameVar} + "\\" into this prim.");\n`;
  return (
    `${n.startFn}()\n` +
    `{\n` +
    `${INDENT}if (llGetInventoryType(${n.nameVar}) != INVENTORY_NOTECARD)\n` +
    `${INDENT}{\n` +
    `${indent(missing, 2)}\n` +
    `${INDENT}${INDENT}return;\n` +
    `${INDENT}}\n` +
    `${INDENT}${n.readyVar} = FALSE;\n` +
    `${INDENT}${n.lineVar} = 0;\n` +
    `${INDENT}${n.queryVar} = llGetNotecardLine(${n.nameVar}, ${n.lineVar});\n` +
    `}\n`
  );
}

/** Body of the dataserver branch for one notecard (already inside `if (queryid == queryVar)`). */
export function readerDataserverInner(spec: NotecardReaderSpec): string {
  const n = ncGlobalNames(spec.name);
  const doBody = spec.doBody.trim();
  const doneBody = spec.doneBody.trim()
    ? spec.doneBody.replace(/\s+$/g, "")
    : `llOwnerSay("Notecard \\"" + ${n.nameVar} + "\\" loaded.");\n`;
  const parseInner = doBody
    ? `integer _nc_eq = llSubStringIndex(_nc_raw, "=");\n` +
      `string _nc_key = "";\n` +
      `string _nc_val = _nc_raw;\n` +
      `if (_nc_eq > 0)\n` +
      `{\n` +
      `${INDENT}_nc_key = llStringTrim(llGetSubString(_nc_raw, 0, _nc_eq - 1), STRING_TRIM);\n` +
      `${INDENT}_nc_val = llStringTrim(llGetSubString(_nc_raw, _nc_eq + 1, -1), STRING_TRIM);\n` +
      `}\n` +
      doBody.replace(/\s+$/g, "") +
      "\n"
    : "";
  return (
    `if (data == NAK)\n` +
    `{\n` +
    `${INDENT}${n.queryVar} = llGetNotecardLine(${n.nameVar}, ${n.lineVar});\n` +
    `${INDENT}return;\n` +
    `}\n` +
    `if (data == EOF)\n` +
    `{\n` +
    `${INDENT}${n.readyVar} = TRUE;\n` +
    `${doneBody ? `${indent(doneBody, 1)}\n` : ""}` +
    `${INDENT}return;\n` +
    `}\n` +
    `string _nc_raw = llStringTrim(data, STRING_TRIM);\n` +
    `if (_nc_raw != "" && llGetSubString(_nc_raw, 0, 0) != "#" && llGetSubString(_nc_raw, 0, 1) != "//")\n` +
    `{\n` +
    `${parseInner ? `${indent(parseInner, 1)}\n` : ""}` +
    `}\n` +
    `${n.lineVar} += 1;\n` +
    `${n.queryVar} = llGetNotecardLine(${n.nameVar}, ${n.lineVar});\n`
  );
}

export function readerDataserverDispatch(spec: NotecardReaderSpec): string {
  const n = ncGlobalNames(spec.name);
  const inner = readerDataserverInner(spec);
  return (
    `if (queryid == ${n.queryVar})\n` +
    `{\n` +
    `${indent(inner, 1)}\n` +
    `${INDENT}return;\n` +
    `}\n`
  );
}

export function readerChangedSnippet(spec: NotecardReaderSpec): string {
  const n = ncGlobalNames(spec.name);
  return (
    `if (change & CHANGED_INVENTORY)\n` +
    `{\n` +
    `${INDENT}${n.startFn}();\n` +
    `}\n`
  );
}

export function applyReadersToStates(
  states: Record<string, string[]>,
  readers: NotecardReaderSpec[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(states)) out[k] = [...v];

  const byState = new Map<string, NotecardReaderSpec[]>();
  for (const r of readers) {
    const list = byState.get(r.state) ?? [];
    list.push(r);
    byState.set(r.state, list);
  }

  for (const [state, list] of byState) {
    if (!out[state]) out[state] = [];
    const startCalls = list.map((r) => `${ncGlobalNames(r.name).startFn}();\n`).join("");
    const dsDispatch = list.map(readerDataserverDispatch).join("");
    const chSnippets = list.filter((r) => r.reload).map(readerChangedSnippet).join("");

    upsertHandler(out[state], "state_entry()", "state_entry()\n{\n}\n", startCalls);
    upsertHandler(
      out[state],
      "dataserver(",
      "dataserver(key queryid, string data)\n{\n}\n",
      dsDispatch,
    );
    if (chSnippets) {
      upsertHandler(out[state], "changed(", "changed(integer change)\n{\n}\n", chSnippets);
    }
  }
  return out;
}

function upsertHandler(events: string[], match: string, blank: string, snippet: string) {
  const idx = events.findIndex((e) => e.trimStart().startsWith(match));
  if (idx >= 0) {
    events[idx] = prependInHandler(events[idx], snippet);
    return;
  }
  events.unshift(prependInHandler(blank, snippet));
}

export function readerLocalsHelp(): string {
  return "_nc_raw (trimmed line), _nc_key, _nc_val, _nc_eq";
}
