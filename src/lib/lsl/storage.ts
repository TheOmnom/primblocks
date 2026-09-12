const KEY = "primblocks.workspace.v1";
const NAME_KEY = "primblocks.scriptName.v1";

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

export function clearWorkspaceState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* */
  }
}
