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
import {
  LEVELS,
  TUTORIALS,
  type Tutorial,
  type TutorialLevel,
  tutorialsFor,
} from "@/lib/lsl/tutorials";
import { cn } from "@/lib/utils";

const LEVEL_DOT: Record<TutorialLevel, string> = {
  basic: "bg-accent",
  intermediate: "bg-brick",
  advanced: "bg-code-keyword",
  expert: "bg-danger",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (tutorial: Tutorial) => void;
};

export function TutorialDialog({ open, onOpenChange, onStart }: Props) {
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
              One brick at a time. Next stays off until that brick is on the
              workspace. Starting parks your current stack. Done keeps what you
              built — it stays the open project. X puts the old stack back.
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
                    {t.minutes} min · {t.steps.length} steps
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {active && (
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              <p className="text-sm font-medium">{active.title}</p>
              <p className="mt-1 text-xs text-muted">{active.blurb}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-muted">
                {active.steps.map((s) => (
                  <li key={s.title}>{s.title}</li>
                ))}
              </ol>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => {
                    onStart(active);
                    onOpenChange(false);
                  }}
                >
                  Start — I’ll put the bricks down
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
