import type { WorkspaceSvg } from "blockly/core";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { stepSatisfied, type Tutorial } from "@/lib/lsl/tutorials";
import { cn } from "@/lib/utils";

type Props = {
  tutorial: Tutorial;
  stepIndex: number;
  workspace: WorkspaceSvg | null;
  tick?: string;
  onStep: (index: number) => void;
  onOpenCategory: (name: string) => void;
  onHighlight: (type: string | undefined) => void;
  onQuit: () => void;
  onFinish: () => void;
};

export function TutorialCoach({
  tutorial,
  stepIndex,
  workspace,
  tick,
  onStep,
  onOpenCategory,
  onHighlight,
  onQuit,
  onFinish,
}: Props) {
  const step = tutorial.steps[stepIndex];
  const last = stepIndex >= tutorial.steps.length - 1;
  const done = !step || !workspace ? false : stepSatisfied(workspace, step);
  const canNext = !step?.expect || done;

  useEffect(() => {
    if (step?.toolbox) onOpenCategory(step.toolbox);
  }, [step?.toolbox, stepIndex, onOpenCategory]);

  useEffect(() => {
    onHighlight(done ? step?.expect?.type : undefined);
  }, [done, step?.expect?.type, tick, onHighlight]);

  if (!step) return null;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-20 flex w-[min(26rem,calc(100%-1.5rem))] flex-col gap-2 rounded-xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur-sm sm:left-[8.2rem]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted">
            {tutorial.title}
            <span className="ml-2 tabular-nums">
              Step {stepIndex + 1} of {tutorial.steps.length}
            </span>
          </p>
          <p className="font-display text-sm font-semibold">{step.title}</p>
        </div>
        <button
          type="button"
          onClick={onQuit}
          className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-fg"
          aria-label="Quit tutorial"
        >
          <X className="size-4" />
        </button>
      </div>

      <ol className="hidden gap-1 sm:block">
        {tutorial.steps.map((s, i) => (
          <li
            key={s.title}
            className={cn(
              "truncate text-[11px]",
              i === stepIndex ? "font-medium text-fg" : i < stepIndex ? "text-accent" : "text-muted",
            )}
          >
            {i < stepIndex ? "✓" : i === stepIndex ? "→" : "·"} {s.title}
          </li>
        ))}
      </ol>

      {step.find?.length ? (
        <div className="rounded-md border border-brick/40 bg-brick/10 px-2.5 py-2 text-sm text-pretty">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-brick">
            Find it in the left list
          </p>
          <ul className="space-y-0.5">
            {step.find.map((f) => (
              <li key={f} className="font-medium text-fg">
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-sm text-pretty">{step.do}</p>
      <p className="rounded-md border border-border bg-bg px-2.5 py-2 text-xs text-muted text-pretty">
        <span className="font-medium text-fg">Why. </span>
        {step.why}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={stepIndex === 0}
          onClick={() => onStep(stepIndex - 1)}
        >
          <ChevronLeft />
          Back
        </Button>
        {last ? (
          <Button size="sm" onClick={onFinish} disabled={!canNext}>
            Done — keep this
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onStep(stepIndex + 1)}
            disabled={!canNext}
            className={cn(!canNext && "opacity-60")}
          >
            {canNext ? "Next" : "Waiting on that brick"}
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}
