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
  onStep: (index: number) => void;
  onOpenCategory: (name: string) => void;
  onQuit: () => void;
};

export function TutorialCoach({
  tutorial,
  stepIndex,
  workspace,
  onStep,
  onOpenCategory,
  onQuit,
}: Props) {
  const step = tutorial.steps[stepIndex];
  const last = stepIndex >= tutorial.steps.length - 1;
  const done = !step || !workspace ? false : stepSatisfied(workspace, step);
  const canNext = !step?.expect || done;

  useEffect(() => {
    if (step?.toolbox) onOpenCategory(step.toolbox);
  }, [step?.toolbox, stepIndex, onOpenCategory]);

  if (!step) return null;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-20 w-[min(24rem,calc(100%-1.5rem))] rounded-xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur-sm sm:left-[8.2rem]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted">
            {tutorial.title}
            <span className="ml-2 tabular-nums">
              {stepIndex + 1}/{tutorial.steps.length}
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
      <p className="text-sm text-pretty">{step.do}</p>
      <p className="mt-2 rounded-md border border-border bg-bg px-2.5 py-2 text-xs text-muted text-pretty">
        <span className="font-medium text-fg">Why. </span>
        {step.why}
      </p>
      <div className="mt-3 flex items-center gap-2">
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
          <Button size="sm" onClick={onQuit} disabled={!canNext}>
            Done
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
