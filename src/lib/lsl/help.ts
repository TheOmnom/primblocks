import { LSL_EVENT_DEFS } from "./events.ts";
import { LSL_FUNCTIONS } from "./functions.ts";

/** Bubble copy for a brick. */
export type BrickHelp = {
  type: string;
  title: string;
  tip: string;
  why: string;
};

type Extra = { title: string; tip: string; why: string };

/** Control / cables / notecard / pay — catalog tooltips fill the rest. */
const EXTRA: Record<string, Extra> = {
  lsl_if: {
    title: "if",
    tip: "Condition has to be integer. TRUE is 1, FALSE is 0. A float will not snap here.",
    why: "LSL has no boolean type. if (0) skips the body; anything else runs it.",
  },
  lsl_ifelse: {
    title: "if / else",
    tip: "Same as if, plus an else mouth. Nested if-else is how you fake a switch — LSL has no switch.",
    why: "Don't leave both mouths empty. An empty else still compiles; it just does nothing.",
  },
  lsl_repeat: {
    title: "repeat n times",
    tip: "Declares the index above the for, then for (i = 0; i < n; ++i). That is the legal form.",
    why: "for (integer i = 0; …) is a compile error in LSL. The brick already avoids it.",
  },
  lsl_while: {
    title: "while",
    tip: "Loops while the condition is nonzero. Put a sleep or a timer yield in the body.",
    why: "A tight while (TRUE) with no yield hits the 0.05 s time slice and can stack-heap collide.",
  },
  lsl_dowhile: {
    title: "do / while",
    tip: "Runs the body once, then keeps going while the condition is nonzero.",
    why: "Same yield rule as while. The forever brick is safer if you meant an infinite loop.",
  },
  lsl_forever: {
    title: "forever",
    tip: "while (TRUE) with an llSleep in the body so you cannot freeze the sim by accident.",
    why: "Prefer a timer for anything the user can still touch. Sleep freezes this script; events queue (max 64).",
  },
  lsl_state_change: {
    title: "change state",
    tip: "state name; — leaves this state, clears the event queue, clears listens. default is a real state.",
    why: "Illegal inside a user function. Re-arm timers / listens in the new state's state_entry.",
  },
  lsl_return: {
    title: "return",
    tip: "return; or return expr; Events cannot return a value — leave the socket empty there.",
    why: "A return with a value inside an event is a compile error.",
  },
  lsl_comment: {
    title: "comment",
    tip: "Becomes // text. Has to sit under a hat or it is dropped.",
    why: "Comments outside any event never make it into the script.",
  },
  lsl_raw_stmt: {
    title: "raw LSL",
    tip: "Emitted as-is. The type checker will not save you.",
    why: "Use for vehicles, JSON, jump, or anything not in the catalog. Missing semicolon gets one added.",
  },
  lsl_eval: {
    title: "run (discard return)",
    tip: "LSL lets you throw a return away. Snap a reporter here to emit call;",
    why: "llHTTPRequest and llGetNotecardLine are reporters because you usually want the key. This is how you fire them as a statement.",
  },
  lsl_raw_expr: {
    title: "raw expression",
    tip: "Pasted into a socket with no quotes added. TRUE, PI, or a call you have not bricked.",
    why: "Garbage in, garbage out. Prefer a catalog brick when one exists.",
  },
  lsl_group: {
    title: "group",
    tip: "A frame. Compiles to a comment, not extra LSL. Name it for the job the stack is doing.",
    why: "Pairs with cables: one group produces a value, another consumes it.",
  },
  lsl_cable_send: {
    title: "send along",
    tip: "Writes a typed global (cbl_name). Matching receive draws a noodle.",
    why: "Still has to run inside an event or it never assigns. Names are case-sensitive.",
  },
  lsl_cable_recv: {
    title: "along",
    tip: "Reads the last send on that name. Plug it into a socket.",
    why: "If the names don't match, there is no noodle and the global stays at the type's zero.",
  },
  lsl_notecard_read: {
    title: "read notecard",
    tip: "Not an LSL event. Injects nc_start_…(), dataserver, and changed so you still have one handler per event.",
    why: "Drop a note with the same inventory name in the prim. NAK retries the same line; EOF is the end. 0.1 s per line.",
  },
  lsl_nc_if_key: {
    title: "if notecard key",
    tip: "Inside the reader body. Fires when that key = value line is parsed.",
    why: "Blank lines, # and // are skipped for you.",
  },
  lsl_nc_assign: {
    title: "assign from notecard",
    tip: "Writes the line's value into a typed global. Casts for you.",
    why: "Lists come in as CSV. Wrong type still compiles; the value will look like junk.",
  },
  lsl_nc_ready: {
    title: "notecard ready",
    tip: "TRUE after EOF. FALSE while the 0.1 s-per-line read is in flight.",
    why: "Don't change state during the read — that dumps the event queue and you never see EOF.",
  },
  lsl_param: {
    title: "event value",
    tip: "The official parameter name from the hat this sits under: num_detected, amount, id, message, …",
    why: "Using the wrong name is a compile error. Sensing → event value is how you read money / listen / attach args. llDetected* is a different family.",
  },
  lsl_integer: {
    title: "integer",
    tip: "32-bit signed. TRUE and FALSE are integers 1 and 0.",
    why: "Will plug into a float socket. A float will not plug into an integer socket — use the cast brick.",
  },
  lsl_float: {
    title: "float",
    tip: "Always emitted with a .0 so it stays a float (1 vs 1.0).",
    why: "LSL promotes integer to float in mixed math, not the other way.",
  },
  lsl_string: {
    title: "string",
    tip: "Type the text. Quotes and escapes are added when compiling.",
    why: "Chat is capped at 1023 bytes in-world. Extra is truncated, not a compile error.",
  },
  lsl_vector: {
    title: "vector",
    tip: "<x, y, z>. Positions, colors (0–1 per channel), euler triples.",
    why: "255 is the wrong color space. White is <1, 1, 1>.",
  },
  lsl_rotation: {
    title: "rotation",
    tip: "<x, y, z, s> quaternion. Prefer euler degrees → rotation if you think in degrees.",
    why: "ZERO_ROTATION is identity. Don't type this by hand unless you mean to.",
  },
  lsl_list: {
    title: "list",
    tip: "Four slots. Leave one empty to omit it. Lists cannot contain lists.",
    why: "Longer lists: empty list + llListInsertList, or a raw expression.",
  },
  lsl_empty_list: {
    title: "empty list",
    tip: "[] — legal, and how you stop particles (llParticleSystem([])).",
    why: "A nested list is a compile error. This brick cannot nest.",
  },
  lsl_cast: {
    title: "cast",
    tip: "(type)expr. Required to glue a number onto a string: (string)n.",
    why: "String + integer does not coerce. That snap is refused on purpose.",
  },
  lsl_arithmetic: {
    title: "math",
    tip: "+ concatenates strings and adds numbers/vectors. % is integer (or vector cross) only.",
    why: "Float modulo is illegal. Vector * vector is a dot product (float).",
  },
  lsl_compare: {
    title: "compare",
    tip: "LSL has no ===. TRUE is 1, FALSE is 0. You cannot compare lists with ==.",
    why: "Keys and strings compare because LSL treats them as close cousins.",
  },
  lsl_logic: {
    title: "and / or",
    tip: "Integer only. 0 is false. Use bit and (&) for CHANGED_* / PERMISSION_* flags.",
    why: "&& vs & is the usual bug. Flag tests are bitwise.",
  },
  lsl_bitwise: {
    title: "bit and / or",
    tip: "change & CHANGED_OWNER, perm & PERMISSION_DEBIT. That is how flag fields work.",
    why: "&& is the wrong operator for those. The brick is named so you pick it on purpose.",
  },
  lsl_get_var: {
    title: "get variable",
    tip: "Reads the global. Type comes from when you created it.",
    why: "LSL globals live at the top of the file, initialized to the type's zero.",
  },
  lsl_set_var: {
    title: "set variable",
    tip: "name = value; Types have to match (integer will not take a float).",
    why: "Create the variable first — Variables → Create variable…",
  },
  lsl_change_var: {
    title: "change variable by",
    tip: "name += delta; Integer or float only.",
    why: "That's how a tip jar adds amount, and how a timer bumps a counter.",
  },
  lsl_color_named: {
    title: "named color",
    tip: "A vector of 0–1. Not 0–255.",
    why: "Photoshop 255 looks like a blown-out sun in LSL.",
  },
  lsl_function: {
    title: "define function",
    tip: "Emitted above states. Cannot change state from inside.",
    why: "The compiler rejects state foo; in a function. Keep that brick out of the body.",
  },
  lsl_event_money: {
    title: "money",
    tip: "money(key id, integer amount). id is the payer. amount is this pay. Sensing → event value — not llDetected*.",
    why: "L$ already went to the owner. You do not need PERMISSION_DEBIT to receive. Debit is only for llGiveMoney the other way.",
  },
  lsl_event_attach: {
    title: "attach",
    tip: "id is the avatar when it goes on, NULL_KEY when it comes off. if id ≠ NULL_KEY is the usual branch.",
    why: "This is the wearable event. on_rez is the object appearing. Worn things should owner-say, not Nearby.",
  },
  lsl_event_on_rez: {
    title: "on_rez",
    tip: "Fires when the object is rezzed. start_param comes from llRezObject. Most land-drops just reset.",
    why: "llResetScript() here is how you get a clean state_entry after a wear or a drop.",
  },
  lsl_event_run_time_permissions: {
    title: "run_time_permissions",
    tip: "Answer to llRequestPermissions. Test perm & PERMISSION_DEBIT (bit and), not &&.",
    why: "Granting is async. Do not llGiveMoney in state_entry — the bit is not there yet.",
  },
  lsl_fn_llSetPayPrice: {
    title: "set pay price",
    tip: "PAY_DEFAULT shows the pie. PAY_HIDE hides it (HUDs). Four quick L$ amounts. Not For Sale.",
    why: "Visitors pay the object; L$ lands on the owner. This is not llGiveMoney.",
  },
  lsl_fn_llGiveMoney: {
    title: "give L$",
    tip: "Owner paying someone else. Needs PERMISSION_DEBIT. Integer amount — L$7 / 2 is 3.",
    why: "Visitor pay already landed on the owner. This is a second transfer. No debit → it fails.",
  },
  lsl_fn_llGetAttached: {
    title: "attach point",
    tip: "0 on the ground. A HUD or body point otherwise. That's the worn-vs-placed branch.",
    why: "Ask in state_entry after an on_rez reset so it is true for this rez.",
  },
  lsl_fn_llSetClickAction: {
    title: "set click action",
    tip: "CLICK_ACTION_PAY makes left-click Pay. Without it, Pay is only a pie slice.",
    why: "For Sale in the build window is a different pie. Leave it off for a tip jar.",
  },
  lsl_fn_llRequestPermissions: {
    title: "request permissions",
    tip: "Agent is usually the owner. Bits is PERMISSION_DEBIT for splits, or the matching PERMISSION_* for animate / take controls.",
    why: "Only the owner can grant debit. The dialog appears unless the script is already trusted.",
  },
  lsl_fn_llResetScript: {
    title: "reset this script",
    tip: "Jumps back to default, zeros globals, runs state_entry. Common under on_rez and CHANGED_OWNER.",
    why: "Listens and timers from the last rez die with it. That's the point.",
  },
  lsl_fn_llOwnerSay: {
    title: "owner-say",
    tip: "Owner only, in-region. Wearables and HUDs use this instead of Nearby say.",
    why: "A HUD that llSay's on channel 0 is a fast way to get muted.",
  },
};

function splitTooltip(raw: string): { tip: string; why: string } {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { tip: "", why: "" };
  const nl = trimmed.indexOf("\n");
  if (nl !== -1) {
    return { tip: trimmed.slice(0, nl).trim(), why: trimmed.slice(nl + 1).replace(/\s+/g, " ").trim() };
  }
  const m = trimmed.match(/^(.+?[.!?])\s+([\s\S]+)$/);
  if (m) return { tip: m[1].trim(), why: m[2].trim() };
  return { tip: trimmed, why: "" };
}

function titleFromMessage(message: string): string {
  return message.replace(/\s*%\d+\s*/g, " ").replace(/\s+/g, " ").trim();
}

let cache: Map<string, BrickHelp> | null = null;

/** Build once from the event/function tables, then overlay EXTRA. */
export function brickHelpMap(): Map<string, BrickHelp> {
  if (cache) return cache;
  const map = new Map<string, BrickHelp>();
  for (const ev of LSL_EVENT_DEFS) {
    const split = splitTooltip(ev.tooltip);
    let tip = split.tip;
    let why = split.why;
    if (tip.length < 12 && why) {
      tip = why;
      why = `Official signature: ${ev.signature}.`;
    }
    map.set(ev.type, {
      type: ev.type,
      title: ev.hat.replace(" in state %1", "").replace(" %1", "").replace("%1", "").trim(),
      tip: tip || ev.signature,
      why,
    });
  }
  for (const fn of LSL_FUNCTIONS) {
    const { tip, why } = splitTooltip(fn.tooltip);
    map.set(fn.type, {
      type: fn.type,
      title: titleFromMessage(fn.message) || fn.ll,
      tip: tip || `${fn.ll}()`,
      why,
    });
  }
  for (const [type, extra] of Object.entries(EXTRA)) {
    map.set(type, { type, ...extra });
  }
  cache = map;
  return map;
}

export function helpFor(type: string): BrickHelp {
  const hit = brickHelpMap().get(type);
  if (hit) return hit;
  if (type.startsWith("lsl_const_")) {
    return {
      type,
      title: "constant",
      tip: "Emits the wiki name (TRUE, PAY_DEFAULT, PERMISSION_DEBIT), not a magic number.",
      why: "The compiler knows these. Prefer the name so the script stays readable.",
    };
  }
  return {
    type,
    title: type.replace(/^lsl_(fn_|event_)?/, "").replace(/_/g, " "),
    tip: "Hover the brick for the wiki signature.",
    why: "",
  };
}

export function helpCoverage(): { extras: number; events: number; functions: number } {
  return {
    extras: Object.keys(EXTRA).length,
    events: LSL_EVENT_DEFS.length,
    functions: LSL_FUNCTIONS.length,
  };
}
