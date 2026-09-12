import { utf8Bytes } from "./types.ts";

/** Forced delay in seconds after the call returns. From the Second Life LSL Delay table. */
export const FORCED_DELAYS: Record<string, number> = {
  llLoadURL: 10,
  llTeleportAgentHome: 5,
  llGiveInventory: 2,
  llInstantMessage: 2,
  llTextBox: 1,
  llDialog: 1,
  llPreloadSound: 1,
  llCreateLink: 1,
  llSetTexture: 0.2,
  llSetRot: 0.2,
  llSetLocalRot: 0.2,
  llSetPos: 0.2,
  llSetLinkTexture: 0.2,
  llSetLinkPrimitiveParams: 0.2,
  llScaleTexture: 0.2,
  llRotateTexture: 0.2,
  llOffsetTexture: 0.2,
  llGetPrimitiveParams: 0.2,
  llRezObject: 0.1,
  llRezAtRoot: 0.1,
  llRequestAgentData: 0.1,
  llGetNumberOfNotecardLines: 0.1,
  llGetNotecardLine: 0.1,
  llAdjustSoundVolume: 0.1,
};

/** Simulator frame — events and timers cannot usefully run faster. */
export const SIM_FRAME = 0.022;
export const SCRIPT_TIMESLICE = 0.05;
export const EVENT_QUEUE = 64;
export const MAX_LISTENS = 64;
export const SENSOR_RANGE_MAX = 96;
export const SENSOR_HITS = 16;
export const SETPOS_STEP = 10;
export const REZ_RANGE = 10;
export const CHAT_BYTES = 1023;
export const CHAT_THROTTLE = "200 messages / 10 s / owner / region on channel 0 and DEBUG_CHANNEL";
export const HTTP_SPACING = 0.5;
export const HTTP_BURST = "25 outstanding HTTP requests per owner";
export const IM_DELAY = 2;
export const NAME_BYTES = 63;
export const DESC_BYTES = 127;
export const HOVER_BYTES = 254;
export const DIALOG_BUTTONS = 12;
export const DIALOG_BUTTON_BYTES = 24;
export const SOUND_VOL_MAX = 1;
export const COLOR_MAX = 1;
export const TIMER_MIN_USEFUL = SIM_FRAME;
export const SAY_RANGE = 20;
export const WHISPER_RANGE = 10;
export const SHOUT_RANGE = 100;

export type LimitHit = {
  severity: "error" | "warning";
  kind: "limit" | "delay" | "rule";
  message: string;
  arg?: string;
};

export type LiteralBag = {
  number?: number;
  string?: string;
  constName?: string;
};

function n(bag: LiteralBag | undefined): number | undefined {
  return bag?.number;
}
function s(bag: LiteralBag | undefined): string | undefined {
  return bag?.string;
}

export function formatDelay(sec: number): string {
  if (sec >= 1) return `${sec}s`;
  if (sec === 0.2) return "0.2s";
  if (sec === 0.1) return "0.1s";
  return `${sec}s`;
}

export function delayNote(ll: string, tooltip: string): string {
  const d = FORCED_DELAYS[ll];
  if (!d) return tooltip;
  return `${tooltip} Forced delay ${formatDelay(d)} after the call — the script sleeps that long.`;
}

const CHAT_FNS = new Set([
  "llSay",
  "llWhisper",
  "llShout",
  "llRegionSay",
  "llRegionSayTo",
  "llOwnerSay",
  "llInstantMessage",
]);

/** Inspect one call's literal arguments against in-world limits. */
export function inspectCall(ll: string, args: Record<string, LiteralBag | undefined>): LimitHit[] {
  const hits: LimitHit[] = [];
  const delay = FORCED_DELAYS[ll];
  if (delay && delay >= 1) {
    hits.push({
      severity: "warning",
      kind: "delay",
      message: `${ll} has a ${formatDelay(delay)} forced delay. The script freezes; events queue (max ${EVENT_QUEUE}) until it wakes.`,
    });
  }

  if (CHAT_FNS.has(ll)) {
    const msg = s(args.MSG);
    if (msg != null) {
      const bytes = utf8Bytes(msg);
      if (bytes > CHAT_BYTES) {
        hits.push({
          severity: "warning",
      kind: "limit",
          arg: "MSG",
          message: `${ll} messages are capped at ${CHAT_BYTES} bytes in-world (this one is ${bytes}). Extra bytes are truncated.`,
        });
      }
    }
    const ch = n(args.CHANNEL);
    if (ll === "llRegionSay" && ch === 0) {
      hits.push({
        severity: "error",
        kind: "rule",
        arg: "CHANNEL",
        message: "llRegionSay cannot use channel 0 (PUBLIC_CHANNEL). Use a negative channel, or llSay for local chat.",
      });
    }
  }

  if (ll === "llSetTimerEvent") {
    const sec = n(args.SEC);
    if (sec != null && sec < 0) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "SEC",
        message: "llSetTimerEvent ignores negative values. Use 0.0 to stop the timer.",
      });
    } else if (sec != null && sec > 0 && sec < TIMER_MIN_USEFUL) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "SEC",
        message: `Timer events cannot fire faster than one simulator frame (~${SIM_FRAME}s / 45 FPS). ${sec}s still compiles but will not run faster in-world.`,
      });
    }
  }

  if (ll === "llSleep") {
    const sec = n(args.SEC);
    if (sec != null && sec < 0) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "SEC",
        message: "llSleep ignores negative values.",
      });
    } else if (sec === 0) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "SEC",
        message: "llSleep(0.0) yields a frame at most. Tight loops still hit the 0.05s script time slice.",
      });
    } else if (sec != null && sec >= 5) {
      hits.push({
        severity: "warning",
        kind: "delay",
        arg: "SEC",
        message: `llSleep(${sec}) freezes this script for ${sec}s. Prefer llSetTimerEvent for long waits so other events can run.`,
      });
    }
  }

  if (ll === "llMinEventDelay") {
    const sec = n(args.SEC);
    if (sec != null && sec > 0 && sec < SIM_FRAME) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "SEC",
        message: `llMinEventDelay values below ~${SIM_FRAME}s have the same effect as one simulator frame. link_message and http_request ignore this throttle.`,
      });
    }
  }

  if (ll === "llSensor" || ll === "llSensorRepeat") {
    const range = n(args.RANGE);
    if (range != null && range > SENSOR_RANGE_MAX) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "RANGE",
        message: `llSensor range is clamped to ${SENSOR_RANGE_MAX} m in-world (you set ${range}).`,
      });
    }
    if (range != null && range < 0) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "RANGE",
        message: "Sensor range cannot be negative. In-world it is treated as 0.",
      });
    }
    const arc = n(args.ARC);
    if (arc != null && arc > Math.PI + 1e-6) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "ARC",
        message: "Sensor arc is clamped to PI (a full sphere). Larger values do not see further behind the prim.",
      });
    }
    if (ll === "llSensorRepeat") {
      const rate = n(args.RATE);
      if (rate != null && rate > 0 && rate < SIM_FRAME) {
        hits.push({
          severity: "warning",
          kind: "limit",
          arg: "RATE",
          message: `Sensor repeats faster than ~${SIM_FRAME}s still only scan once per simulator frame and will flood the ${EVENT_QUEUE}-deep event queue.`,
        });
      }
    }
  }

  const vol = n(args.VOL);
  if (vol != null && (ll === "llPlaySound" || ll === "llLoopSound" || ll === "llTriggerSound" || ll === "llAdjustSoundVolume")) {
    if (vol > SOUND_VOL_MAX || vol < 0) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "VOL",
        message: `Sound volume is clamped to 0.0–1.0 in-world (you set ${vol}).`,
      });
    }
  }

  const alpha = n(args.ALPHA);
  if (alpha != null && (ll === "llSetAlpha" || ll === "llSetLinkAlpha" || ll === "llSetText")) {
    if (alpha > 1 || alpha < 0) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "ALPHA",
        message: `Alpha is clamped to 0.0–1.0 (you set ${alpha}).`,
      });
    }
  }

  if (ll === "llSetText") {
    const text = s(args.TEXT);
    if (text != null && utf8Bytes(text) > HOVER_BYTES) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "TEXT",
        message: `Hover text shows at most ${HOVER_BYTES} bytes (this one is ${utf8Bytes(text)}).`,
      });
    }
  }

  if (ll === "llSetObjectName") {
    const name = s(args.NAME);
    if (name != null && utf8Bytes(name) > NAME_BYTES) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "NAME",
        message: `Object name is capped at ${NAME_BYTES} bytes (this one is ${utf8Bytes(name)}).`,
      });
    }
  }

  if (ll === "llSetObjectDesc") {
    const desc = s(args.DESC);
    if (desc != null && utf8Bytes(desc) > DESC_BYTES) {
      hits.push({
        severity: "warning",
        kind: "limit",
        arg: "DESC",
        message: `Description is capped at ${DESC_BYTES} bytes (this one is ${utf8Bytes(desc)}).`,
      });
    }
  }

  return hits;
}

export const DETECTED_FNS = new Set([
  "llDetectedKey",
  "llDetectedName",
  "llDetectedPos",
  "llDetectedRot",
  "llDetectedVel",
  "llDetectedType",
  "llDetectedLinkNumber",
  "llDetectedGrab",
  "llDetectedTouchST",
  "llDetectedTouchUV",
  "llDetectedTouchPos",
  "llDetectedTouchFace",
  "llDetectedTouchNormal",
  "llDetectedTouchBinormal",
]);

export const DETECTION_EVENTS = new Set([
  "touch_start",
  "touch",
  "touch_end",
  "collision_start",
  "collision",
  "collision_end",
  "sensor",
]);

export const TOUCH_ONLY_FNS = new Set([
  "llDetectedTouchST",
  "llDetectedTouchUV",
  "llDetectedTouchPos",
  "llDetectedTouchFace",
  "llDetectedTouchNormal",
  "llDetectedTouchBinormal",
]);

export const TOUCH_EVENTS = new Set(["touch_start", "touch", "touch_end"]);

export const LOOP_BLOCK_TYPES = new Set([
  "lsl_while",
  "lsl_dowhile",
  "lsl_repeat",
  "lsl_forever",
]);
