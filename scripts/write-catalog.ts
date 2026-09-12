/**
 * Regenerates docs/CATALOG.md from the live event / function tables.
 * Parses the TypeScript as text so we don't have to fight extension-less imports.
 * Run: npm run catalog
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const CAT_LABEL: Record<string, string> = {
  looks: "Looks",
  motion: "Motion",
  sound: "Sound",
  sensing: "Sensing",
  chat: "Chat",
  world: "World",
  operator: "Operators",
  list: "Lists",
};

type FnRow = { ll: string; cat: string; message: string; returns: boolean; delay?: number };

const eventsSrc = readFileSync(join(root, "src/lib/lsl/events.ts"), "utf8");
const fnSrc = readFileSync(join(root, "src/lib/lsl/functions.ts"), "utf8");
const limitsSrc = readFileSync(join(root, "src/lib/lsl/limits.ts"), "utf8");

const delays: Record<string, number> = {};
for (const m of limitsSrc.matchAll(/^\s+(ll\w+):\s*([0-9.]+)/gm)) {
  delays[m[1]] = Number(m[2]);
}

type EventRow = { id: string; signature: string };
const events: EventRow[] = [];
const evSrcFlat = eventsSrc.replace(/\n/g, " ");
const evRe = /ev\(\s*"(\w+)"\s*,\s*"([^"]*)"\s*,\s*(\[(?:[^[\]]|\[(?:[^[\]])*\])*\]|)/g;
let em: RegExpExecArray | null;
while ((em = evRe.exec(evSrcFlat))) {
  const rawParams = em[3] || "[]";
  events.push({ id: em[1], signature: `${em[1]}(${parseParams(rawParams)})` });
}

function parseParams(raw: string): string {
  if (!raw || raw === "[]") return "";
  if (raw.replace(/\s/g, "") === "[N]") return "integer num_detected";
  const parts: string[] = [];
  const re = /\{\s*type:\s*"(\w+)"\s*,\s*name:\s*"(\w+)"\s*\}/g;
  let pm: RegExpExecArray | null;
  while ((pm = re.exec(raw))) parts.push(`${pm[1]} ${pm[2]}`);
  if (!parts.length && /\bN\b/.test(raw)) return "integer num_detected";
  return parts.join(", ");
}

const fns: FnRow[] = [];
const fnRe = /fn\(\s*"(ll\w+)"\s*,\s*"(\w+)"\s*,\s*"([^"]+)"/g;
let fm: RegExpExecArray | null;
while ((fm = fnRe.exec(fnSrc))) {
  const ll = fm[1];
  const after = fnSrc.slice(fm.index, fm.index + 1200);
  const nextFn = after.indexOf("\n  fn(");
  const call = nextFn === -1 ? after : after.slice(0, nextFn);
  fns.push({
    ll,
    cat: fm[2],
    message: fm[3],
    returns: /returns:\s*"/.test(call),
    delay: delays[ll],
  });
}

const lines: string[] = [];
lines.push("# Brick catalog");
lines.push("");
lines.push("Generated from `src/lib/lsl/events.ts` and `src/lib/lsl/functions.ts`. Do not hand-edit — `npm run catalog`.");
lines.push("");
lines.push(`Events: **${events.length}**. ll* bricks: **${fns.length}**.`);
lines.push("");
lines.push("Hover a brick in the editor for the wiki URL. Event signatures below are what the yellow hats emit.");
lines.push("");
lines.push("## Events");
lines.push("");
lines.push("Every yellow hat has a **state** field (default `default`). Body snaps underneath.");
lines.push("");
lines.push("| Event | Signature |");
lines.push("|---|---|");
for (const ev of events) {
  lines.push(`| \`${ev.id}\` | \`${ev.signature}\` |`);
}
lines.push("");
lines.push("Wiki: `https://wiki.secondlife.com/wiki/<EventName>` (first letter capitalised).");
lines.push("");

const cats = [...new Set(fns.map((f) => f.cat))];
lines.push("## Functions");
lines.push("");
for (const cat of cats) {
  const rows = fns.filter((f) => f.cat === cat);
  lines.push(`### ${CAT_LABEL[cat] ?? cat}`);
  lines.push("");
  lines.push("| Call | Brick | Delay |");
  lines.push("|---|---|---|");
  for (const fn of rows) {
    const d = fn.delay != null ? `${fn.delay}s` : "—";
    const kind = fn.returns ? "reporter" : "command";
    lines.push(`| \`${fn.ll}\` (${kind}) | ${fn.message.replace(/%\d+/g, "…")} | ${d} |`);
  }
  lines.push("");
}

lines.push("## Brick labels vs call order");
lines.push("");
lines.push("A few bricks are phrased in English (\"say *message* on channel *n*\") and reorder args to the official ll* signature via `order` on the `FnDef`. If a new brick's generated call looks backwards, check that field before touching the generator.");
lines.push("");
lines.push("Forced delays come from `src/lib/lsl/limits.ts` (LSL Delay table). A dash means no forced delay — the call can still throttle (HTTP 0.5s spacing, chat caps, etc).");
lines.push("");

writeFileSync(join(root, "docs/CATALOG.md"), `${lines.join("\n")}\n`);
console.log(`wrote docs/CATALOG.md (${events.length} events, ${fns.length} functions)`);
