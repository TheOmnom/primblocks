import type { Block, Workspace } from "blockly/core";
import { LSL_FUNCTIONS } from "./functions";
import {
  DETECTED_FNS,
  DETECTION_EVENTS,
  EVENT_QUEUE,
  FORCED_DELAYS,
  LOOP_BLOCK_TYPES,
  SCRIPT_TIMESLICE,
  SIM_FRAME,
  TOUCH_EVENTS,
  TOUCH_ONLY_FNS,
  inspectCall,
  type LimitHit,
} from "./limits";
import {
  ancestorEvent,
  ancestorFunction,
  ancestorNotecard,
  eachStatement,
  eventIdFromType,
  eventParams,
  literalConst,
  literalNumber,
  literalString,
} from "./resolve";
import { cableNameOf, matchingRecvs, matchingSends } from "./cables";

export type Diagnostic = LimitHit & {
  blockId?: string;
};

const FN_BY_TYPE = new Map(LSL_FUNCTIONS.map((f) => [f.type, f]));

const NC_LINE_TYPES = new Set([
  "lsl_nc_line",
  "lsl_nc_key",
  "lsl_nc_value",
  "lsl_nc_index",
  "lsl_nc_if_key",
  "lsl_nc_assign",
]);
const NC_TOP_OK = new Set(["lsl_function", "lsl_notecard_read"]);

function bagFor(block: Block): Record<string, { number?: number; string?: string; constName?: string }> {
  const out: Record<string, { number?: number; string?: string; constName?: string }> = {};
  for (const input of block.inputList) {
    const child = input.connection?.targetBlock() ?? null;
    if (!child) continue;
    const num = literalNumber(child);
    const str = literalString(child);
    const c = literalConst(child);
    if (num == null && str == null && !c) continue;
    out[input.name] = {
      ...(num != null ? { number: num } : {}),
      ...(str != null ? { string: str } : {}),
      ...(c ? { constName: c } : {}),
    };
  }
  return out;
}

function push(out: Diagnostic[], block: Block, hit: LimitHit) {
  out.push({ ...hit, blockId: block.id });
}

function walkYields(block: Block): { sleeps: boolean; timers: boolean } {
  let sleeps = false;
  let timers = false;
  eachStatement(block, (b) => {
    if (b.type === "lsl_fn_llSleep" || b.type === "lsl_forever") sleeps = true;
    if (b.type === "lsl_fn_llSetTimerEvent") timers = true;
  });
  return { sleeps, timers };
}

function delaySum(start: Block | null): { total: number; calls: string[] } {
  let total = 0;
  const calls: string[] = [];
  eachStatement(start, (b) => {
    const fn = FN_BY_TYPE.get(b.type);
    if (!fn) return;
    const d = FORCED_DELAYS[fn.ll];
    if (d) {
      total += d;
      calls.push(`${fn.ll} (${d}s)`);
    }
    if (fn.ll === "llSleep") {
      const sec = literalNumber(b.getInputTargetBlock("SEC"));
      if (sec && sec > 0) {
        total += sec;
        calls.push(`llSleep (${sec}s)`);
      }
    }
  });
  return { total, calls };
}

function countType(start: Block | null, type: string): number {
  let n = 0;
  eachStatement(start, (b) => {
    if (b.type === type) n += 1;
  });
  return n;
}

function glowFace(block: Block, out: Diagnostic[]) {
  if (block.type !== "lsl_glow") return;
  const g = literalNumber(block.getInputTargetBlock("GLOW"));
  if (g != null && (g < 0 || g > 1)) {
    push(out, block, {
      severity: "warning",
      kind: "limit",
      message: `Glow is clamped to 0.0–1.0 in-world (you set ${g}).`,
    });
  }
}

function foreverSleep(block: Block, out: Diagnostic[]) {
  if (block.type !== "lsl_forever") return;
  const sec = literalNumber(block.getInputTargetBlock("SLEEP"));
  if (sec != null && sec > 0 && sec < SIM_FRAME) {
    push(out, block, {
      severity: "warning",
      kind: "limit",
      message: `Loop yield ${sec}s is faster than a simulator frame (~${SIM_FRAME}s). In-world this still costs a full timeslice and can starve other scripts.`,
    });
  } else if (sec === 0 || sec == null) {
    push(out, block, {
      severity: "warning",
      kind: "limit",
      message: `A yield of 0 still hits the ${SCRIPT_TIMESLICE}s script time slice every pass. Use ≥ ${SIM_FRAME}s or a timer.`,
    });
  }
}

function loopBody(block: Block, out: Diagnostic[]) {
  if (!LOOP_BLOCK_TYPES.has(block.type)) return;
  const body = block.getInputTargetBlock("DO");
  if (block.type === "lsl_while" || block.type === "lsl_dowhile") {
    const { sleeps, timers } = walkYields(block);
    if (!sleeps && !timers) {
      push(out, block, {
        severity: "warning",
        kind: "limit",
        message: `A while/do loop without llSleep or a timer will burn the ${SCRIPT_TIMESLICE}s time slice and can stack-heap collide.`,
      });
    }
  }
  let says = 0;
  eachStatement(body, (b) => {
    if (
      (b.type === "lsl_fn_llSay" || b.type === "lsl_fn_llShout" || b.type === "lsl_fn_llWhisper") &&
      (literalNumber(b.getInputTargetBlock("CHANNEL")) === 0 ||
        literalConst(b.getInputTargetBlock("CHANNEL")) === "PUBLIC_CHANNEL")
    ) {
      says += 1;
    }
    if (b.type === "lsl_fn_llInstantMessage") {
      push(out, block, {
        severity: "warning",
        kind: "delay",
        message: "llInstantMessage inside a loop costs 2s per call and will freeze this script for the whole burst.",
      });
    }
    if (b.type === "lsl_fn_llHTTPRequest") {
      push(out, block, {
        severity: "warning",
        kind: "limit",
        message: "llHTTPRequest inside a loop will trip the per-owner HTTP throttle (25 outstanding, ~0.5s spacing).",
      });
    }
  });
  if (says > 0) {
    push(out, block, {
      severity: "warning",
      kind: "limit",
      message: `Channel-0 chat inside a loop is throttled (200 / 10s / owner / region). Excess messages are dropped but still count.`,
    });
  }
}

export function validateWorkspace(workspace: Workspace): Diagnostic[] {
  const out: Diagnostic[] = [];
  const seenEvent = new Set<string>();
  const seenNc = new Set<string>();

  for (const block of workspace.getAllBlocks(false)) {
    if (block.isShadow?.() || block.isInsertionMarker?.()) continue;

    const fn = FN_BY_TYPE.get(block.type);
    if (fn) {
      const hits = inspectCall(fn.ll, bagFor(block));
      const seen = new Set<string>();
      for (const h of hits) {
        const k = h.message;
        if (seen.has(k)) continue;
        seen.add(k);
        if (h.kind === "delay" && FORCED_DELAYS[fn.ll] && FORCED_DELAYS[fn.ll] < 1 && fn.ll !== "llSetPos" && fn.ll !== "llRezObject" && fn.ll !== "llRezAtRoot") {
          continue;
        }
        if (fn.ll === "llListen" || fn.ll === "llHTTPRequest") {
          // once per workspace, not per block — still useful on the block
        }
        push(out, block, h);
      }

      if (fn.ll === "llAdjustDamage") {
        const ev = ancestorEvent(block);
        const id = ev ? eventIdFromType(ev.type) : null;
        if (id !== "on_damage") {
          push(out, block, {
            severity: "warning",
            kind: "rule",
            message: "llAdjustDamage only works inside on_damage — the sim shouts to DEBUG_CHANNEL otherwise.",
          });
        }
      }

      if (DETECTED_FNS.has(fn.ll)) {
        const ev = ancestorEvent(block);
        const id = ev ? eventIdFromType(ev.type) : null;
        if (!id) {
          push(out, block, {
            severity: "warning",
            kind: "rule",
            message: `${fn.ll} is only valid inside touch, collision, sensor, or combat damage events.`,
          });
        } else if (!DETECTION_EVENTS.has(id)) {
          push(out, block, {
            severity: "warning",
            kind: "rule",
            message: `${fn.ll} returns empty data outside touch / collision / sensor / on_damage / final_damage (currently in ${id}).`,
          });
        } else if (TOUCH_ONLY_FNS.has(fn.ll) && !TOUCH_EVENTS.has(id)) {
          push(out, block, {
            severity: "warning",
            kind: "rule",
            message: `${fn.ll} is only meaningful in touch_start / touch / touch_end.`,
          });
        } else if (fn.ll === "llDetectedDamage" && id !== "on_damage" && id !== "final_damage") {
          push(out, block, {
            severity: "warning",
            kind: "rule",
            message: "llDetectedDamage returns [] outside on_damage / final_damage.",
          });
        }
      }
    }

    glowFace(block, out);
    foreverSleep(block, out);
    loopBody(block, out);

    if (block.type === "lsl_point_light") {
      const i = literalNumber(block.getInputTargetBlock("INT"));
      if (i != null && (i < 0 || i > 1)) {
        push(out, block, {
          severity: "warning",
          kind: "limit",
          message: `Point-light intensity is typically 0.0–1.0 (you set ${i}).`,
        });
      }
    }

    if (block.type === "lsl_state_change" && ancestorFunction(block)) {
      push(out, block, {
        severity: "error",
        kind: "rule",
        message: "LSL forbids changing state from inside a user function.",
      });
    }

    if (block.type === "lsl_return") {
      const hasVal = !!block.getInputTargetBlock("VAL");
      const fn = ancestorFunction(block);
      const ev = ancestorEvent(block);
      if (hasVal && ev && !fn) {
        push(out, block, {
          severity: "error",
          kind: "rule",
          message: "Events cannot return a value. Use return; to exit the event.",
        });
      }
    }

    if (block.type === "lsl_param") {
      const ev = ancestorEvent(block);
      const name = String(block.getFieldValue("NAME") || "");
      if (!ev) {
        push(out, block, {
          severity: "error",
          kind: "rule",
          message: `Event value “${name}” must sit inside the matching event brick or LSL will not compile.`,
        });
      } else {
        const allowed = eventParams(ev.type).map((p) => p.name);
        if (allowed.length && !allowed.includes(name)) {
          push(out, block, {
            severity: "error",
            kind: "rule",
            message: `“${name}” is not a parameter of ${eventIdFromType(ev.type)}(). That is a compile error.`,
          });
        }
      }
    }

    if (block.type === "lsl_function") {
      let illegal = false;
      eachStatement(block.getInputTargetBlock("STACK"), (b) => {
        if (b.type === "lsl_state_change") illegal = true;
      });
      if (illegal) {
        push(out, block, {
          severity: "error",
          kind: "rule",
          message: "This function changes state — LSL will refuse to compile it.",
        });
      }
    }

    if (block.type === "lsl_notecard_read") {
      const state = String(block.getFieldValue("STATE") || "default").trim() || "default";
      const name = String(block.getFieldValue("NAME") || "config").trim() || "config";
      const key = `${state}::nc::${name}`;
      if (seenNc.has(key)) {
        push(out, block, {
          severity: "error",
          kind: "rule",
          message: `Duplicate read-notecard “${name}” in state ${state}. One reader per name per state — extras are dropped.`,
        });
      }
      seenNc.add(key);
      push(out, block, {
        severity: "warning",
        kind: "delay",
        message: `llGetNotecardLine sleeps 0.1s per line. Do not change state while it is reading — that clears the event queue and drops the rest of the card.`,
      });
      let jumps = false;
      for (const input of ["DO", "DONE", "MISSING"] as const) {
        eachStatement(block.getInputTargetBlock(input), (b) => {
          if (b.type === "lsl_state_change") jumps = true;
        });
      }
      if (jumps) {
        push(out, block, {
          severity: "error",
          kind: "rule",
          message: "Changing state from a notecard reader clears the dataserver queue. Finish the read, then change state from another event.",
        });
      }
    }

    if (NC_LINE_TYPES.has(block.type) && !ancestorNotecard(block)) {
      push(out, block, {
        severity: "error",
        kind: "rule",
        message: "Notecard line / setting bricks only work inside a read-notecard hat. “notecard ready” can sit in any event.",
      });
    }

    if (block.type === "lsl_cable_send" || block.type === "lsl_cable_recv") {
      const name = cableNameOf(block);
      if (!name) {
        push(out, block, {
          severity: "error",
          kind: "rule",
          message: "Name the cable. Matching send/receive pairs need the same name or the noodle will not draw and LSL will not know which global to use.",
        });
      } else if (block.type === "lsl_cable_send") {
        if (!matchingRecvs(workspace, name).length) {
          push(out, block, {
            severity: "warning",
            kind: "rule",
            message: `Nothing receives “${name}”. Drop an along-cable brick with that name, or this write goes nowhere useful.`,
          });
        }
        if (matchingSends(workspace, name).length > 1) {
          push(out, block, {
            severity: "warning",
            kind: "rule",
            message: `More than one send on “${name}”. Last write in event order wins. Split the name if they are different values.`,
          });
        }
      } else if (!matchingSends(workspace, name).length) {
        push(out, block, {
          severity: "error",
          kind: "rule",
          message: `No send on “${name}”. The global stays at its zero until something writes it.`,
        });
      }
    }

    if (eventIdFromType(block.type)) {
      const state = String(block.getFieldValue("STATE") || "default").trim() || "default";
      const key = `${state}::${eventIdFromType(block.type)}`;
      if (seenEvent.has(key)) {
        push(out, block, {
          severity: "error",
          kind: "rule",
          message: `Duplicate ${eventIdFromType(block.type)} in state ${state}. LSL allows one handler per event per state — extras are dropped.`,
        });
      }
      seenEvent.add(key);

      const { total, calls } = delaySum(block.getInputTargetBlock("DO"));
      if (total >= 2) {
        push(out, block, {
          severity: "warning",
          kind: "delay",
          message: `This event stacks ~${total.toFixed(1)}s of forced delay (${calls.join(", ")}). Other events wait in a ${EVENT_QUEUE}-deep queue.`,
        });
      }
      if (countType(block.getInputTargetBlock("DO"), "lsl_fn_llHTTPRequest") > 1) {
        push(out, block, {
          severity: "warning",
          kind: "limit",
          message: "Multiple llHTTPRequest calls in one event will serialize on the per-owner HTTP throttle (~0.5s, 25 outstanding).",
        });
      }
    }

    if (
      !block.outputConnection &&
      !eventIdFromType(block.type) &&
      !NC_TOP_OK.has(block.type) &&
      !block.getParent() &&
      (block.previousConnection || block.nextConnection)
    ) {
      push(out, block, {
        severity: "warning",
        kind: "rule",
        message: "This command sits outside an event — it will not be compiled. Snap it under a yellow hat.",
      });
    }
  }

  const unique: Diagnostic[] = [];
  const keys = new Set<string>();
  for (const d of out) {
    const k = `${d.blockId}:${d.message}`;
    if (keys.has(k)) continue;
    keys.add(k);
    unique.push(d);
  }
  unique.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
    return a.message.localeCompare(b.message);
  });
  return unique;
}

export function applyBlockWarnings(workspace: Workspace, diags: Diagnostic[]) {
  const byBlock = new Map<string, string[]>();
  for (const d of diags) {
    if (!d.blockId) continue;
    const list = byBlock.get(d.blockId) ?? [];
    list.push(d.message);
    byBlock.set(d.blockId, list);
  }
  for (const block of workspace.getAllBlocks(false)) {
    if (typeof block.setWarningText !== "function") continue;
    const msgs = byBlock.get(block.id);
    block.setWarningText(msgs ? msgs.join("\n") : null);
  }
}

export function diagKey(d: Diagnostic): string {
  return `${d.severity}:${d.kind}:${d.message}`;
}
