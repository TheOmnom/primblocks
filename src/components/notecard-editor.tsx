import { Check, ChevronDown, ChevronUp, Copy, Download, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NOTECARD_LINE_BYTES,
  NOTECARD_PRESETS,
  inspectNotecard,
  newRow,
  serializeRow,
  type NotecardDoc,
  type RowKind,
} from "@/lib/lsl/notecard";
import { utf8Bytes } from "@/lib/lsl/types";
import { cn } from "@/lib/utils";

const KINDS: { id: RowKind; label: string }[] = [
  { id: "setting", label: "setting" },
  { id: "comment", label: "comment" },
  { id: "raw", label: "raw line" },
  { id: "blank", label: "blank" },
];

export function NotecardEditor({
  open,
  onOpenChange,
  doc,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: NotecardDoc;
  onChange: (doc: NotecardDoc) => void;
}) {
  const [copied, setCopied] = useState(false);
  const inspected = useMemo(() => inspectNotecard(doc), [doc]);
  const issueByRow = useMemo(() => {
    const m = new Map<string, (typeof inspected.issues)[number]>();
    for (const i of inspected.issues) {
      if (i.rowId && !m.has(i.rowId)) m.set(i.rowId, i);
    }
    return m;
  }, [inspected.issues]);

  function setName(name: string) {
    onChange({ ...doc, name });
  }

  function setRow(id: string, patch: Partial<(typeof doc.rows)[number]>) {
    onChange({
      ...doc,
      rows: doc.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }

  function addRow(kind: RowKind) {
    onChange({ ...doc, rows: [...doc.rows, newRow(kind, kind === "setting" ? "key" : "", "")] });
  }

  function removeRow(id: string) {
    onChange({ ...doc, rows: doc.rows.filter((r) => r.id !== id) });
  }

  function moveRow(id: string, dir: -1 | 1) {
    const i = doc.rows.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= doc.rows.length) return;
    const next = [...doc.rows];
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    onChange({ ...doc, rows: next });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(inspected.text);
      setCopied(true);
      toast.success(`Copied — in SL: New Note, paste, name it “${doc.name.trim() || "config"}”`);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.message("Select the preview and copy with your keyboard");
    }
  }

  function download() {
    const blob = new Blob([inspected.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (doc.name.trim() || "config").replace(/[^\w.-]+/g, "_");
    a.href = url;
    a.download = `${safe}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const errors = inspected.issues.filter((i) => i.severity === "error").length;
  const warns = inspected.issues.filter((i) => i.severity === "warning").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Notecard</DialogTitle>
          <DialogDescription>
            Real inventory notecard for the same prim as the script. The read-notecard brick looks this
            name up with llGetInventoryType, then reads line-by-line through dataserver (EOF / NAK).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="nc-name">Inventory name</Label>
            <Input
              id="nc-name"
              value={doc.name}
              onChange={(e) => setName(e.target.value)}
              spellCheck={false}
              className="font-mono"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nc-preset">Preset</Label>
            <select
              id="nc-preset"
              className="h-10 rounded-md border border-border bg-bg px-3 text-sm"
              defaultValue=""
              onChange={(e) => {
                const p = NOTECARD_PRESETS.find((x) => x.id === e.target.value);
                if (p) onChange(p.build());
                e.currentTarget.value = "";
              }}
            >
              <option value="" disabled>
                Load a starter…
              </option>
              {NOTECARD_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} — {p.blurb}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-muted">
          {inspected.lines.length} line{inspected.lines.length === 1 ? "" : "s"} · ~{inspected.loadSeconds}s
          to load in-world (0.1s per line) · {NOTECARD_LINE_BYTES} byte cap per line
          {errors ? ` · ${errors} error${errors === 1 ? "" : "s"}` : ""}
          {warns ? ` · ${warns} warning${warns === 1 ? "" : "s"}` : ""}
        </p>

        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-2">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-bg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-xs font-medium text-muted">Rows</p>
              <div className="flex flex-wrap gap-1">
                {KINDS.map((k) => (
                  <Button key={k.id} variant="ghost" size="sm" onClick={() => addRow(k.id)}>
                    <Plus />
                    {k.label}
                  </Button>
                ))}
              </div>
            </div>
            <ul className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
              {doc.rows.length === 0 && (
                <li className="px-2 py-6 text-center text-xs text-muted">
                  Empty card. Add a setting, or load a preset.
                </li>
              )}
              {doc.rows.map((row, idx) => {
                const issue = issueByRow.get(row.id);
                const bytes = utf8Bytes(serializeRow(row));
                return (
                  <li
                    key={row.id}
                    className={cn(
                      "rounded-md border border-border bg-surface p-2",
                      issue?.severity === "error" && "border-danger/60",
                      issue?.severity === "warning" && "border-warn/60",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label={`Row ${idx + 1} kind`}
                        value={row.kind}
                        onChange={(e) => setRow(row.id, { kind: e.target.value as RowKind })}
                        className="h-8 rounded-md border border-border bg-bg px-2 text-xs"
                      >
                        {KINDS.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                      <span
                        className={cn(
                          "ml-auto font-mono text-[10px] tabular-nums",
                          bytes > NOTECARD_LINE_BYTES ? "text-danger" : "text-muted",
                        )}
                      >
                        {bytes} B
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Move up"
                        disabled={idx === 0}
                        onClick={() => moveRow(row.id, -1)}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Move down"
                        disabled={idx === doc.rows.length - 1}
                        onClick={() => moveRow(row.id, 1)}
                      >
                        <ChevronDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove row"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    {row.kind === "setting" && (
                      <div className="mt-1.5 grid grid-cols-[minmax(0,7rem)_1fr] gap-1.5">
                        <Input
                          aria-label="Setting key"
                          value={row.key}
                          onChange={(e) => setRow(row.id, { key: e.target.value })}
                          spellCheck={false}
                          className="h-8 font-mono text-xs"
                          placeholder="key"
                        />
                        <Input
                          aria-label="Setting value"
                          value={row.value}
                          onChange={(e) => setRow(row.id, { value: e.target.value })}
                          spellCheck={false}
                          className="h-8 font-mono text-xs"
                          placeholder="value"
                        />
                      </div>
                    )}
                    {(row.kind === "comment" || row.kind === "raw") && (
                      <Input
                        aria-label={row.kind === "comment" ? "Comment" : "Raw line"}
                        value={row.value}
                        onChange={(e) => setRow(row.id, { value: e.target.value })}
                        spellCheck={false}
                        className="mt-1.5 h-8 font-mono text-xs"
                        placeholder={row.kind === "comment" ? "comment" : "full line"}
                      />
                    )}
                    {issue && (
                      <p
                        className={cn(
                          "mt-1 text-[11px] leading-snug",
                          issue.severity === "error" ? "text-danger" : "text-warn",
                        )}
                      >
                        {issue.message}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-code-bg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="truncate font-mono text-xs text-muted">{doc.name.trim() || "config"}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={download}>
                  <Download />
                  .txt
                </Button>
                <Button variant="default" size="sm" onClick={copy}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <pre
              className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed"
              aria-label="Notecard preview"
            >
              {inspected.lines.length === 0 ? (
                <span className="text-muted">(empty)</span>
              ) : (
                inspected.lines.map((line, i) => {
                  const bytes = utf8Bytes(line);
                  const over = bytes > NOTECARD_LINE_BYTES;
                  return (
                    <span key={`${i}-${line.slice(0, 12)}`} className="flex gap-3">
                      <span className="w-6 shrink-0 text-right text-muted tabular-nums">{i + 1}</span>
                      <span className={over ? "text-danger" : line.startsWith("#") || line.startsWith("//") ? "text-muted" : ""}>
                        {line || " "}
                      </span>
                    </span>
                  );
                })
              )}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
