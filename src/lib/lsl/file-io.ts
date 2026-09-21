export function downloadText(filename: string, text: string, mime = "application/json") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function pickFile(accept: string): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    const finish = (result: { name: string; text: string } | null) => {
      input.remove();
      resolve(result);
    };
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      finish({ name: file.name, text: await file.text() });
    });
    input.addEventListener("cancel", () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

type SavePicker = (opts: {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{ name: string; createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }>;

export async function saveTextAs(
  filename: string,
  text: string,
  mime: string,
  ext: string,
  description: string,
): Promise<string | null> {
  const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (typeof picker === "function") {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description, accept: { [mime]: [ext] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return handle.name || filename;
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "AbortError") return null;
    }
  }
  downloadText(filename, text, mime);
  return filename;
}
