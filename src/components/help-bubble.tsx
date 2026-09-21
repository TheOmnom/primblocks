import type { Block, WorkspaceSvg } from "blockly/core";
import { X } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { helpFor } from "@/lib/lsl/help";

type Pos = { left: number; top: number };

function locate(host: HTMLElement, block: Block): Pos | null {
  const root = (block as Block & { getSvgRoot?: () => SVGElement | null }).getSvgRoot?.();
  if (!root) return null;
  const br = root.getBoundingClientRect();
  const hr = host.getBoundingClientRect();
  const width = 272;
  let left = br.right - hr.left + 8;
  if (left + width > hr.width - 8) left = Math.max(8, br.left - hr.left - width - 8);
  let top = br.top - hr.top;
  if (top < 8) top = 8;
  if (top > hr.height - 120) top = Math.max(8, hr.height - 120);
  return { left, top };
}

type Props = {
  workspace: WorkspaceSvg | null;
  host: HTMLElement | null;
  blockId: string | null;
  tick?: string;
  onDismiss: () => void;
};

export function HelpBubble({ workspace, host, blockId, tick, onDismiss }: Props) {
  const [pos, setPos] = useState<Pos | null>(null);
  const block = workspace && blockId ? workspace.getBlockById(blockId) : null;
  const help = block && !block.isShadow?.() ? helpFor(block.type) : null;

  useLayoutEffect(() => {
    if (!host || !block || !help) {
      setPos(null);
      return;
    }
    setPos(locate(host, block));
  }, [host, block, help, tick, blockId]);

  if (!help || !pos) return null;

  return (
    <div
      className="pointer-events-auto absolute z-30 w-72 max-w-[calc(100%-1.5rem)] rounded-xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur-sm"
      style={{ left: pos.left, top: pos.top }}
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-semibold leading-tight">{help.title}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-fg"
          aria-label="Dismiss tip"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-1.5 text-sm text-pretty">{help.tip}</p>
      {help.why ? (
        <p className="mt-2 rounded-md border border-border bg-bg px-2.5 py-2 text-xs text-muted text-pretty">
          <span className="font-medium text-fg">Why. </span>
          {help.why}
        </p>
      ) : null}
    </div>
  );
}
