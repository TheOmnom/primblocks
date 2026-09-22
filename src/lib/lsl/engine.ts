import * as Blockly from "blockly/core";
import * as En from "blockly/msg/en";
import { registerBlocks } from "./blocks";
import { LslConnectionChecker, registerLslChecker } from "./checker";
import { reapplyDynamicTypes } from "./dynamics";
import { generateLsl } from "./generator";
import { primTheme } from "./theme";
import { buildToolbox } from "./toolbox";
import { applyBlockWarnings, diagKey, validateWorkspace, type Diagnostic } from "./validate";
import { attachWireLayer, redrawWires } from "./wires-layer";
import { spaceTopBlocks } from "./layout";

Blockly.setLocale(En as unknown as { [key: string]: string });

export type EngineHandlers = {
  onCode: (code: string) => void;
  onCreateVariable: () => void;
  onDiagnostics?: (items: Diagnostic[]) => void;
  onSnapReject?: (message: string) => void;
  onLimitWarn?: (message: string) => void;
  onBlockPlaced?: (block: Blockly.Block) => void;
};

export type { Diagnostic };

export const VAR_TYPES = [
  "integer",
  "float",
  "string",
  "key",
  "vector",
  "rotation",
  "list",
] as const;

export type VarType = (typeof VAR_TYPES)[number];

function hideFlyout(workspace: Blockly.WorkspaceSvg) {
  try {
    workspace.getFlyout()?.hide();
    workspace.getToolbox()?.clearSelection();
  } catch {
    /* */
  }
}

export function mountWorkspace(host: HTMLElement, handlers: EngineHandlers): Blockly.WorkspaceSvg {
  registerLslChecker();
  registerBlocks();

  const workspace = Blockly.inject(host, {
    renderer: "zelos",
    theme: primTheme,
    toolbox: buildToolbox(),
    media: "/blockly-media/",
    sounds: false,
    plugins: {
      connectionChecker: LslConnectionChecker,
    },
    grid: { spacing: 20, length: 2, colour: "#2a2d38", snap: true },
    // Wheel zooms toward the cursor. Drag empty grid to pan.
    // Scrollbars stay on for metrics; CSS hides the gray strip they draw.
    zoom: {
      controls: true,
      wheel: true,
      startScale: 0.85,
      maxScale: 2.5,
      minScale: 0.3,
      scaleSpeed: 1.2,
      pinch: true,
    },
    trashcan: true,
    move: { scrollbars: true, drag: true, wheel: false },
    oneBasedIndex: false,
    toolboxPosition: "start",
    horizontalLayout: false,
    maxTrashcanContents: 32,
  });

  workspace.registerButtonCallback("CREATE_LSL_VARIABLE", () => {
    handlers.onCreateVariable();
  });

  workspace.registerToolboxCategoryCallback("LSL_VARIABLES", (ws) => {
    const contents: Blockly.utils.toolbox.FlyoutItemInfo[] = [
      {
        kind: "button",
        text: "Create variable…",
        callbackkey: "CREATE_LSL_VARIABLE",
      },
    ];
    const vars = ws.getVariableMap().getAllVariables();
    if (!vars.length) {
      contents.push({
        kind: "label",
        text: "No variables yet — integers, floats, strings, keys, vectors, rotations, lists.",
      } as Blockly.utils.toolbox.FlyoutItemInfo);
      return contents;
    }
    for (const v of vars) {
      contents.push({
        kind: "block",
        type: "lsl_get_var",
        fields: { VAR: { id: v.getId() } },
      } as Blockly.utils.toolbox.FlyoutItemInfo);
      contents.push({
        kind: "block",
        type: "lsl_set_var",
        fields: { VAR: { id: v.getId() } },
      } as Blockly.utils.toolbox.FlyoutItemInfo);
      const t = v.getType();
      if (t === "integer" || t === "float" || t === "") {
        contents.push({
          kind: "block",
          type: "lsl_change_var",
          fields: { VAR: { id: v.getId() } },
          inputs: {
            DELTA: {
              shadow: { type: t === "float" ? "lsl_float" : "lsl_integer", fields: { NUM: 1 } },
            },
          },
        } as Blockly.utils.toolbox.FlyoutItemInfo);
      }
    }
    return contents;
  });

  let suppressToast = true;

  const fire = () => {
    try {
      const { code, diagnostics } = analyzeWorkspace(
        workspace,
        suppressToast ? undefined : handlers.onLimitWarn,
      );
      handlers.onCode(code);
      handlers.onDiagnostics?.(diagnostics);
    } catch (err) {
      handlers.onCode(`// Generator error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
    suppressToast = false;
  };

  workspace.addChangeListener((e: Blockly.Events.Abstract) => {
    if (e.type === Blockly.Events.BLOCK_DRAG) {
      const drag = e as Blockly.Events.BlockDrag;
      if (drag.isStart) return;
      const checker = workspace.connectionChecker as LslConnectionChecker;
      const msg = checker.consumeReject();
      if (!msg) return;
      const block = drag.blockId ? workspace.getBlockById(drag.blockId) : null;
      if (block?.getParent()) return;
      handlers.onSnapReject?.(msg);
      return;
    }
    if (e.type === Blockly.Events.BLOCK_CREATE && handlers.onBlockPlaced) {
      const created = e as Blockly.Events.BlockCreate;
      const ids = created.ids?.length
        ? created.ids
        : created.blockId
          ? [created.blockId]
          : [];
      for (const id of ids) {
        const b = workspace.getBlockById(id);
        if (!b || b.isShadow?.() || b.isInsertionMarker?.()) continue;
        handlers.onBlockPlaced(b);
        break;
      }
    }
    if (e.isUiEvent) return;
    fire();
  });
  fire();
  hideFlyout(workspace);
  attachWireLayer(workspace);
  return workspace;
}

export function createTypedVariable(
  workspace: Blockly.WorkspaceSvg,
  name: string,
  type: VarType,
) {
  workspace.getVariableMap().createVariable(name, type);
  workspace.refreshToolboxSelection();
}

export function loadState(
  workspace: Blockly.WorkspaceSvg,
  state: object,
  opts?: { keepFlyout?: boolean; space?: boolean },
) {
  Blockly.Events.disable();
  try {
    workspace.clear();
    const vars = (state as { variables?: { name: string; type?: string; id?: string }[] }).variables;
    if (vars) {
      const map = workspace.getVariableMap();
      for (const v of vars) {
        if (!v?.name) continue;
        try {
          map.createVariable(v.name, v.type || "", v.id);
        } catch {
          /* already exists */
        }
      }
    }
    Blockly.serialization.workspaces.load(state, workspace);
    reapplyDynamicTypes(workspace);
  } finally {
    Blockly.Events.enable();
  }
  Blockly.svgResize(workspace);
  if (!opts?.keepFlyout) hideFlyout(workspace);
  if (opts?.space) {
    try {
      spaceTopBlocks(workspace);
    } catch {
      /* */
    }
  }
  try {
    redrawWires(workspace);
  } catch {
    /* */
  }
}

export function saveState(workspace: Blockly.WorkspaceSvg): object {
  return Blockly.serialization.workspaces.save(workspace);
}

export function resizeWorkspace(workspace: Blockly.WorkspaceSvg) {
  Blockly.svgResize(workspace);
}

export function openToolboxCategory(workspace: Blockly.WorkspaceSvg, name: string) {
  const toolbox = workspace.getToolbox();
  if (!toolbox) return;
  const items = toolbox.getToolboxItems?.() ?? [];
  for (const item of items) {
    const n = (item as { getName?: () => string }).getName?.();
    if (n && n.toLowerCase() === name.toLowerCase()) {
      toolbox.setSelectedItem?.(item);
      return;
    }
  }
}

export function highlightType(workspace: Blockly.WorkspaceSvg, type: string | undefined) {
  if (!type) {
    workspace.highlightBlock(null);
    return;
  }
  const hit = workspace.getAllBlocks(false).find((b) => b.type === type && !b.isShadow?.());
  workspace.highlightBlock(hit ? hit.id : null);
}

export const EMPTY_WORKSPACE = { blocks: { languageVersion: 0, blocks: [] } };

const lastDiagKeys = new WeakMap<Blockly.Workspace, Set<string>>();

export function analyzeWorkspace(
  workspace: Blockly.Workspace,
  onNewLimit?: (message: string) => void,
) {
  const code = generateLsl(workspace);
  const diagnostics = validateWorkspace(workspace);
  applyBlockWarnings(workspace, diagnostics);
  const next = new Set(diagnostics.map(diagKey));
  if (onNewLimit) {
    const prev = lastDiagKeys.get(workspace) ?? new Set();
    for (const d of diagnostics) {
      if (!prev.has(diagKey(d)) && (d.kind === "limit" || d.kind === "delay")) {
        onNewLimit(d.message);
      }
    }
  }
  lastDiagKeys.set(workspace, next);
  return { code, diagnostics };
}

export { generateLsl };
