import type { WorkspaceSvg } from "blockly/core";
import * as Blockly from "blockly/core";
import { CAT } from "./colors";
import { cableNameOf, matchingRecvs } from "./cables";

const STROKE: Record<string, string> = {
  Integer: CAT.variable,
  Boolean: CAT.variable,
  Number: CAT.operator,
  String: CAT.chat,
  Key: CAT.world,
  Vector: CAT.motion,
  Rotation: CAT.motion,
  List: CAT.list,
};

function strokeFor(block: Blockly.Block): string {
  const check = block.getInput("VALUE")?.connection?.targetBlock()?.outputConnection?.getCheck();
  const first = Array.isArray(check) ? check[0] : check;
  return STROKE[first || ""] || CAT.chat;
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

function cubic(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

function ensureLayer(workspace: WorkspaceSvg): SVGElement | null {
  const canvas = (
    workspace as WorkspaceSvg & { getBlockCanvas?: () => SVGGElement | null }
  ).getBlockCanvas?.();
  if (!canvas) return null;
  let g = canvas.querySelector("#prim-wires") as SVGGElement | null;
  if (!g) {
    g = Blockly.utils.dom.createSvgElement("g", { id: "prim-wires" }, null) as SVGGElement;
    canvas.insertBefore(g, canvas.firstChild);
  }
  return g;
}

export function redrawWires(workspace: WorkspaceSvg) {
  const layer = ensureLayer(workspace);
  if (!layer) return;
  while (layer.firstChild) layer.removeChild(layer.firstChild);

  const seen = new Set<string>();
  for (const send of workspace.getAllBlocks(false)) {
    if (send.type !== "lsl_cable_send" || send.isShadow?.() || send.isInsertionMarker?.()) continue;
    const name = cableNameOf(send);
    if (!name) continue;
    const from = anchor(send as Blockly.BlockSvg, "out");
    if (!from) continue;
    const color = strokeFor(send);
    for (const recv of matchingRecvs(workspace, name)) {
      const to = anchor(recv as Blockly.BlockSvg, "in");
      if (!to) continue;
      const key = `${send.id}->${recv.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      Blockly.utils.dom.createSvgElement(
        "path",
        {
          d: cubic(from, to),
          class: "prim-wire",
          stroke: color,
          fill: "none",
          "stroke-width": "3.5",
          "stroke-linecap": "round",
          "pointer-events": "none",
          opacity: "0.88",
        },
        layer,
      );
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
