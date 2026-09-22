import type { WorkspaceSvg } from "blockly/core";
import {
  Bookmark,
  BookOpen,
  Braces,
  FileText,
  FolderOpen,
  GraduationCap,
  Lightbulb,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CodePanel } from "@/components/code-panel";
import { FileMenu } from "@/components/file-menu";
import { HelpBubble } from "@/components/help-bubble";
import { NotecardEditor } from "@/components/notecard-editor";
import { PresetsDialog } from "@/components/presets-dialog";
import { TutorialCoach } from "@/components/tutorial-coach";
import { TutorialDialog } from "@/components/tutorial-dialog";
import { VersionSlot } from "@/components/version-slot";
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
import { downloadText, pickFile, saveTextAs } from "@/lib/lsl/file-io";
import { importLsl } from "@/lib/lsl/import-lsl";
import { emptyNotecard, greeterNotecard, type NotecardDoc } from "@/lib/lsl/notecard";
import {
  interpretFile,
  nameFromFilename,
  packProject,
  projectFileName,
  stringifyProject,
} from "@/lib/lsl/project";
import { tutorialById, type Tutorial } from "@/lib/lsl/tutorials";
import type { Diagnostic } from "@/lib/lsl/validate";
import {
  clearTutorialScratch,
  loadHelpMode,
  loadNotecard,
  loadScriptName,
  loadTutorialScratch,
  loadWorkspaceState,
  saveHelpMode,
  saveNotecard,
  savePreset,
  saveScriptName,
  saveTutorialScratch,
  saveWorkspaceState,
  type UserPreset,
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
  const [tutorialsOpen, setTutorialsOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachStep, setCoachStep] = useState(0);
  const [helpMode, setHelpMode] = useState(false);
  const [helpBlockId, setHelpBlockId] = useState<string | null>(null);
  const helpModeRef = useRef(false);
  const [notecardOpen, setNotecardOpen] = useState(false);
  const [notecard, setNotecard] = useState<NotecardDoc>(greeterNotecard);
  const [varOpen, setVarOpen] = useState(false);
  const [varName, setVarName] = useState("count");
  const [varType, setVarType] = useState<(typeof VAR_TYPES)[number]>("integer");
  const [codeOpen, setCodeOpen] = useState(false);
  const scriptNameRef = useRef(scriptName);
  const notecardRef = useRef(notecard);
  scriptNameRef.current = scriptName;
  notecardRef.current = notecard;

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
        onBlockPlaced: (block) => {
          if (!helpModeRef.current) return;
          setHelpBlockId(block.id);
        },
      });
      if (cancelled) {
        ws.dispose();
        return;
      }
      wsRef.current = ws;
      const saved = loadWorkspaceState();
      const name = loadScriptName();
      setScriptName(name);
      setNotecard(loadNotecard());
      if (saved) {
        try {
          engine.loadState(ws, saved);
        } catch {
          engine.loadState(ws, EXAMPLES[0].state, { space: true });
        }
      } else {
        engine.loadState(ws, EXAMPLES[0].state, { space: true });
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        if (e.shiftKey) void fileSaveAs();
        else fileSave();
      } else if (key === "o") {
        e.preventDefault();
        if (e.shiftKey) void fileImport();
        else void fileOpen();
      } else if (key === "n") {
        e.preventDefault();
        fileNew();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const on = loadHelpMode();
    setHelpMode(on);
    helpModeRef.current = on;
  }, []);

  useEffect(() => {
    helpModeRef.current = helpMode;
  }, [helpMode]);

  function loadExample(id: string, quiet = false) {
    const ex = exampleById(id);
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ex || !ws || !engine) return;
    try {
      engine.loadState(ws, ex.state, { space: true });
    } catch (err) {
      toast.error(`Could not load ${ex.title}: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    setScriptName(ex.title);
    saveScriptName(ex.title);
    if (ex.id === "notecard") {
      const card = greeterNotecard();
      setNotecard(card);
      saveNotecard(card);
    }
    const analyzed = engine.analyzeWorkspace(ws);
    setCode(analyzed.code);
    setDiagnostics(analyzed.diagnostics);
    persist();
    setExamplesOpen(false);
    if (!quiet) toast.success(`Loaded ${ex.title}`);
  }

  function startTutorial(tutorial: Tutorial) {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ws || !engine) return;
    saveTutorialScratch({
      state: engine.saveState(ws),
      scriptName,
      notecard,
    });
    engine.loadState(ws, engine.EMPTY_WORKSPACE, { keepFlyout: true });
    setScriptName(tutorial.title);
    saveScriptName(tutorial.title);
    const analyzed = engine.analyzeWorkspace(ws);
    setCode(analyzed.code);
    setDiagnostics(analyzed.diagnostics);
    persist();
    if (tutorial.openNotecard) setNotecardOpen(true);
    setCoachId(tutorial.id);
    setCoachStep(0);
    toast.message(`${tutorial.title} — start with the brick it asks for.`);
  }

  function quitCoach() {
    const scratch = loadTutorialScratch();
    const ws = wsRef.current;
    const engine = engineRef.current;
    setCoachId(null);
    setCoachStep(0);
    if (scratch && ws && engine) {
      engine.loadState(ws, scratch.state);
      setScriptName(scratch.scriptName);
      saveScriptName(scratch.scriptName);
      setNotecard(scratch.notecard);
      saveNotecard(scratch.notecard);
      const analyzed = engine.analyzeWorkspace(ws);
      setCode(analyzed.code);
      setDiagnostics(analyzed.diagnostics);
      persist();
    }
    clearTutorialScratch();
  }

  function finishCoach() {
    setCoachId(null);
    setCoachStep(0);
    clearTutorialScratch();
    persist();
    toast.success("Kept this stack. Copy it when you're ready.");
  }

  function toggleTips() {
    const next = !helpMode;
    setHelpMode(next);
    helpModeRef.current = next;
    saveHelpMode(next);
    if (!next) setHelpBlockId(null);
  }

  const openCategory = useCallback((name: string) => {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (ws && engine) engine.openToolboxCategory(ws, name);
  }, []);

  const highlightType = useCallback((type: string | undefined) => {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (ws && engine) engine.highlightType(ws, type);
  }, []);

  function handleSavePreset(name: string) {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ws || !engine) return;
    savePreset({
      name,
      scriptName,
      state: engine.saveState(ws),
      notecard,
    });
    toast.success(`Saved “${name}”`);
  }

  function handleLoadPreset(preset: UserPreset) {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ws || !engine) return;
    engine.loadState(ws, preset.state);
    setScriptName(preset.scriptName);
    saveScriptName(preset.scriptName);
    setNotecard(preset.notecard);
    saveNotecard(preset.notecard);
    const analyzed = engine.analyzeWorkspace(ws);
    setCode(analyzed.code);
    setDiagnostics(analyzed.diagnostics);
    persist();
    setPresetsOpen(false);
    toast.success(`Loaded “${preset.name}”`);
  }

  function applyWorkspace(state: object, name: string, card?: NotecardDoc, space = false) {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ws || !engine) return;
    engine.loadState(ws, state, space ? { space: true } : undefined);
    setScriptName(name);
    saveScriptName(name);
    if (card) {
      setNotecard(card);
      saveNotecard(card);
    }
    const analyzed = engine.analyzeWorkspace(ws);
    setCode(analyzed.code);
    setDiagnostics(analyzed.diagnostics);
    persist();
  }

  function confirmReplace(): boolean {
    const n = wsRef.current?.getTopBlocks(false).length ?? 0;
    if (!n) return true;
    return window.confirm("Replace the current bricks?");
  }

  function fileNew() {
    const engine = engineRef.current;
    if (!engine) return;
    if (!confirmReplace()) return;
    applyWorkspace(engine.EMPTY_WORKSPACE, "New Script", emptyNotecard());
    toast.success("New script");
  }

  function currentProjectText(): string {
    const ws = wsRef.current;
    const engine = engineRef.current;
    if (!ws || !engine) return stringifyProject(packProject(scriptNameRef.current, { blocks: { languageVersion: 0, blocks: [] } }, notecardRef.current));
    return stringifyProject(packProject(scriptNameRef.current, engine.saveState(ws), notecardRef.current));
  }

  function fileSave() {
    const name = projectFileName(scriptNameRef.current);
    downloadText(name, currentProjectText(), "application/json");
    toast.success(`Saved ${name}`);
  }

  async function fileSaveAs() {
    const name = projectFileName(scriptNameRef.current);
    const saved = await saveTextAs(name, currentProjectText(), "application/json", ".primblocks", "PrimBlocks project");
    if (saved) toast.success(`Saved ${saved}`);
  }

  async function fileOpen() {
    const picked = await pickFile(".primblocks,application/json,.json,.lsl,.txt,text/plain");
    if (!picked) return;
    const opened = interpretFile(picked.text, picked.name);
    if (opened.kind === "error") {
      toast.error(opened.message);
      return;
    }
    if (!confirmReplace()) return;
    if (opened.kind === "project") {
      applyWorkspace(opened.project.state, opened.project.scriptName, opened.project.notecard);
      toast.success(`Opened ${picked.name}`);
      return;
    }
    if (opened.kind === "workspace") {
      applyWorkspace(opened.state, opened.scriptName);
      toast.success(`Opened ${picked.name}`);
      return;
    }
    const imported = importLsl(opened.source);
    applyWorkspace(imported.state, opened.scriptName, undefined, true);
    toast.success(`Imported ${imported.brickCount} stack${imported.brickCount === 1 ? "" : "s"}`);
    if (imported.warnings[0]) toast.message(imported.warnings[0]);
  }

  async function fileImport() {
    const picked = await pickFile(".lsl,.txt,text/plain");
    if (!picked) return;
    if (!confirmReplace()) return;
    const imported = importLsl(picked.text);
    applyWorkspace(imported.state, nameFromFilename(picked.name), undefined, true);
    toast.success(`Imported ${imported.brickCount} stack${imported.brickCount === 1 ? "" : "s"}`);
    if (imported.warnings[0]) toast.message(imported.warnings[0]);
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

  function onNotecardChange(next: NotecardDoc) {
    setNotecard(next);
    saveNotecard(next);
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-bg text-fg">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileMenu
            onNew={fileNew}
            onOpen={() => void fileOpen()}
            onSave={fileSave}
            onSaveAs={() => void fileSaveAs()}
            onImport={() => void fileImport()}
          />
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
          <VersionSlot />
          <Button variant="ghost" size="sm" onClick={() => setExamplesOpen(true)}>
            <FolderOpen />
            <span className="hidden sm:inline">Examples</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPresetsOpen(true)}>
            <Bookmark />
            <span className="hidden sm:inline">Presets</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTutorialsOpen(true)}>
            <GraduationCap />
            <span className="hidden sm:inline">Tutorials</span>
          </Button>
          <Button
            variant={helpMode ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleTips}
            aria-pressed={helpMode}
            title={helpMode ? "Tips on — drop a brick" : "Tips off"}
          >
            <Lightbulb />
            <span className="hidden sm:inline">Tips</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setNotecardOpen(true)}>
            <FileText />
            <span className="hidden sm:inline">Notecard</span>
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
          <div ref={hostRef} className="absolute inset-0 overflow-hidden overscroll-none" />
          {!ready && (
            <div className="absolute inset-0 grid place-items-center bg-bg">
              <p className="text-sm text-muted">Loading bricks…</p>
            </div>
          )}
          {coachId && tutorialById(coachId) && (
            <TutorialCoach
              tutorial={tutorialById(coachId)!}
              stepIndex={coachStep}
              workspace={wsRef.current}
              tick={code}
              onStep={setCoachStep}
              onOpenCategory={openCategory}
              onHighlight={highlightType}
              onQuit={quitCoach}
              onFinish={finishCoach}
            />
          )}
          {helpMode && helpBlockId ? (
            <HelpBubble
              workspace={wsRef.current}
              host={hostRef.current}
              blockId={helpBlockId}
              tick={code}
              onDismiss={() => setHelpBlockId(null)}
            />
          ) : null}
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
        <DialogContent className="flex max-h-[86vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Example scripts</DialogTitle>
            <DialogDescription>
              Legal LSL, ready to paste. Notecard greeter needs a matching note in the prim.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
            {EXAMPLES.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => loadExample(ex.id)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-left hover:bg-surface-2"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="block text-sm font-medium">{ex.title}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">
                      {ex.level}
                    </span>
                  </span>
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
              Mouse wheel zooms the grid; drag empty space to pan. The yellow brick next to the
              title is File — New, Open, Save, Save As, Import LSL. New here? Open{" "}
              <strong>Tutorials</strong> — it will not let you skip a brick.{" "}
              <strong>Tips</strong> in the header puts a bubble on each brick you drop.
              Set a variable in one place and get it in another — the noodle draws itself.
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
            <p>
              Config that should change without recoding the script lives on a <strong>notecard in the same
              prim</strong>. World → “read notecard” emits the real pattern: inventory check,{" "}
              <code className="font-mono">llGetNotecardLine</code>, <code className="font-mono">dataserver</code>{" "}
              with <code className="font-mono">NAK</code> retry and <code className="font-mono">EOF</code>, skip{" "}
              <code className="font-mono">#</code> / <code className="font-mono">//</code> / blank, then the next
              line. 0.1s delay per line. Do not change state while it is reading. Build the card in the
              Notecard panel — inventory name must match the brick — copy, New Note, paste, drop in the prim.
              Format is <code className="font-mono">key = value</code>. Raw lines (no equals) are access lists.
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

      <TutorialDialog
        open={tutorialsOpen}
        onOpenChange={setTutorialsOpen}
        onStart={startTutorial}
      />

      <PresetsDialog
        open={presetsOpen}
        onOpenChange={setPresetsOpen}
        defaultName={scriptName}
        onSave={handleSavePreset}
        onLoad={handleLoadPreset}
      />

      <NotecardEditor
        open={notecardOpen}
        onOpenChange={setNotecardOpen}
        doc={notecard}
        onChange={onNotecardChange}
      />
    </div>
  );
}
