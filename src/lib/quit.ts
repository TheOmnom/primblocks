type TauriInternals = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};

function tauri(): TauriInternals | null {
  if (typeof window === "undefined") return null;
  const internals = (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
  return internals?.invoke ? internals : null;
}

export function isDesktop(): boolean {
  return tauri() !== null;
}

/** Open a https link in the system browser. Desktop WebView ignores target=_blank. */
export async function openExternal(url: string): Promise<boolean> {
  const href = String(url || "").trim();
  if (!href.startsWith("https://") && !href.startsWith("http://")) return false;
  const api = tauri();
  if (api) {
    try {
      await api.invoke("open_external", { url: href });
      return true;
    } catch {
      try {
        await api.invoke("plugin:opener|open_url", { url: href });
        return true;
      } catch {
        /* fall through */
      }
    }
  }
  const w = window.open(href, "_blank", "noopener,noreferrer");
  return w !== null;
}

/** Close the desktop window. A browser tab only closes if the script opened it. */
export async function quitApp(): Promise<void> {
  const api = tauri();
  if (api) {
    try {
      await api.invoke("plugin:window|close", { label: "main" });
      return;
    } catch {
      try {
        await api.invoke("plugin:window|destroy", { label: "main" });
        return;
      } catch {
        /* fall through */
      }
    }
  }
  window.close();
}
