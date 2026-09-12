import { Bookmark } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deletePreset, loadPresets, type UserPreset } from "@/lib/lsl/storage";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onSave: (name: string) => void;
  onLoad: (preset: UserPreset) => void;
};

export function PresetsDialog({ open, onOpenChange, defaultName, onSave, onLoad }: Props) {
  const [name, setName] = useState(defaultName);
  const [tick, setTick] = useState(0);
  const presets = useMemo(() => loadPresets(), [open, tick]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="size-4" />
            Presets
          </DialogTitle>
          <DialogDescription>
            Saves the workspace, script name, and notecard in this browser (or the desktop app
            profile). Nothing is uploaded.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Preset name"
            aria-label="Preset name"
          />
          <Button
            onClick={() => {
              onSave(name.trim() || defaultName);
              setTick((n) => n + 1);
            }}
          >
            Save
          </Button>
        </div>
        {presets.length === 0 ? (
          <p className="text-sm text-muted">None yet. Save the current stack to get one.</p>
        ) : (
          <ul className="grid max-h-[50vh] gap-2 overflow-auto">
            {presets.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onLoad(p)}
                >
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block text-[11px] text-muted">
                    {new Date(p.savedAt).toLocaleString()}
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    deletePreset(p.id);
                    setTick((n) => n + 1);
                  }}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
