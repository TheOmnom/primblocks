import * as Blockly from "blockly/core";
import type { Connection } from "blockly/core";
import {
  ancestorEvent,
  ancestorFunction,
  eventParams,
  resolveInputTypes,
  resolveOutputTypes,
} from "./resolve";
import {
  type LslType,
  allowedForOperand,
  arithmeticInputsLegal,
  compareLegal,
  describeTypes,
  typesAccept,
} from "./types";

export const REASON_LSL_CONTEXT = 100;

export type SnapReject = {
  message: string;
  at: number;
};

function isValueConn(c: Connection): boolean {
  return (
    c.type === Blockly.ConnectionType.INPUT_VALUE ||
    c.type === Blockly.ConnectionType.OUTPUT_VALUE
  );
}

function splitValue(a: Connection, b: Connection): { input: Connection; output: Connection } | null {
  if (
    a.type === Blockly.ConnectionType.INPUT_VALUE &&
    b.type === Blockly.ConnectionType.OUTPUT_VALUE
  ) {
    return { input: a, output: b };
  }
  if (
    b.type === Blockly.ConnectionType.INPUT_VALUE &&
    a.type === Blockly.ConnectionType.OUTPUT_VALUE
  ) {
    return { input: b, output: a };
  }
  return null;
}

function mismatchMessage(want: LslType[] | null, got: LslType[] | null, detail?: string): string {
  const extra = detail ? ` ${detail}` : "";
  return `Can't snap: needs ${describeTypes(want)}, got ${describeTypes(got)}.${extra}`;
}

export class LslConnectionChecker extends Blockly.ConnectionChecker {
  lastReject: SnapReject | null = null;
  private pendingMessage = "";

  consumeReject(maxAgeMs = 180): string | null {
    const r = this.lastReject;
    this.lastReject = null;
    if (!r) return null;
    if (Date.now() - r.at > maxAgeMs) return null;
    return r.message;
  }

  private fail(message: string): false {
    this.pendingMessage = message;
    return false;
  }

  override getErrorMessage(
    errorCode: number,
    a: Connection | null,
    b: Connection | null,
  ): string {
    if (errorCode === REASON_LSL_CONTEXT || errorCode === Blockly.Connection.REASON_CHECKS_FAILED) {
      return this.lastReject?.message || super.getErrorMessage(errorCode, a, b);
    }
    return super.getErrorMessage(errorCode, a, b);
  }

  override canConnectWithReason(
    a: Connection | null,
    b: Connection | null,
    isDragging: boolean,
    opt_distance?: number,
  ): number {
    const safety = this.doSafetyChecks(a, b);
    if (safety !== Blockly.Connection.CAN_CONNECT) return safety;
    if (!a || !b) return Blockly.Connection.REASON_TARGET_NULL;

    const close =
      isDragging &&
      opt_distance != null &&
      typeof (a as Blockly.RenderedConnection).distanceFrom === "function" &&
      (a as Blockly.RenderedConnection).distanceFrom(b as Blockly.RenderedConnection) <=
        opt_distance;

    if (!this.doTypeChecks(a, b)) {
      if (close && this.pendingMessage) {
        this.lastReject = { message: this.pendingMessage, at: Date.now() };
      }
      return Blockly.Connection.REASON_CHECKS_FAILED;
    }
    const ctx = this.lslContext(a, b);
    if (ctx) {
      if (close) this.lastReject = { message: ctx, at: Date.now() };
      return REASON_LSL_CONTEXT;
    }
    if (isDragging) {
      const dist = opt_distance ?? Number.POSITIVE_INFINITY;
      if (!this.doDragChecks(a as Blockly.RenderedConnection, b as Blockly.RenderedConnection, dist)) {
        return Blockly.Connection.REASON_DRAG_CHECKS_FAILED;
      }
    }
    return Blockly.Connection.CAN_CONNECT;
  }

  override doTypeChecks(a: Connection, b: Connection): boolean {
    if (!isValueConn(a) || !isValueConn(b)) return super.doTypeChecks(a, b);
    const pair = splitValue(a, b);
    if (!pair) return super.doTypeChecks(a, b);

    const { input, output } = pair;
    const inBlock = input.getSourceBlock();
    const outBlock = output.getSourceBlock();
    const inName = inBlock.inputList.find((i) => i.connection === input)?.name ?? "";
    const outTypes = resolveOutputTypes(outBlock);
    const inTypes = resolveInputTypes(input);

    if (outTypes && outTypes.length === 0) {
      return this.fail("Can't snap: that call returns nothing — use the statement version.");
    }

    if (inBlock.type === "lsl_arithmetic") {
      const op = String(inBlock.getFieldValue("OP"));
      const otherName = inName === "A" ? "B" : "A";
      const other = resolveOutputTypes(inBlock.getInputTargetBlock(otherName));
      if (outTypes?.[0] && other?.[0]) {
        const legal =
          inName === "A"
            ? arithmeticInputsLegal(op, outTypes[0], other[0])
            : arithmeticInputsLegal(op, other[0], outTypes[0]);
        if (!legal) {
          const hint =
            op === "+" && (outTypes[0] === "String" || other[0] === "String")
              ? " Cast the number with (string) first."
              : op === "%"
                ? " % is integer modulo or vector cross product."
                : "";
          return this.fail(
            mismatchMessage(allowedForOperand(op, inName === "A" ? "A" : "B", other), outTypes, hint),
          );
        }
      } else if (outTypes?.[0]) {
        const allowed = allowedForOperand(op, inName === "A" ? "A" : "B", other);
        if (!allowed.includes(outTypes[0]) && !typesAccept(allowed, outTypes)) {
          return this.fail(mismatchMessage(allowed, outTypes));
        }
      }
      return true;
    }

    if (inBlock.type === "lsl_compare") {
      const op = String(inBlock.getFieldValue("OP"));
      const otherName = inName === "A" ? "B" : "A";
      const other = resolveOutputTypes(inBlock.getInputTargetBlock(otherName));
      if (outTypes?.[0] && other?.[0] && !compareLegal(op, outTypes[0], other[0])) {
        const hint =
          outTypes[0] === "List" || other[0] === "List"
            ? " Lists cannot be compared with ==."
            : op !== "==" && op !== "!="
              ? " < > ≤ ≥ only work on integers and floats."
              : "";
        return this.fail(mismatchMessage(other, outTypes, hint));
      }
      if (outTypes && other && outTypes[0] === "List") {
        return this.fail("Can't snap: LSL cannot compare lists.");
      }
    }

    if (inBlock.type === "lsl_list" && outTypes?.[0] === "List") {
      return this.fail("Can't snap: LSL lists cannot contain lists.");
    }

    if (inBlock.type === "lsl_return" && inName === "VAL") {
      const fn = ancestorFunction(inBlock);
      const ev = ancestorEvent(inBlock);
      if (ev && !fn) {
        return this.fail("Can't snap: events cannot return a value. Use a bare return to exit early.");
      }
      if (fn) {
        const ret = String(fn.getFieldValue("RET") || "");
        if (!ret) {
          return this.fail("Can't snap: this function returns nothing.");
        }
      }
    }

    if (!typesAccept(inTypes, outTypes)) {
      let hint = "";
      if (inTypes?.includes("String") && outTypes?.[0] && ["Integer", "Number", "Boolean"].includes(outTypes[0])) {
        hint = " Concatenate with (string)n.";
      }
      if (inTypes?.[0] === "Integer" && outTypes?.[0] === "Number") {
        hint = " Assigning a float to an integer needs (integer).";
      }
      if (
        (inBlock.type === "lsl_if" ||
          inBlock.type === "lsl_ifelse" ||
          inBlock.type === "lsl_while" ||
          inBlock.type === "lsl_dowhile") &&
        outTypes?.[0] === "Number"
      ) {
        hint = " if/while conditions must be integer (TRUE/FALSE). Compare the float first.";
      }
      return this.fail(mismatchMessage(inTypes, outTypes, hint));
    }
    return true;
  }

  private lslContext(a: Connection, b: Connection): string | null {
    const superior = a.isSuperior() ? a : b;
    const inferior = a.isSuperior() ? b : a;
    const child = inferior.getSourceBlock();
    const parent = superior.getSourceBlock();

    if (
      superior.type === Blockly.ConnectionType.NEXT_STATEMENT ||
      superior.type === Blockly.ConnectionType.PREVIOUS_STATEMENT
    ) {
      if (child.type === "lsl_state_change") {
        const host = ancestorFunction(parent) ?? (parent.type === "lsl_function" ? parent : null);
        if (host) {
          return "Can't snap: LSL forbids state changes inside user functions.";
        }
      }
    }

    if (child.type === "lsl_param" && inferior.type === Blockly.ConnectionType.OUTPUT_VALUE) {
      const ev = ancestorEvent(parent);
      if (ev) {
        const name = String(child.getFieldValue("NAME") || "");
        const allowed = eventParams(ev.type).map((p) => p.name);
        if (allowed.length && !allowed.includes(name)) {
          return `Can't snap: ${name} is not a parameter of ${ev.type.replace("lsl_event_", "")}().`;
        }
      }
    }

    return null;
  }
}

export function registerLslChecker() {
  const type = Blockly.registry.Type.CONNECTION_CHECKER;
  try {
    if (Blockly.registry.hasItem(type, "lsl")) return;
  } catch {
    /* */
  }
  Blockly.registry.register(type, "lsl", LslConnectionChecker);
}
