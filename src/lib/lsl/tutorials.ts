import type { Workspace } from "blockly/core";
import type { ExampleId } from "@/lib/lsl/examples";

export type TutorialLevel = "basic" | "intermediate" | "advanced" | "expert";

export type StepExpect = {
  type: string;
  root?: string;
  field?: { name: string; value: string };
  /** Shadow / nested literal on a value input */
  inputField?: { input: string; field: string; value?: string; nonempty?: boolean };
};

export type TutorialStep = {
  title: string;
  do: string;
  why: string;
  toolbox?: string;
  expect?: StepExpect;
};

export type Tutorial = {
  id: string;
  level: TutorialLevel;
  title: string;
  blurb: string;
  minutes: number;
  startEmpty?: boolean;
  exampleId?: ExampleId;
  openNotecard?: boolean;
  steps: TutorialStep[];
};

export const LEVELS: { id: TutorialLevel; label: string; hint: string }[] = [
  { id: "basic", label: "Basic", hint: "Hats, say, paste into a prim" },
  { id: "intermediate", label: "Intermediate", hint: "Timers, listens, states, dialogs" },
  { id: "advanced", label: "Advanced", hint: "Sensors, notecards, delays" },
  { id: "expert", label: "Expert", hint: "The stuff that fails in-world" },
];

function fieldValue(block: { getFieldValue: (n: string) => unknown }, name: string): string {
  return String(block.getFieldValue(name) ?? "");
}

function inputLiteral(
  block: {
    getInputTargetBlock: (n: string) => { getFieldValue: (n: string) => unknown } | null;
  },
  input: string,
  field: string,
): string {
  const child = block.getInputTargetBlock(input);
  if (!child) return "";
  return String(child.getFieldValue(field) ?? "");
}

function rootType(block: { getRootBlock: () => { type: string } }): string {
  return block.getRootBlock().type;
}

export function stepSatisfied(workspace: Workspace, step: TutorialStep): boolean {
  const expect = step.expect;
  if (!expect) return true;
  const blocks = workspace.getAllBlocks(false).filter((b) => {
    if (b.isShadow?.() || b.isInsertionMarker?.()) return false;
    return b.type === expect.type;
  });
  if (!blocks.length) return false;
  return blocks.some((b) => {
    if (expect.root && rootType(b) !== expect.root) return false;
    if (expect.field && fieldValue(b, expect.field.name) !== expect.field.value) return false;
    if (expect.inputField) {
      const got = inputLiteral(b, expect.inputField.input, expect.inputField.field);
      if (expect.inputField.nonempty) {
        if (!got.trim()) return false;
      } else if (expect.inputField.value != null && got !== expect.inputField.value) {
        return false;
      }
    }
    return true;
  });
}

export const TUTORIALS: Tutorial[] = [
  {
    id: "hello",
    level: "basic",
    title: "Hello, Avatar!",
    blurb: "Empty workspace. You drop the hat, then two chat bricks, then paste.",
    minutes: 6,
    startEmpty: true,
    steps: [
      {
        title: "The yellow hat",
        toolbox: "Events",
        do: "Open Events. Drag touch_start onto the workspace. Leave the state field on default.",
        why: "A script does nothing until an event fires. touch_start is a click. LSL requires a state named default, and it has to be first in the file — that's why the field exists.",
        expect: { type: "lsl_event_touch_start", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Say it in public",
        toolbox: "Chat",
        do: "Open Chat. Drag say under the hat until it clicks. Type Hello, Avatar! in the message. Leave the channel at 0.",
        why: "Channel 0 is Nearby, about 20 metres. That's what people expect from a greeter. Negative channels are for scripts talking to scripts and do not show in chat.",
        expect: {
          type: "lsl_fn_llSay",
          root: "lsl_event_touch_start",
          inputField: { input: "MSG", field: "TEXT", nonempty: true },
        },
      },
      {
        title: "A private confirm",
        toolbox: "Chat",
        do: "Still in Chat, drag owner-say under the say brick. Type Touched. or whatever you want.",
        why: "llOwnerSay only the owner hears, and only if you're in the same region. Visitors get the public hello; you get a debug line. That's the usual pair.",
        expect: { type: "lsl_fn_llOwnerSay", root: "lsl_event_touch_start" },
      },
      {
        title: "Paste it",
        do: "Look at the right panel. You should see default { touch_start(integer num_detected) { llSay… llOwnerSay… } }. Copy. In SL: right-click a box → Build → Content → New Script. Select all, paste, Save. Touch the box.",
        why: "The panel is the compiler output, not a sketch. If default is missing or a second event is sitting on the floor, don't paste.",
      },
    ],
  },
  {
    id: "edit-text",
    level: "basic",
    title: "Change the text and the channel",
    blurb: "Click a field. Watch the LSL update.",
    minutes: 4,
    exampleId: "greeter",
    steps: [
      {
        title: "The message is a field",
        do: "The greeter is already loaded. Click Hello, Avatar! on the say brick and type something else. Watch the right panel follow you.",
        why: "That field is the string literal. No extra quotes — the compiler adds them and escapes for you.",
        expect: { type: "lsl_fn_llSay" },
      },
      {
        title: "Channel 0 vs negative",
        do: "The channel socket is 0. Leave it, or put -42 if you want this silent to avatars. Don't use llRegionSay on 0 — the editor flags that as an error.",
        why: "0 = public. Negative = script bus. Region-say on 0 is illegal in LSL, not just rude.",
        expect: { type: "lsl_fn_llSay" },
      },
    ],
  },
  {
    id: "hover-text",
    level: "basic",
    title: "Hover text over the prim",
    blurb: "Looks → set hover text. Colors are 0–1, not 0–255.",
    minutes: 5,
    exampleId: "greeter",
    steps: [
      {
        title: "Drag from Looks",
        toolbox: "Looks",
        do: "Open Looks. Drag set hover text under the owner-say brick until it clicks.",
        why: "llSetText lives on the prim until you set it to an empty string. It is not chat. It is a floating label.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_touch_start" },
      },
      {
        title: "Color is a vector",
        do: "The color socket is a named color brick. White is <1, 1, 1>. If you build your own vector, 255 will look like a blown-out sun — LSL is 0.0 to 1.0.",
        why: "That's the wiki. Photoshop numbers are the wrong space.",
        expect: { type: "lsl_fn_llSetText" },
      },
    ],
  },
  {
    id: "owner-vs-public",
    level: "basic",
    title: "Owner-only vs everyone",
    blurb: "llOwnerSay is quiet. llSay is 20 m.",
    minutes: 4,
    exampleId: "greeter",
    steps: [
      {
        title: "Read the stack",
        do: "You already have public say + owner say. That's the pattern. Chat also has whisper (10 m), shout (100 m), region-say (whole region, not on channel 0).",
        why: "llOwnerSay dies if you walk to the next sim. Public say does not care who owns the prim, only range.",
        expect: { type: "lsl_fn_llOwnerSay" },
      },
    ],
  },
  {
    id: "timer-counter",
    level: "intermediate",
    title: "Count on a timer",
    blurb: "A typed global, state_entry starts the clock, timer ticks.",
    minutes: 7,
    startEmpty: true,
    steps: [
      {
        title: "Make count",
        toolbox: "Variables",
        do: "Open Variables → Create variable… Name it count, type integer. Then drag set count under a state_entry hat — grab state_entry from Events first, state default.",
        why: "Variables become globals at the top of the script, integer count = 0. You cannot declare them inside the event in PrimBlocks; that's on purpose, it matches how most SL scripts are written.",
        expect: { type: "lsl_event_state_entry", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Start the clock",
        toolbox: "World",
        do: "World (or look for set timer). Drag set timer event under state_entry. Put 1.0 in the seconds. Not 0.001 — that warns because a sim frame is ~0.022 s.",
        why: "llSetTimerEvent(1.0) fires the timer hat every second. 0.0 stops it. Faster than a frame still compiles; the sim will not honor it.",
        expect: { type: "lsl_fn_llSetTimerEvent", root: "lsl_event_state_entry" },
      },
      {
        title: "The tick",
        toolbox: "Events",
        do: "Events → timer. Snap change count by 1 under it, then set hover text to (string)count. The cast brick is in Operators. Hover text wants a string; an integer will not snap.",
        why: "timer() has no parameters. Cast is required — LSL will not stringify for you. That's a compile error if you skip it.",
        expect: { type: "lsl_event_timer" },
      },
    ],
  },
  {
    id: "owner-commands",
    level: "intermediate",
    title: "Listen for owner commands",
    blurb: "Negative channel, filter to the owner, if on the message.",
    minutes: 7,
    exampleId: "listen",
    steps: [
      {
        title: "Why the listen is in state_entry",
        toolbox: "Events",
        do: "Look at state_entry. That's where llListen is armed. Channel is negative. The key filter is llGetOwner.",
        why: "A listen handle is per-state. If you never call llListen, listen() never fires. Filtering to the owner means strangers on that channel are ignored by the sim, not by your if.",
        expect: { type: "lsl_fn_llListen", root: "lsl_event_state_entry" },
      },
      {
        title: "The four listen values",
        do: "The listen hat has channel, name, id, message. The if bricks compare message to spin and stop. Don't rename those sockets — those are the official parameter names.",
        why: "Using the wrong name is a compile error. The Sensing → event value brick is how you read them.",
        expect: { type: "lsl_event_listen" },
      },
    ],
  },
  {
    id: "two-state-door",
    level: "intermediate",
    title: "A door with two states",
    blurb: "default is closed. Touch flips to open.",
    minutes: 7,
    exampleId: "door",
    steps: [
      {
        title: "default first",
        do: "Two yellow hats. One says default, one says open. The LSL panel must print default { … } first. If open is on top, don't paste.",
        why: "That's a compiler error in SL, not a style choice. PrimBlocks sorts default to the front on purpose.",
        expect: { type: "lsl_event_touch_start", field: { name: "STATE", value: "default" } },
      },
      {
        title: "state open is a statement",
        toolbox: "Control",
        do: "The last brick under the closed touch is change state. That's not a function. Don't put it inside a user-function brick — LSL forbids it.",
        why: "Leaving a state dumps listens, sensors, and timers. This door doesn't have any, so it survives. Next tutorial is the one that bites.",
        expect: { type: "lsl_state_change" },
      },
    ],
  },
  {
    id: "cables-wire",
    level: "intermediate",
    title: "Wire a value between groups",
    blurb: "Send along a named cable, receive it somewhere else. Noodle draws itself.",
    minutes: 8,
    startEmpty: true,
    steps: [
      {
        title: "A hat to sit under",
        toolbox: "Events",
        do: "Events → touch_start, state default.",
        why: "Cables compile to globals, but the send still has to run inside an event or it never writes.",
        expect: { type: "lsl_event_touch_start", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Frame the first group",
        toolbox: "Cables",
        do: "Cables → group. Name it greet. Snap it under the hat.",
        why: "The group brick is a frame. It emits a comment, not extra LSL. Use it when a stack is doing one job.",
        expect: { type: "lsl_group", field: { name: "NAME", value: "greet" }, root: "lsl_event_touch_start" },
      },
      {
        title: "Send the name",
        toolbox: "Cables",
        do: "Inside that group, drop send along. Name the cable av. Plug detected name (Sensing, index 0) into the value socket.",
        why: "llDetectedName is only legal in touch / collision / sensor. The cable name is the socket on both ends. Matching names draw the noodle.",
        expect: { type: "lsl_cable_send", field: { name: "CABLE", value: "av" } },
      },
      {
        title: "Receive it on say",
        toolbox: "Cables",
        do: "Under the group (still in the hat), drop say. Delete the default string if you need the socket empty, then plug along av into the message. The noodle should appear.",
        why: "Receive is a value brick. It reads the last send on that name. Compiled as string cbl_av = \"\"; then cbl_av = llDetectedName(0); llSay(0, cbl_av);",
        expect: { type: "lsl_cable_recv", field: { name: "CABLE", value: "av" } },
      },
    ],
  },
  {
    id: "touch-dialog",
    level: "intermediate",
    title: "A dialog with buttons",
    blurb: "llDialog to the toucher. 1 second forced delay.",
    minutes: 6,
    exampleId: "dialog",
    steps: [
      {
        title: "Who gets the box",
        do: "Touch uses llDetectedKey(0) as the avatar the dialog is sent to. Buttons are a list, 1–12, 24 bytes each.",
        why: "A thirteenth button is dropped in-world. The editor warns. The sim does not error.",
        expect: { type: "lsl_fn_llDialog" },
      },
      {
        title: "The delay is real",
        do: "Read the yellow strip. llDialog sleeps this script 1 second. Don't stack five of them in one event.",
        why: "Forced delays are why vendors use timers. The script still compiles. The sim is what actually sleeps.",
        expect: { type: "lsl_fn_llDialog" },
      },
    ],
  },
  {
    id: "sensor-greeter",
    level: "advanced",
    title: "Greet whoever walks up",
    blurb: "llSensorRepeat, AGENT, range cap 96 m.",
    minutes: 6,
    exampleId: "sensor",
    steps: [
      {
        title: "Arm it in state_entry",
        do: "state_entry starts llSensorRepeat. Type AGENT, 8 metres, PI arc (a sphere), every 5 seconds.",
        why: "96 m is the cap — type 200 and you get a warning. The sim clamps. Repeating sensors die on state change, same as listens.",
        expect: { type: "lsl_fn_llSensorRepeat", root: "lsl_event_state_entry" },
      },
      {
        title: "Hits are nearest-first",
        do: "The sensor hat has num_detected. Use llDetectedName(0) inside that hat only. It is empty in a timer.",
        why: "Max 16 hits. no_sensor is optional if you want a nobody-here hover.",
        expect: { type: "lsl_event_sensor" },
      },
    ],
  },
  {
    id: "notecard-config",
    level: "advanced",
    title: "Config on a notecard",
    blurb: "Inventory check, NAK, EOF, CHANGED_INVENTORY.",
    minutes: 9,
    exampleId: "notecard",
    openNotecard: true,
    steps: [
      {
        title: "The hat is not an event",
        do: "The World hat injects nc_start_config(), dataserver, and changed so you still have one handler per event. Don't add a second dataserver hat.",
        why: "LSL allows one dataserver per state. Two would be a compile error. The generator merges on purpose.",
        expect: { type: "lsl_notecard_read" },
      },
      {
        title: "The card has to exist",
        do: "Notecard panel: inventory name config. Copy, in SL New Note, paste, name it config, drop it in the same prim as the script.",
        why: "Wrong name → llGetInventoryType is not INVENTORY_NOTECARD → the reader bails. That's the bug everyone hits.",
        expect: { type: "lsl_notecard_read", field: { name: "NAME", value: "config" } },
      },
      {
        title: "Don't touch until ready",
        do: "touch_start waits on nc_ready_config. If you click during the 0.1s-per-line read, nothing happens. That's on purpose.",
        why: "Changing state mid-read dumps the event queue. You never see EOF and ready stays false forever.",
        expect: { type: "lsl_nc_ready" },
      },
    ],
  },
  {
    id: "state-clears-listens",
    level: "advanced",
    title: "State change kills listens",
    blurb: "Re-arm in the new state's state_entry.",
    minutes: 5,
    exampleId: "door",
    steps: [
      {
        title: "This door is lucky",
        do: "The door survives state change because it doesn't listen. Imagine you added llListen in default.",
        why: "state open; leaves default, dumps the queue, forgets every listen / sensor / timer. The new state's state_entry has to call llListen again.",
        expect: { type: "lsl_state_change" },
      },
    ],
  },
  {
    id: "delays-and-sleep",
    level: "advanced",
    title: "Forced delays vs a frozen script",
    blurb: "IM 2 s. Dialog 1 s. Sleep freezes everything.",
    minutes: 5,
    exampleId: "dialog",
    steps: [
      {
        title: "Read the yellow strip",
        do: "llDialog is 1 s. llInstantMessage is 2 s. llSetPos on an unattached root is 0.2 s. The script still emits.",
        why: "The sim sleeps. Other events wait in a 64-deep queue. Prefer llSetLinkPrimitiveParamsFast for bulk PRIM_* — no that delay.",
        expect: { type: "lsl_fn_llDialog" },
      },
    ],
  },
  {
    id: "notecard-acl",
    level: "expert",
    title: "Access list from a notecard",
    blurb: "Raw lines (no =). Don't change state mid-read.",
    minutes: 8,
    exampleId: "notecard",
    openNotecard: true,
    steps: [
      {
        title: "Format",
        do: "key = value for settings. A line with no equals is a raw name (access lists). # and // comments. 255 UTF-8 bytes or the sim truncates — the panel warns first.",
        why: "Build the card here so you don't debug truncation in-world.",
        expect: { type: "lsl_notecard_read" },
      },
    ],
  },
  {
    id: "types-that-fail",
    level: "expert",
    title: "The snaps LSL will reject",
    blurb: "If the brick won't click, the compiler wouldn't either.",
    minutes: 6,
    startEmpty: true,
    steps: [
      {
        title: "Try a bad snap",
        toolbox: "Operators",
        do: "Drop an if from Control. Try to plug a float number into the condition — it should refuse. Plug an integer or TRUE instead.",
        why: "if conditions are integer. Float does not coerce. String + number needs (string)n. Lists cannot contain lists. That's the connection checker, not a suggestion.",
        expect: { type: "lsl_if" },
      },
    ],
  },
  {
    id: "one-handler",
    level: "expert",
    title: "One handler, no state in functions",
    blurb: "One touch_start per state. Functions cannot state foo;",
    minutes: 5,
    exampleId: "door",
    steps: [
      {
        title: "Two hats, one kept",
        do: "If you drop a second touch_start in default, the generator keeps the first and notes the drop in the header comments.",
        why: "LSL allows one handler per event per state. Merge the bodies yourself.",
        expect: { type: "lsl_event_touch_start" },
      },
    ],
  },
  {
    id: "raw-escape",
    level: "expert",
    title: "When to use a raw LSL brick",
    blurb: "Vehicles, JSON, jump. Catalog is not the wiki.",
    minutes: 4,
    startEmpty: true,
    steps: [
      {
        title: "The escape hatch",
        toolbox: "Control",
        do: "Control has a raw statement brick. Type real LSL in it. The type checker will not save you.",
        why: "Missing on purpose: vehicles, KFM, llJson*, HMAC, pathfinding. Hover a catalog brick for the wiki signature. If the tooltip is empty, functions.ts is the bug.",
        expect: { type: "lsl_raw_stmt" },
      },
    ],
  },
];

export function tutorialsFor(level: TutorialLevel): Tutorial[] {
  return TUTORIALS.filter((t) => t.level === level);
}

export function tutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find((t) => t.id === id);
}
