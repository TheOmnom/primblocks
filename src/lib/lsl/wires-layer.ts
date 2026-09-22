import type { WorkspaceSvg } from "blockly/core";
import * as Blockly from "blockly/core";
import { CAT } from "./colors";
import { cableNameOf, matchingRecvs } from "./cables";
import { routeCable, unionRect, type Rect } from "./wire-route";

const STROKE: Record<string, string> = {
  Integer: CAT.variable,
  integer: CAT.variable,
  Boolean: CAT.variable,
  boolean: CAT.variable,
  Number: CAT.operator,
  float: CAT.operator,
  String: CAT.chat,
  string: CAT.chat,
  Key: CAT.world,
  key: CAT.world,
  Vector: CAT.motion,
  vector: CAT.motion,
  Rotation: CAT.motion,
  rotation: CAT.motion,
  List: CAT.list,
  list: CAT.list,
};

function strokeFor(block: Blockly.Block): string {
  const check = block.getInput("VALUE")?.connection?.targetBlock()?.outputConnection?.getCheck();
  const first = Array.isArray(check) ? check[0] : check;
  return STROKE[first || ""] || CAT.chat;
}

function varField(block: Blockly.Block): Blockly.FieldVariable | null {
  const field = block.getField("VAR");
  if (field && "getVariable" in field) return field as Blockly.FieldVariable;
  return null;
}

function varKey(block: Blockly.Block): string {
  const v = varField(block)?.getVariable?.();
  if (v) return v.getId();
  const raw = block.getFieldValue("VAR");
  if (raw && typeof raw === "object" && raw !== null && "id" in raw) {
    return String((raw as { id: string }).id);
  }
  return String(raw ?? "");
}

function strokeForVar(block: Blockly.Block): string {
  const v = varField(block)?.getVariable?.();
  const t = v && "getType" in v && typeof v.getType === "function" ? v.getType() : "";
  return STROKE[t] || CAT.variable;
}

function anchor(block: Blockly.BlockSvg, side: "in" | "out"): { x: number; y: number } | null {
  const xy = block.getRelativeToSurfaceXY?.();
  const hw = block.getHeightWidth?.();
  if (!xy || !hw) return null;
  return {
    x: side === "out" ? xy.x + hw.width : xy.x,
    y: xy.y + hw.height / 2,
  };
}

function containsBlock(root: Blockly.Block, target: Blockly.Block): boolean {
  if (root.id === target.id) return true;
  return root.getDescendants(false).some((b) => b.id === target.id);
}

function stackRect(root: Blockly.BlockSvg): Rect | null {
  let r: Rect | null = null;
  for (const b of root.getDescendants(false)) {
    if (b.isShadow?.() || b.isInsertionMarker?.()) continue;
    const svg = b as Blockly.BlockSvg;
    const xy = svg.getRelativeToSurfaceXY?.();
    const hw = svg.getHeightWidth?.();
    if (!xy || !hw || hw.width < 4 || hw.height < 4) continue;
    const box = { x: xy.x, y: xy.y, w: hw.width, h: hw.height };
    r = r ? unionRect(r, box) : box;
  }
  return r;
}

/** Other stacks on the board. The send/receive hats may sit under the noodle. */
function obstaclesFor(workspace: WorkspaceSvg, send: Blockly.Block, recv: Blockly.Block): Rect[] {
  const out: Rect[] = [];
  for (const top of workspace.getTopBlocks(false)) {
    if (top.isShadow?.() || top.isInsertionMarker?.()) continue;
    if (containsBlock(top, send) || containsBlock(top, recv)) continue;
    const r = stackRect(top as Blockly.BlockSvg);
    if (r) out.push(r);
  }
  return out;
}

function ensureLayer(workspace: WorkspaceSvg): SVGElement | null {
  const canvas = (
    workspace as WorkspaceSvg & { getBlockCanvas?: () => SVGGElement | null }
  ).getBlockCanvas?.();
  if (!canvas) return null;
  let g = canvas.querySelector("#prim-wires") as SVGGElement | null;
  if (!g) {
    g = Blockly.utils.dom.createSvgElement("g", { id: "prim-wires" }, null) as SVGGElement;
    canvas.appendChild(g);
  } else if (canvas.lastChild !== g) {
    canvas.appendChild(g);
  }
  return g;
}

function addPath(layer: SVGElement, d: string, color: string) {
  Blockly.utils.dom.createSvgElement(
    "path",
    {
      d,
      class: "prim-wire-halo",
      fill: "none",
      "pointer-events": "none",
    },
    layer,
  );
  Blockly.utils.dom.createSvgElement(
    "path",
    {
      d,
      class: "prim-wire",
      stroke: color,
      fill: "none",
      "stroke-width": "3.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "pointer-events": "none",
      opacity: "0.95",
    },
    layer,
  );
}

export function redrawWires(workspace: WorkspaceSvg) {
  const layer = ensureLayer(workspace);
  if (!layer) return;
  while (layer.firstChild) layer.removeChild(layer.firstChild);

  const seen = new Set<string>();
  const link = (
    fromBlock: Blockly.Block,
    toBlock: Blockly.Block,
    color: string,
    sideFrom: "in" | "out" = "out",
    sideTo: "in" | "out" = "in",
  ) => {
    if (containsBlock(fromBlock, toBlock) || containsBlock(toBlock, fromBlock)) return;
    const from = anchor(fromBlock as Blockly.BlockSvg, sideFrom);
    const to = anchor(toBlock as Blockly.BlockSvg, sideTo);
    if (!from || !to) return;
    const key = `${fromBlock.id}->${toBlock.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    const route = routeCable(from, to, obstaclesFor(workspace, fromBlock, toBlock));
    if (route.d) addPath(layer, route.d, color);
  };

  for (const send of workspace.getAllBlocks(false)) {
    if (send.type !== "lsl_cable_send" || send.isShadow?.() || send.isInsertionMarker?.()) continue;
    const name = cableNameOf(send);
    if (!name) continue;
    const color = strokeFor(send);
    for (const recv of matchingRecvs(workspace, name)) {
      link(send, recv, color);
    }
  }

  const writes: Blockly.Block[] = [];
  const reads: Blockly.Block[] = [];
  for (const b of workspace.getAllBlocks(false)) {
    if (b.isShadow?.() || b.isInsertionMarker?.()) continue;
    if (b.type === "lsl_set_var" || b.type === "lsl_change_var" || b.type === "lsl_nc_assign") writes.push(b);
    if (b.type === "lsl_get_var") reads.push(b);
  }
  for (const write of writes) {
    const key = varKey(write);
    if (!key) continue;
    const color = strokeForVar(write);
    for (const read of reads) {
      if (varKey(read) !== key) continue;
      link(write, read, color);
    }
  }
}

export function attachWireLayer(workspace: WorkspaceSvg) {
  let raf = 0;
  const kick = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      try {
        redrawWires(workspace);
      } catch {
        /* workspace tearing down */
      }
    });
  };
  workspace.addChangeListener(kick);
  kick();
  return kick;
}
