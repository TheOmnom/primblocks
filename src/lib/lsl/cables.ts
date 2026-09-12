import type { Block, Workspace } from "blockly/core";
import { sanitizeIdent } from "./reserved.ts";

const LSL_FROM_CHECK: Record<string, string> = {
  Integer: "integer",
  Boolean: "integer",
  Number: "float",
  String: "string",
  Key: "key",
  Vector: "vector",
  Rotation: "rotation",
  List: "list",
};

const DEFAULTS: Record<string, string> = {
  integer: "0",
  float: "0.0",
  string: '""',
  key: "NULL_KEY",
  vector: "ZERO_VECTOR",
  rotation: "ZERO_ROTATION",
  list: "[]",
};

export type CableInfo = {
  name: string;
  ident: string;
  lslType: string;
  fallback: string;
};

export function cableNameOf(block: Block): string {
  return String(block.getFieldValue("CABLE") || "").trim();
}

export function cableIdent(name: string): string {
  const raw = name.trim() || "wire";
  return sanitizeIdent(`cbl_${raw}`, "cbl_wire");
}

export function lslTypeFromCheck(check: string | string[] | null | undefined): string {
  const first = Array.isArray(check) ? check[0] : check;
  if (!first) return "string";
  return LSL_FROM_CHECK[first] ?? "string";
}

function checkOfSend(block: Block): string | string[] | null {
  const target = block.getInput("VALUE")?.connection?.targetBlock();
  const fromChild = target?.outputConnection?.getCheck() ?? null;
  if (fromChild) return fromChild;
  return block.getInput("VALUE")?.connection?.getCheck() ?? null;
}

/** One entry per unique cable name. Type comes from the first send's plugged value. */
export function collectCables(workspace: Workspace): CableInfo[] {
  const byName = new Map<string, CableInfo>();
  for (const block of workspace.getAllBlocks(false)) {
    if (block.type !== "lsl_cable_send" && block.type !== "lsl_cable_recv") continue;
    if (block.isShadow?.() || block.isInsertionMarker?.()) continue;
    const name = cableNameOf(block);
    if (!name) continue;
    if (!byName.has(name)) {
      const lslType =
        block.type === "lsl_cable_send" ? lslTypeFromCheck(checkOfSend(block)) : "string";
      byName.set(name, {
        name,
        ident: cableIdent(name),
        lslType,
        fallback: DEFAULTS[lslType] ?? '""',
      });
    } else if (block.type === "lsl_cable_send") {
      const info = byName.get(name)!;
      const next = lslTypeFromCheck(checkOfSend(block));
      if (info.lslType === "string" && next !== "string") {
        info.lslType = next;
        info.fallback = DEFAULTS[next] ?? '""';
      }
    }
  }
  return [...byName.values()];
}

export function matchingSends(workspace: Workspace, name: string): Block[] {
  return workspace.getAllBlocks(false).filter(
    (b) => b.type === "lsl_cable_send" && cableNameOf(b) === name && !b.isShadow?.(),
  );
}

export function matchingRecvs(workspace: Workspace, name: string): Block[] {
  return workspace.getAllBlocks(false).filter(
    (b) => b.type === "lsl_cable_recv" && cableNameOf(b) === name && !b.isShadow?.(),
  );
}
