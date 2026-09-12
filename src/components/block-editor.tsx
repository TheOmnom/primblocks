import type { WorkspaceSvg } from "blockly/core";
import {
  BookOpen,
  Braces,
  FolderOpen,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CodePanel } from "@/components/code-panel";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EMPTY_SCRIPT } from "@/lib/lsl/assemble";
import { EXAMPLES, exampleById } from "@/lib/lsl/examples";
import type { Diagnostic } from "@/lib/lsl/validate";
import {
  loadScriptName,
  loadWorkspaceState,
  saveScriptName,
  saveWorkspaceState,
} from "@/lib/lsl/storage";

const VAR_TYPES = [
  "integer",
  "float",
  "string",
  "key",
  "vector",
  "rotation",
  "list",
] as const;

export function BlockEditor() {
  const hostRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WorkspaceSvg | null>(null);
  const engineRef = useRef<typeof import("@/lib/lsl/engine") | null>(null);
  const [code, setCode] = useState(EMPTY_SCRIPT);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [scriptName, setScriptName] = useState("New Script");
  const [ready, setReady] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [varOpen, setVarOpen] = useState(false);
  const [varName, setVarName] = useState("count");
  const [varType, setVarType] = useState<(typeof VAR_TYPES)[number]>("integer");
  const [codeOpen, setCodeOpen] = useState(false);

  const persist = useCallback(() => {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ws || !engine) return;
    saveWorkspaceState(engine.saveState(ws));
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let ws: WorkspaceSvg | undefined;
    let ro: ResizeObserver | undefined;

    (async () => {
      const engine = await import("@/lib/lsl/engine");
      if (cancelled || !host.isConnected) return;
      engineRef.current = engine;
      ws = engine.mountWorkspace(host, {
        onCode: setCode,
        onDiagnostics: setDiagnostics,
        onCreateVariable: () => setVarOpen(true),
        onSnapReject: (message) => toast.error(message),
        onLimitWarn: (message) => toast.warning(message),
      });
      if (cancelled) {
        ws.dispose();
        return;
      }
      wsRef.current = ws;
      const saved = loadWorkspaceState();
      const name = loadScriptName();
      setScriptName(name);
      if (saved) {
        try {
          engine.loadState(ws, saved);
        } catch {
          engine.loadState(ws, EXAMPLES[0].state);
        }
      } else {
        engine.loadState(ws, EXAMPLES[0].state);
        setScriptName(EXAMPLES[0].title);
        saveScriptName(EXAMPLES[0].title);
      }
      const analyzed = engine.analyzeWorkspace(ws);
      setCode(analyzed.code);
      setDiagnostics(analyzed.diagnostics);
      setReady(true);
      ro = new ResizeObserver(() => {
        if (wsRef.current) engine.resizeWorkspace(wsRef.current);
      });
      ro.observe(host);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      wsRef.current = null;
      ws?.dispose();
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(persist, 1200);
    return () => window.clearInterval(id);
  }, [persist]);

  function loadExample(id: string) {
    const ex = exampleById(id);
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ex || !ws || !engine) return;
    engine.loadState(ws, ex.state);
    setScriptName(ex.title);
    saveScriptName(ex.title);
    const analyzed = engine.analyzeWorkspace(ws);
    setCode(analyzed.code);
    setDiagnostics(analyzed.diagnostics);
    persist();
    setExamplesOpen(false);
    toast.success(`Loaded ${ex.title}`);
  }

  function newScript() {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ws || !engine) return;
    engine.loadState(ws, EXAMPLES[0].state);
    setScriptName("New Script");
    saveScriptName("New Script");
    const analyzed = engine.analyzeWorkspace(ws);
    setCode(analyzed.code);
    setDiagnostics(analyzed.diagnostics);
    persist();
  }

  function createVar() {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ws || !engine) return;
    const name = varName.trim();
    if (!name) return;
    engine.createTypedVariable(ws, name, varType);
    setVarOpen(false);
    toast.success(`${varType} ${name}`);
  }

  function onNameChange(v: string) {
    setScriptName(v);
    saveScriptName(v);
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-bg text-fg">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-surface-2 ring-1 ring-border">
            <span className="block h-3.5 w-4 rounded-sm bg-brick" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-none tracking-tight">
              PrimBlocks
            </p>
            <p className="hidden truncate text-[11px] text-muted sm:block">
              Snap LSL like bricks
            </p>
          </div>
        </div>
        <Input
          aria-label="Script name"
          value={scriptName}
          onChange={(e) => onNameChange(e.target.value)}
          className="ml-1 hidden h-8 max-w-48 bg-bg md:block"
        />
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setExamplesOpen(true)}>
            <FolderOpen />
            <span className="hidden sm:inline">Examples</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={newScript}>
            <Plus />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)}>
            <BookOpen />
            <span className="hidden sm:inline">Guide</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="md:hidden"
            onClick={() => setCodeOpen(true)}
          >
            <Braces />
            LSL
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1">
          <div ref={hostRef} className="absolute inset-0" />
          {!ready && (
            <div className="absolute inset-0 grid place-items-center bg-bg">
              <p className="text-sm text-muted">Loading bricks…</p>
            </div>
          )}
        </div>
        <CodePanel
          code={code}
          scriptName={scriptName}
          diagnostics={diagnostics}
          className="hidden w-[min(42vw,28rem)] shrink-0 border-l border-border md:flex"
        />
      </div>

      <Sheet open={codeOpen} onOpenChange={setCodeOpen}>
        <SheetContent side="bottom" className="flex h-[78vh] flex-col p-0">
          <SheetTitle className="sr-only">Generated LSL</SheetTitle>
          <CodePanel code={code} scriptName={scriptName} diagnostics={diagnostics} className="h-full" />
        </SheetContent>
      </Sheet>

      <Dialog open={examplesOpen} onOpenChange={setExamplesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Example scripts</DialogTitle>
            <DialogDescription>
              Legal LSL, ready to paste. Each one teaches a pattern you will reuse in-world.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid gap-2">
            {EXAMPLES.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => loadExample(ex.id)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-left hover:bg-surface-2"
                >
                  <span className="block text-sm font-medium">{ex.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{ex.blurb}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>How PrimBlocks compiles</DialogTitle>
            <DialogDescription>
              Yellow hats are events. Snap commands under them. The panel on the right is real LSL.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-auto text-sm text-pretty">
            <p>
              An LSL script is a state machine. <code className="font-mono text-code-keyword">default</code> must
              exist and must be first. Every yellow hat has a state field — leave it as{" "}
              <code className="font-mono">default</code> unless you are building a door, vendor, or other
              multi-state object.
            </p>
            <p>
              Events have official signatures: <code className="font-mono text-code-event">touch_start(integer num_detected)</code>,{" "}
              <code className="font-mono text-code-event">listen(integer channel, string name, key id, string message)</code>.
              Use the Sensing brick “event value” for those names, and{" "}
              <code className="font-mono text-code-func">llDetectedKey(0)</code> for the toucher.
            </p>
            <p>
              Types are strict — illegal snaps are refused, not compiled. A float will not
              plug into an integer socket, string + number needs{" "}
              <code className="font-mono">(string)n</code>, lists cannot contain lists, and
              <code className="font-mono"> if </code> conditions must be integer / TRUE / FALSE.
              Colors are vectors of 0.0–1.0, not 0–255.{" "}
              <code className="font-mono">for (integer i = 0; …)</code> is illegal — PrimBlocks
              declares the index first.
            </p>
            <p>
              Yellow triangles and the LSL panel warn when a value exceeds an in-world cap
              (sensor 96 m, timer faster than ~0.022 s, volume/alpha outside 0–1, chat 1023
              bytes) or when a call has a forced delay (IM 2 s, dialog 1 s, llSetPos 0.2 s).
              Those still compile; the simulator clamps or sleeps. Prefer a timer over a long{" "}
              <code className="font-mono">llSleep</code>.
            </p>
            <p>
              Listens, sensors, and timers are cleared on state change. Re-arm them in{" "}
              <code className="font-mono">state_entry</code> of the new state. User functions cannot change
              state. <code className="font-mono">llSleep</code> freezes that script; prefer a timer for long waits.
            </p>
            <p>
              Copy the script, in Second Life choose Build → Script → New Script, replace the stub, save.
              Hover any brick for the wiki signature. Raw LSL bricks cover functions we have not bricked yet.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={varOpen} onOpenChange={setVarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create variable</DialogTitle>
            <DialogDescription>
              Emitted as a typed global at the top of the script, initialized to the LSL zero for that type.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="var-name">Name</Label>
              <Input
                id="var-name"
                value={varName}
                onChange={(e) => setVarName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="var-type">Type</Label>
              <select
                id="var-type"
                value={varType}
                onChange={(e) => setVarType(e.target.value as (typeof VAR_TYPES)[number])}
                className="h-10 rounded-md border border-border bg-bg px-3 text-sm"
              >
                {VAR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={createVar}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
