import { AlertTriangle, Check, Copy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { highlightLsl } from "@/lib/lsl/highlight";
import type { Diagnostic } from "@/lib/lsl/validate";
import { cn } from "@/lib/utils";

const KIND_CLASS: Record<string, string> = {
  comment: "text-muted",
  string: "text-code-string",
  keyword: "text-code-keyword",
  type: "text-code-type",
  event: "text-code-event",
  func: "text-code-func",
  const: "text-code-const",
  number: "text-code-number",
};

export function CodePanel({
  code,
  scriptName,
  diagnostics = [],
  className,
}: {
  code: string;
  scriptName: string;
  diagnostics?: Diagnostic[];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const spans = useMemo(() => highlightLsl(code), [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Script copied — paste into a New Script in Second Life");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      const pre = document.querySelector("[aria-label='Generated LSL'] pre");
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      toast.message("Text selected — copy with your keyboard");
    }
  }

  function download() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = scriptName.replace(/[^\w.-]+/g, "_") || "script";
    a.href = url;
    a.download = `${safe}.lsl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      className={cn("flex min-h-0 flex-col bg-code-bg text-fg", className)}
      aria-label="Generated LSL"
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <p className="min-w-0 flex-1 truncate font-mono text-xs tracking-wide text-muted">
          {scriptName}.lsl
        </p>
        <Button variant="ghost" size="sm" onClick={download} aria-label="Download .lsl">
          <Download />
          <span className="hidden sm:inline">Download</span>
        </Button>
        <Button variant="default" size="sm" onClick={copy} aria-label="Copy script">
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </header>
      {diagnostics.length > 0 && (
        <ul
          className="max-h-36 shrink-0 space-y-1 overflow-auto border-b border-border px-3 py-2"
          aria-label="LSL checks"
        >
          {diagnostics.slice(0, 8).map((d, i) => (
            <li
              key={`${d.blockId ?? "x"}-${i}`}
              className={cn(
                "flex gap-2 text-xs leading-snug",
                d.severity === "error" ? "text-danger" : "text-warn",
              )}
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{d.message}</span>
            </li>
          ))}
          {diagnostics.length > 8 && (
            <li className="text-xs text-muted">+{diagnostics.length - 8} more</li>
          )}
        </ul>
      )}
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
        <code>
          {spans.map((s, i) =>
            s.kind ? (
              <span key={i} className={KIND_CLASS[s.kind]}>
                {s.text}
              </span>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
        </code>
      </pre>
    </section>
  );
}
