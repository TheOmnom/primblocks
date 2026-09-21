import { emptyNotecard, type NotecardDoc } from "./notecard.ts";

export const PROJECT_KIND = "primblocks.project";
export const PROJECT_FORMAT = 1;

export type PrimProject = {
  kind: typeof PROJECT_KIND;
  format: number;
  scriptName: string;
  savedAt: number;
  state: object;
  notecard: NotecardDoc;
};

export function packProject(scriptName: string, state: object, notecard: NotecardDoc): PrimProject {
  return {
    kind: PROJECT_KIND,
    format: PROJECT_FORMAT,
    scriptName: (scriptName || "New Script").trim() || "New Script",
    savedAt: Date.now(),
    state,
    notecard,
  };
}

export function stringifyProject(project: PrimProject): string {
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function projectFileName(scriptName: string): string {
  const safe = (scriptName || "script").replace(/[^\w.-]+/g, "_") || "script";
  return `${safe}.primblocks`;
}

export function isProject(value: unknown): value is PrimProject {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.kind === PROJECT_KIND && typeof v.scriptName === "string" && v.state != null && typeof v.state === "object";
}

export function parseProject(text: string): PrimProject | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isProject(parsed)) return null;
    const nc = parsed.notecard as NotecardDoc | undefined;
    const notecard =
      nc && typeof nc.name === "string" && Array.isArray(nc.rows) ? nc : emptyNotecard();
    return {
      kind: PROJECT_KIND,
      format: typeof parsed.format === "number" ? parsed.format : PROJECT_FORMAT,
      scriptName: parsed.scriptName.trim() || "New Script",
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
      state: parsed.state,
      notecard,
    };
  } catch {
    return null;
  }
}

export function isWorkspaceDump(value: unknown): value is { blocks: { languageVersion?: number; blocks?: unknown[] } } {
  if (!value || typeof value !== "object") return false;
  const blocks = (value as { blocks?: unknown }).blocks;
  if (!blocks || typeof blocks !== "object") return false;
  return "languageVersion" in (blocks as object) || "blocks" in (blocks as object);
}

export function looksLikeLsl(text: string): boolean {
  const t = text.trim();
  if (!t || t.startsWith("{") || t.startsWith("[")) return false;
  return (
    /\bdefault\s*\{/.test(t) ||
    /\bstate\s+[A-Za-z_]\w*\s*\{/.test(t) ||
    /\b(touch_start|state_entry|listen|timer|money|attach)\s*\(/.test(t)
  );
}

export type OpenedFile =
  | { kind: "project"; project: PrimProject }
  | { kind: "workspace"; state: object; scriptName: string }
  | { kind: "lsl"; source: string; scriptName: string }
  | { kind: "error"; message: string };

export function nameFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.(primblocks|json|lsl|txt)$/i, "");
  const cleaned = base.replace(/[_]+/g, " ").trim();
  return cleaned || "Imported Script";
}

export function interpretFile(text: string, filename = ""): OpenedFile {
  const trimmed = text.trim();
  if (!trimmed) return { kind: "error", message: "That file is empty." };
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isProject(parsed)) {
        const project = parseProject(trimmed);
        if (project) return { kind: "project", project };
      }
      if (isWorkspaceDump(parsed)) {
        return {
          kind: "workspace",
          state: parsed as object,
          scriptName: nameFromFilename(filename) || "Opened Script",
        };
      }
    } catch {
      return { kind: "error", message: "That JSON is not a PrimBlocks project." };
    }
    return { kind: "error", message: "That JSON is not a PrimBlocks project." };
  }
  if (looksLikeLsl(trimmed) || /\.(lsl|txt)$/i.test(filename)) {
    return { kind: "lsl", source: text, scriptName: nameFromFilename(filename) };
  }
  return { kind: "error", message: "Not a .primblocks project or an LSL script." };
}
