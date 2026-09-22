type TauriInternals = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};

function tauri(): TauriInternals | null {
  if (typeof window === "undefined") return null;
  const internals = (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
  return internals?.invoke ? internals : null;
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

export function isDesktop(): boolean {
  return tauri() !== null;
}
