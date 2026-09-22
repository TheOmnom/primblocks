import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { APP_VERSION, checkForUpdate, type UpdateStatus } from "@/lib/update";
import { openExternal } from "@/lib/quit";
import { cn } from "@/lib/utils";

type Props = {
  check?: typeof checkForUpdate;
  className?: string;
};

export function VersionSlot({ check = checkForUpdate, className }: Props) {
  const [status, setStatus] = useState<UpdateStatus>({ kind: "loading", current: APP_VERSION });
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (fromClick: boolean) => {
      setBusy(true);
      if (!fromClick) setStatus({ kind: "loading", current: APP_VERSION });
      const next = await check();
      setStatus(next);
      setBusy(false);
      if (!fromClick) return;
      if (next.kind === "current") {
        toast.success(`v${next.current} — that's the latest on GitHub.`);
      } else if (next.kind === "available") {
        toast.message(`v${next.latest} is out. You are on v${next.current}.`);
      } else if (next.kind === "unknown") {
        toast.error(next.reason);
      }
    },
    [check],
  );

  useEffect(() => {
    void run(false);
  }, [run]);

  async function grabUpdate() {
    if (status.kind !== "available") return;
    setBusy(true);
    const url = status.downloadUrl;
    const ok = await openExternal(url);
    setBusy(false);
    if (ok) {
      toast.message(`Opening v${status.latest} in your browser.`);
      return;
    }
    toast.error("Could not open the browser. Get it from GitHub Releases.");
    try {
      await navigator.clipboard.writeText(url);
      toast.message("Download link copied.");
    } catch {
      /* */
    }
  }

  if (status.kind === "available") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <span className="text-xs font-medium text-brick">New Version Available</span>
        <Button size="sm" type="button" disabled={busy} onClick={() => void grabUpdate()}>
          {busy ? "Opening…" : "Update now"}
        </Button>
      </div>
    );
  }

  const label = status.kind === "loading" || busy ? "Checking…" : `v${status.current}`;

  return (
    <button
      type="button"
      onClick={() => void run(true)}
      disabled={busy}
      title="Check GitHub for a newer release"
      className={cn(
        "rounded-md px-2 py-1 font-mono text-[11px] text-muted hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      {label}
    </button>
  );
}
