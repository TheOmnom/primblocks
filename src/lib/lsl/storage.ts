import { emptyNotecard, type NotecardDoc } from "./notecard.ts";

const KEY = "primblocks.workspace.v1";
const NAME_KEY = "primblocks.scriptName.v1";
const NC_KEY = "primblocks.notecard.v1";
const PRESET_KEY = "primblocks.presets.v1";
const SCRATCH_KEY = "primblocks.tutorialScratch.v1";

export type UserPreset = {
  id: string;
  name: string;
  savedAt: number;
  scriptName: string;
  state: object;
  notecard: NotecardDoc;
};

export function loadWorkspaceState(): object | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as object;
  } catch {
    return null;
  }
}

export function saveWorkspaceState(state: object) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function loadScriptName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "New Script";
  } catch {
    return "New Script";
  }
}

export function saveScriptName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* quota */
  }
}

export function loadNotecard(): NotecardDoc {
  try {
    const raw = localStorage.getItem(NC_KEY);
    if (!raw) return emptyNotecard();
    const parsed = JSON.parse(raw) as NotecardDoc;
    if (parsed && typeof parsed.name === "string" && Array.isArray(parsed.rows)) {
      return parsed;
    }
  } catch {
    /* */
  }
  return emptyNotecard();
}

export function saveNotecard(doc: NotecardDoc) {
  try {
    localStorage.setItem(NC_KEY, JSON.stringify(doc));
  } catch {
    /* quota */
  }
}

export function clearWorkspaceState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* */
  }
}

export function loadPresets(): UserPreset[] {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.id === "string" && typeof p.name === "string");
  } catch {
    return [];
  }
}

function writePresets(list: UserPreset[]) {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function savePreset(preset: Omit<UserPreset, "id" | "savedAt"> & { id?: string }): UserPreset {
  const list = loadPresets();
  const next: UserPreset = {
    id: preset.id || (globalThis.crypto?.randomUUID?.() ?? `p-${Date.now()}`),
    name: preset.name.trim() || "Untitled",
    savedAt: Date.now(),
    scriptName: preset.scriptName,
    state: preset.state,
    notecard: preset.notecard,
  };
  const idx = list.findIndex((p) => p.id === next.id || p.name === next.name);
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  writePresets(list);
  return next;
}

export function deletePreset(id: string) {
  writePresets(loadPresets().filter((p) => p.id !== id));
}

export function getPreset(id: string): UserPreset | undefined {
  return loadPresets().find((p) => p.id === id);
}

export type TutorialScratch = {
  state: object;
  scriptName: string;
  notecard: NotecardDoc;
};

export function saveTutorialScratch(scratch: TutorialScratch) {
  try {
    localStorage.setItem(SCRATCH_KEY, JSON.stringify(scratch));
  } catch {
    /* quota */
  }
}

export function loadTutorialScratch(): TutorialScratch | null {
  try {
    const raw = localStorage.getItem(SCRATCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TutorialScratch;
  } catch {
    return null;
  }
}

export function clearTutorialScratch() {
  try {
    localStorage.removeItem(SCRATCH_KEY);
  } catch {
    /* */
  }
}
