import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExampleId } from "@/lib/lsl/examples";
import {
  LEVELS,
  TUTORIALS,
  type Tutorial,
  type TutorialLevel,
  tutorialsFor,
} from "@/lib/lsl/tutorials";
import { cn } from "@/lib/utils";

const LEVEL_DOT: Record<TutorialLevel, string> = {
  basic: "bg-emerald-400",
  intermediate: "bg-amber-400",
  advanced: "bg-orange-500",
  expert: "bg-rose-500",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadExample: (id: ExampleId) => void;
  onOpenNotecard: () => void;
};

export function TutorialDialog({
  open,
  onOpenChange,
  onLoadExample,
  onOpenNotecard,
}: Props) {
  const [level, setLevel] = useState<TutorialLevel>("basic");
  const [activeId, setActiveId] = useState<string>(
    TUTORIALS.find((t) => t.level === "basic")?.id ?? TUTORIALS[0].id,
  );
  const list = tutorialsFor(level);
  const active: Tutorial | undefined =
    list.find((t) => t.id === activeId) ?? list[0];

  function pickLevel(next: TutorialLevel) {
    setLevel(next);
    const first = tutorialsFor(next)[0];
    if (first) setActiveId(first.id);
  }

  function start(t: Tutorial) {
    if (t.exampleId) onLoadExample(t.exampleId);
    if (t.openNotecard) onOpenNotecard();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86vh] max-w-2xl flex-col overflow-hidden p-0 sm:max-w-2xl">
        <div className="border-b border-border px-5 pt-5 pb-3">
          <DialogHeader className="mb-3 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="size-4" />
              Tutorials
            </DialogTitle>
            <DialogDescription>
              A few at each level. Load the bricks, then follow the steps. Copy
              still pastes into a New Script in Second Life.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((lv) => (
              <button
                key={lv.id}
                type="button"
                onClick={() => pickLevel(lv.id)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                  level === lv.id
                    ? "bg-surface-2 text-fg ring-1 ring-border"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <span className={cn("size-1.5 rounded-full", LEVEL_DOT[lv.id])} />
                  {lv.label}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted">{lv.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden sm:grid-cols-[13rem_1fr]">
          <ul className="flex gap-1 overflow-x-auto border-b border-border p-2 sm:block sm:overflow-y-auto sm:border-r sm:border-b-0">
            {list.map((t) => (
              <li key={t.id} className="shrink-0 sm:shrink">
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "w-full rounded-md px-2.5 py-2 text-left text-xs",
                    active?.id === t.id
                      ? "bg-bg text-fg ring-1 ring-border"
                      : "text-muted hover:bg-bg/60 hover:text-fg",
                  )}
                >
                  <span className="block font-medium">{t.title}</span>
                  <span className="mt-0.5 hidden text-[10px] text-muted sm:block">
                    {t.minutes} min
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {active && (
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              <p className="text-sm font-medium">{active.title}</p>
              <p className="mt-1 text-xs text-muted">{active.blurb}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-pretty">
                {active.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {active.tryThis && (
                <p className="mt-3 rounded-md border border-border bg-bg px-3 py-2 text-xs text-muted">
                  <span className="font-medium text-fg">Try this. </span>
                  {active.tryThis}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {(active.exampleId || active.openNotecard) && (
                  <Button size="sm" onClick={() => start(active)}>
                    Load these bricks
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Back to workspace
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
