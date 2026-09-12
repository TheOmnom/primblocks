import { lslStringLiteral, sanitizeIdent } from "./reserved.ts";
import { utf8Bytes } from "./types.ts";

/** In-world cap. Extra UTF-8 bytes on a line are truncated. */
export const NOTECARD_LINE_BYTES = 255;
/** Forced delay of llGetNotecardLine / llGetNumberOfNotecardLines. */
export const NOTECARD_DELAY = 0.1;

export type RowKind = "setting" | "comment" | "blank" | "raw";

export type NotecardRow = {
  id: string;
  kind: RowKind;
  key: string;
  value: string;
};

export type NotecardDoc = {
  name: string;
  rows: NotecardRow[];
};

export type NotecardIssue = {
  severity: "error" | "warning";
  message: string;
  rowId?: string;
  bytes: number;
};

let rowSeq = 0;

export function newRow(kind: RowKind, key = "", value = ""): NotecardRow {
  rowSeq += 1;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `r${rowSeq}_${Math.random().toString(36).slice(2, 8)}`;
  return { id, kind, key, value };
}

export function emptyNotecard(name = "config"): NotecardDoc {
  return {
    name,
    rows: [
      newRow("comment", "", "Drop this notecard in the same prim as the script."),
      newRow("comment", "", "Format: key = value. Lines starting with # or // are skipped."),
      newRow("blank"),
    ],
  };
}

export function serializeRow(row: NotecardRow): string {
  switch (row.kind) {
    case "blank":
      return "";
    case "comment": {
      const body = row.value.replace(/^\s+/, "");
      if (!body) return "#";
      if (body.startsWith("#") || body.startsWith("//")) return body;
      return `# ${body}`;
    }
    case "setting":
      return `${row.key.trim()} = ${row.value}`;
    case "raw":
      return row.value;
    default:
      return "";
  }
}

export function serializeNotecard(doc: NotecardDoc): string {
  if (!doc.rows.length) return "";
  return `${doc.rows.map(serializeRow).join("\n")}\n`;
}

export function parseNotecard(name: string, text: string): NotecardDoc {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split("\n");
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  const rows: NotecardRow[] = [];
  for (const line of parts) {
    if (line.trim() === "") {
      rows.push(newRow("blank"));
      continue;
    }
    const trimmed = line.trimStart();
    if (trimmed.startsWith("#")) {
      rows.push(newRow("comment", "", trimmed.replace(/^#\s?/, "")));
      continue;
    }
    if (trimmed.startsWith("//")) {
      rows.push(newRow("comment", "", trimmed));
      continue;
    }
    const eq = line.indexOf("=");
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      if (key) {
        rows.push(newRow("setting", key, value));
        continue;
      }
    }
    rows.push(newRow("raw", "", line.trimEnd()));
  }
  return { name, rows };
}

export function inspectNotecard(doc: NotecardDoc): {
  text: string;
  lines: string[];
  issues: NotecardIssue[];
  loadSeconds: number;
} {
  const text = serializeNotecard(doc);
  const lines = text === "" ? [] : text.replace(/\n$/, "").split("\n");
  const issues: NotecardIssue[] = [];
  if (!doc.name.trim()) {
    issues.push({
      severity: "error",
      message: "Notecard inventory name is empty — the script looks this name up with llGetInventoryType.",
      bytes: 0,
    });
  }
  const seen = new Map<string, string>();
  doc.rows.forEach((row, i) => {
    const line = serializeRow(row);
    const bytes = utf8Bytes(line);
    if (bytes > NOTECARD_LINE_BYTES) {
      issues.push({
        severity: "error",
        message: `Line ${i + 1} is ${bytes} bytes. In-world notecard lines cap at ${NOTECARD_LINE_BYTES} UTF-8 bytes and extra is truncated.`,
        rowId: row.id,
        bytes,
      });
    }
    if (row.kind === "setting") {
      const k = row.key.trim();
      if (!k) {
        issues.push({
          severity: "error",
          message: `Line ${i + 1} is a setting with an empty key.`,
          rowId: row.id,
          bytes,
        });
      } else if (seen.has(k)) {
        issues.push({
          severity: "warning",
          message: `Duplicate key “${k}”. Later line wins if the script assigns on every match.`,
          rowId: row.id,
          bytes,
        });
      } else {
        seen.set(k, row.id);
      }
    }
  });
  return {
    text,
    lines,
    issues,
    loadSeconds: Math.round(lines.length * NOTECARD_DELAY * 10) / 10,
  };
}

/** Globals / start fn for one named notecard reader. Name is the inventory string. */
export function ncGlobalNames(name: string) {
  const raw = name.trim() || "config";
  const ident = sanitizeIdent(raw, "config");
  return {
    ident,
    nameVar: `nc_name_${ident}`,
    lineVar: `nc_line_${ident}`,
    queryVar: `nc_query_${ident}`,
    readyVar: `nc_ready_${ident}`,
    startFn: `nc_start_${ident}`,
    literal: lslStringLiteral(raw),
  };
}

export function greeterNotecard(): NotecardDoc {
  return {
    name: "config",
    rows: [
      newRow("comment", "", "PrimBlocks greeter — drop in the same prim as the script."),
      newRow("comment", "", "Inventory name must be exactly: config"),
      newRow("blank"),
      newRow("setting", "greeting", "Hello, Avatar!"),
      newRow("setting", "channel", "0"),
    ],
  };
}

export function accessNotecard(): NotecardDoc {
  return {
    name: "access",
    rows: [
      newRow("comment", "", "One avatar key per line. No equals. Owner is always allowed in the script."),
      newRow("comment", "", "Inventory name must be exactly: access"),
      newRow("blank"),
      newRow("raw", "", "ffffffff-ffff-ffff-ffff-ffffffffffff"),
    ],
  };
}

export function dialogNotecard(): NotecardDoc {
  return {
    name: "menu",
    rows: [
      newRow("comment", "", "Dialog menu. Buttons are 1–12, each ≤ 24 bytes."),
      newRow("comment", "", "Inventory name must be exactly: menu"),
      newRow("blank"),
      newRow("setting", "prompt", "Pick a color"),
      newRow("setting", "channel", "-42"),
      newRow("setting", "button1", "Red"),
      newRow("setting", "button2", "Green"),
      newRow("setting", "button3", "Blue"),
    ],
  };
}

export const NOTECARD_PRESETS: {
  id: string;
  label: string;
  blurb: string;
  build: () => NotecardDoc;
}[] = [
  { id: "greeter", label: "Greeter", blurb: "greeting + channel", build: greeterNotecard },
  { id: "access", label: "Access list", blurb: "one avatar key per line", build: accessNotecard },
  { id: "dialog", label: "Dialog menu", blurb: "prompt + buttons", build: dialogNotecard },
];
