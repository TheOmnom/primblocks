import type { Workspace } from "blockly/core";
import type { ExampleId } from "@/lib/lsl/examples";

export type TutorialLevel = "basic" | "intermediate" | "advanced" | "expert";

export type StepExpect = {
  type?: string;
  root?: string;
  field?: { name: string; value: string };
  inputField?: { input: string; field: string; value?: string; nonempty?: boolean; not?: string };
  variable?: { name: string };
};

export type TutorialStep = {
  title: string;
  do: string;
  why: string;
  toolbox?: string;
  /** Left-list category → brick name as it is printed on the brick. */
  find?: string[];
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
  { id: "basic", label: "Basic", hint: "Hats, land-drop, paste" },
  { id: "intermediate", label: "Intermediate", hint: "Timers, tip jars, wearables" },
  { id: "advanced", label: "Advanced", hint: "Worn+placed, sensors, notecards" },
  { id: "expert", label: "Expert", hint: "Debit, split tips, the stuff that fails" },
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
  if (expect.variable) {
    const want = expect.variable.name.toLowerCase();
    const hit = workspace
      .getVariableMap()
      .getAllVariables()
      .some((v) => v.getName().toLowerCase() === want);
    if (!hit) return false;
    if (!expect.type) return true;
  }
  if (!expect.type) return true;
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
      if (expect.inputField.nonempty && !got.trim()) return false;
      if (expect.inputField.value != null && got !== expect.inputField.value) return false;
      if (expect.inputField.not != null && got === expect.inputField.not) return false;
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
    minutes: 8,
    startEmpty: true,
    steps: [
      {
        title: "Drop the yellow hat",
        toolbox: "Events",
        find: ["Events → when touched"],
        do: "Events is already open. The yellow brick that says when touched is the one. Drag it onto the empty grid. Leave the state field on default. Don't snap anything under it yet.",
        why: "A script does nothing until an event fires. when touched is a click. LSL requires a state named default, and it has to be first in the file — that's why the field exists.",
        expect: { type: "lsl_event_touch_start", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Say it in public",
        toolbox: "Chat",
        find: ["Chat → say … on channel …"],
        do: "Click Chat in the left list. Grab say … on channel … (not owner-say, not IM). Snap it into the mouth of the hat until it clicks. Type Hello, Avatar! in the message. Leave the channel at 0.",
        why: "Channel 0 is Nearby, about 20 metres. Negative channels are a script bus and do not show in chat.",
        expect: {
          type: "lsl_fn_llSay",
          root: "lsl_event_touch_start",
          inputField: { input: "MSG", field: "TEXT", nonempty: true },
        },
      },
      {
        title: "A private confirm",
        toolbox: "Chat",
        find: ["Chat → owner-say"],
        do: "Still in Chat. Grab owner-say (one socket, no channel). Snap it under the say brick, not next to the hat. Type Touched. or anything you want.",
        why: "llOwnerSay only the owner hears, and only in the same region. Visitors get the public hello; you get a debug line. That's the usual pair.",
        expect: { type: "lsl_fn_llOwnerSay", root: "lsl_event_touch_start" },
      },
      {
        title: "Paste it in-world",
        do: "Right panel should show default { touch_start(integer num_detected) { llSay… llOwnerSay… } }. Copy. In SL: right-click a box → Build → Content → New Script. Select all, paste, Save. Touch the box.",
        why: "The panel is the compiler output, not a sketch. If default is missing or a brick is sitting on the floor, don't paste.",
      },
    ],
  },
  {
    id: "edit-text",
    level: "basic",
    title: "Change the text",
    blurb: "You build a say brick, then click the field. The LSL follows.",
    minutes: 6,
    startEmpty: true,
    steps: [
      {
        title: "Hat first",
        toolbox: "Events",
        find: ["Events → when touched"],
        do: "Left list → Events. Grab the yellow when touched hat. Drop it on the grid. State stays default.",
        why: "Same as last time. Every walkthrough starts empty so you place the brick, not just read about it.",
        expect: { type: "lsl_event_touch_start", field: { name: "STATE", value: "default" } },
      },
      {
        title: "A say brick",
        toolbox: "Chat",
        find: ["Chat → say … on channel …"],
        do: "Left list → Chat. Grab say … on channel … and snap it under the hat.",
        why: "The message socket is a string brick. Clicking the text is how you edit — there is no separate properties panel.",
        expect: { type: "lsl_fn_llSay", root: "lsl_event_touch_start" },
      },
      {
        title: "Type something else",
        do: "Click the message on that say brick (probably Hello, Avatar!) and replace it with Hi. Watch the right panel update as you type.",
        why: "No extra quotes. The compiler adds them and escapes for you. If you type a quote it becomes \\\".",
        expect: {
          type: "lsl_fn_llSay",
          inputField: { input: "MSG", field: "TEXT", not: "Hello, Avatar!" },
        },
      },
    ],
  },
  {
    id: "hover-text",
    level: "basic",
    title: "Hover text over the prim",
    blurb: "Looks → set hover text. Colors are 0–1, not 0–255.",
    minutes: 7,
    startEmpty: true,
    steps: [
      {
        title: "Hat",
        toolbox: "Events",
        find: ["Events → when touched"],
        do: "Left list → Events. Grab when touched. State default.",
        why: "Hover text is a command. It has to live under an event or it never runs.",
        expect: { type: "lsl_event_touch_start" },
      },
      {
        title: "Set hover text",
        toolbox: "Looks",
        find: ["Looks → set hover text"],
        do: "Left list → Looks. Grab set hover text (color / alpha sockets on the same brick). Snap it under the hat. Type a short label.",
        why: "llSetText lives on the prim until you set it to an empty string. It is not chat. It is a floating label.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_touch_start" },
      },
      {
        title: "Color is 0 to 1",
        toolbox: "Looks",
        find: ["Looks → color"],
        do: "The color socket on set hover text already has a color brick (Looks → color, the named dropdown: white, red, yellow…). White is <1, 1, 1>. If you build your own vector, 255 will look like a blown-out sun.",
        why: "LSL colors are vectors of 0.0–1.0. Photoshop 255 is the wrong space. That's the wiki, not a style choice.",
        expect: { type: "lsl_fn_llSetText" },
      },
    ],
  },
  {
    id: "timer-counter",
    level: "intermediate",
    title: "Count on a timer",
    blurb: "A typed global, state_entry starts the clock, timer ticks.",
    minutes: 10,
    startEmpty: true,
    steps: [
      {
        title: "Make count",
        toolbox: "Variables",
        find: ["Variables → Create variable…"],
        do: "Left list → Variables. The button at the top says Create variable…. Name it count. Type integer. OK. The flyout should then show get count / set count / change count by.",
        why: "Variables become globals at the top of the script: integer count = 0; You do not declare them inside the event.",
        expect: { variable: { name: "count" } },
      },
      {
        title: "state_entry hat",
        toolbox: "Events",
        find: ["Events → when entering state"],
        do: "Left list → Events. Grab when entering state (first yellow hat in that list). State default. That's the hat that runs when the script starts or the prim rezs.",
        why: "Timers are armed here. If you arm them in when touched, they don't start until someone clicks.",
        expect: { type: "lsl_event_state_entry", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Start the clock",
        toolbox: "World",
        find: ["World → set timer every … seconds"],
        do: "Left list → World. Grab set timer every … seconds. Snap it under when entering state. Put 1 in the seconds. Not 0.001 — that warns because a sim frame is ~0.022 s.",
        why: "llSetTimerEvent(1.0) fires the timer hat every second. 0.0 stops it. Faster than a frame still compiles; the sim will not honor it.",
        expect: { type: "lsl_fn_llSetTimerEvent", root: "lsl_event_state_entry" },
      },
      {
        title: "The tick hat",
        toolbox: "Events",
        find: ["Events → when timer fires"],
        do: "Left list → Events. Grab when timer fires. Drop it next to when entering state, not inside it. State default.",
        why: "timer() has no parameters. It is a separate event. Two hats, one script.",
        expect: { type: "lsl_event_timer" },
      },
      {
        title: "Bump the counter",
        toolbox: "Variables",
        find: ["Variables → change count by"],
        do: "Left list → Variables. After you created count, that flyout offers change count by. Snap that under when timer fires. Delta 1.",
        why: "That's count += 1. The hover-text brick wants a string, so next you'd cast (string)count — Operators has the (type) cast brick. The bundled Timer counter example does that if you want to peek after.",
        expect: { type: "lsl_change_var", root: "lsl_event_timer" },
      },
    ],
  },
  {
    id: "cables-wire",
    level: "intermediate",
    title: "Wire a value between groups",
    blurb: "Set a variable in one group, get it in another. The noodle draws itself.",
    minutes: 10,
    startEmpty: true,
    exampleId: "wired",
    steps: [
      {
        title: "A hat to sit under",
        toolbox: "Events",
        find: ["Events → when touched"],
        do: "Left list → Events. Grab when touched. State default.",
        why: "A write still has to run inside an event or it never happens. The noodle is just the picture of that write being read somewhere else.",
        expect: { type: "lsl_event_touch_start", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Make who",
        toolbox: "Variables",
        find: ["Variables → Create variable…"],
        do: "Left list → Variables. Create variable…. Name it who. Type string. OK.",
        why: "That becomes string who = \"\"; at the top of the script. Same as any other global — the noodle is drawn for you when you set it and get it.",
        expect: { variable: { name: "who" } },
      },
      {
        title: "Write the name",
        toolbox: "Control",
        find: ["Control → group", "Variables → set who to", "Sensing → detected name"],
        do: "Control → group, snap under the hat, name it detect. Inside: Variables → set who to. Value socket: Sensing → detected name, index 0.",
        why: "llDetectedName is only legal in touch / collision / sensor. Compiled as who = llDetectedName(0);",
        expect: { type: "lsl_set_var", root: "lsl_event_touch_start" },
      },
      {
        title: "Second group",
        toolbox: "Control",
        find: ["Control → group"],
        do: "Control → group again. Drop it under the first group (still in the hat). Name it greet.",
        why: "Two frames, one event. One group produces a value, the other consumes it.",
        expect: { type: "lsl_group", field: { name: "NAME", value: "greet" } },
      },
      {
        title: "Read it on say",
        toolbox: "Chat",
        find: ["Chat → say … on channel …", "Variables → who"],
        do: "Chat → say … on channel … inside greet. Plug Variables → who (the getter, not set who to) into the message socket. Delete the default string if it fights you. The noodle should appear on its own.",
        why: "That's llSay(0, who); — legal, pasteable. No extra cable brick. Set and get of the same name is the data link.",
        expect: { type: "lsl_get_var", root: "lsl_event_touch_start" },
      },
    ],
  },
  {
    id: "touch-dialog",
    level: "intermediate",
    title: "A color dialog",
    blurb: "Listen on a negative channel, dialog on touch, set color from the button.",
    minutes: 12,
    startEmpty: true,
    exampleId: "dialog",
    steps: [
      {
        title: "Arm a listen",
        toolbox: "Events",
        find: ["Events → when entering state", "Chat → listen on channel"],
        do: "Left list → Events, grab when entering state. State default. Then Chat → listen on channel (long brick: channel / name / key / message). Snap it under that hat. Channel −42. Leave name empty, key NULL_KEY, message empty.",
        why: "A listen handle is per-state. If you never call llListen, listen() never fires. Empty name / NULL_KEY / empty message = wildcard. Negative channel so the reply isn't public chat.",
        expect: { type: "lsl_fn_llListen", root: "lsl_event_state_entry" },
      },
      {
        title: "Touch opens the box",
        toolbox: "Events",
        find: ["Events → when touched", "Chat → dialog to", "Sensing → detected key"],
        do: "Events → when touched, next to the other hat, not inside it. Chat → dialog to (avatar / message / buttons / channel). Avatar socket: Sensing → detected key, index 0. Message Pick a color. Channel −42 again.",
        why: "llDialog goes to one avatar. llDetectedKey(0) is the toucher. Same channel as the listen or you never hear the click. 1 second forced delay — you'll see a yellow warning. That's real.",
        expect: { type: "lsl_fn_llDialog", root: "lsl_event_touch_start" },
      },
      {
        title: "Buttons are a list",
        toolbox: "Lists",
        find: ["Lists → [ a , b , c , d ]"],
        do: "Left list → Lists. Grab [ a , b , c , d ]. Plug it into dialog's buttons socket. Put string bricks Red, Green, Blue in the first three holes (Operators → a string, or type in the holes). Leave the fourth empty.",
        why: "1–12 buttons, 24 bytes each. A thirteenth is dropped in-world. The editor warns; the sim does not error.",
        expect: { type: "lsl_list", root: "lsl_event_touch_start" },
      },
      {
        title: "Hear the click",
        toolbox: "Events",
        find: [
          "Events → when chat heard",
          "Control → if",
          "Sensing → event value",
          "Looks → set color",
        ],
        do: "Events → when chat heard (not listen on channel — that was the arming call). State default. Control → if. Condition: Sensing → event value, pick message, compared to the string Red. Looks → set color … on face … on the then-branch.",
        why: "listen(integer channel, string name, key id, string message) — those four names are official. Using the wrong one is a compile error. The Color dialog example is the finished version if you get stuck.",
        expect: { type: "lsl_event_listen" },
      },
    ],
  },
  {
    id: "sensor-greeter",
    level: "advanced",
    title: "Greet whoever walks up",
    blurb: "llSensorRepeat, then a variable so the say brick doesn't nest the detect.",
    minutes: 10,
    startEmpty: true,
    exampleId: "wired-sensor",
    steps: [
      {
        title: "Arm it in state_entry",
        toolbox: "Events",
        find: ["Events → when entering state", "Sensing → repeat sensor"],
        do: "Left list → Events, grab when entering state. State default. Then Sensing → repeat sensor (name / key / type / range / arc / rate). Type AGENT (the dropdown), range 8, arc PI, rate 5.",
        why: "96 m is the cap — type 200 and you get a warning. Repeating sensors die on state change, same as listens.",
        expect: { type: "lsl_fn_llSensorRepeat", root: "lsl_event_state_entry" },
      },
      {
        title: "The sensor hat",
        toolbox: "Events",
        find: ["Events → when sensor detects"],
        do: "Left list → Events. Grab when sensor detects. Drop it beside when entering state, not inside it.",
        why: "Hits are nearest-first, max 16. llDetectedName is only legal in this hat (or touch / collision).",
        expect: { type: "lsl_event_sensor" },
      },
      {
        title: "Write the name",
        toolbox: "Variables",
        find: ["Variables → Create variable…", "Control → group", "Variables → set who to", "Sensing → detected name"],
        do: "Variables → Create variable…, name who, type string. Inside when sensor detects: Control → group named sense. Inside that, Variables → set who to, value = Sensing → detected name, index 0.",
        why: "Same pattern as the wired greeter, now in a sensor. The noodle is easier to read than a detect brick nested inside say.",
        expect: { type: "lsl_set_var", root: "lsl_event_sensor" },
      },
      {
        title: "Say what came in",
        toolbox: "Control",
        find: ["Control → group", "Chat → say … on channel …", "Variables → who"],
        do: "Second Control → group named greet, still under the sensor hat. Inside it: Chat → say … on channel …, message socket = Variables → who.",
        why: "Compiled as string who = \"\"; who = llDetectedName(0); llSay(0, who); Examples → Wired sensor is the finished stack.",
        expect: { type: "lsl_get_var" },
      },
    ],
  },
  {
    id: "notecard-config",
    level: "advanced",
    title: "Config on a notecard",
    blurb: "Inventory check, NAK, EOF, CHANGED_INVENTORY.",
    minutes: 10,
    startEmpty: true,
    exampleId: "notecard",
    openNotecard: true,
    steps: [
      {
        title: "The reader hat",
        toolbox: "World",
        find: ["World → read notecard"],
        do: "Left list → World. First brick in that list is read notecard. Name it config. State default. This is not an event — it injects nc_start_config(), dataserver, and changed.",
        why: "LSL allows one dataserver per state. Two would be a compile error. The generator merges on purpose.",
        expect: { type: "lsl_notecard_read", field: { name: "NAME", value: "config" } },
      },
      {
        title: "The card has to exist",
        do: "Notecard panel (already open): inventory name config. Copy, in SL New Note, paste, name it config, drop it in the same prim as the script.",
        why: "Wrong name → llGetInventoryType is not INVENTORY_NOTECARD → the reader bails. That's the bug everyone hits.",
        expect: { type: "lsl_notecard_read" },
      },
      {
        title: "Don't touch until ready",
        toolbox: "Events",
        find: [
          "Events → when touched",
          "Control → if",
          "World → notecard … ready",
          "Chat → say … on channel …",
          "Chat → owner-say",
        ],
        do: "Events → when touched. Control → if. Condition: World → notecard … ready, name config. Then-branch: Chat → say … on channel …. Else: Chat → owner-say still reading.",
        why: "If you click during the 0.1s-per-line read, ready is false. Changing state mid-read dumps the event queue and you never see EOF.",
        expect: { type: "lsl_nc_ready" },
      },
    ],
  },
  {
    id: "delays-and-sleep",
    level: "advanced",
    title: "Forced delays vs a frozen script",
    blurb: "Put a dialog down. Read the yellow strip. Don't stack five of them.",
    minutes: 6,
    startEmpty: true,
    steps: [
      {
        title: "A hat",
        toolbox: "Events",
        find: ["Events → when touched"],
        do: "Left list → Events. Grab when touched. State default.",
        why: "Delays are on the call, but they freeze the whole script until they finish.",
        expect: { type: "lsl_event_touch_start" },
      },
      {
        title: "Drop a dialog",
        toolbox: "Chat",
        find: ["Chat → dialog to", "Sensing → detected key"],
        do: "Left list → Chat. Grab dialog to. Snap it under the hat. Avatar socket: Sensing → detected key, index 0, so it isn't NULL_KEY. Look at the yellow warning on the brick and in the LSL panel.",
        why: "llDialog sleeps this script 1 second. llInstantMessage is 2 s. llSetPos on an unattached root is 0.2 s. The script still emits. Other events wait in a 64-deep queue.",
        expect: { type: "lsl_fn_llDialog" },
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
        title: "An if",
        toolbox: "Control",
        find: ["Events → when touched", "Control → if"],
        do: "You need a hat first: Events → when touched. Then Control → if (the first if, no else row). Snap it under the hat.",
        why: "if conditions are integer. TRUE / FALSE are 1 and 0.",
        expect: { type: "lsl_if", root: "lsl_event_touch_start" },
      },
      {
        title: "Try a bad snap",
        toolbox: "Operators",
        find: ["Operators → a float number", "Constants → true"],
        do: "Left list → Operators. Grab a float (the number brick with a decimal). Try to plug it into the if condition. It should refuse. Plug Constants → true, or an integer, instead.",
        why: "Float does not coerce to the condition. String + number needs (string)n. Lists cannot contain lists. That's the connection checker, not a suggestion.",
        expect: { type: "lsl_if" },
      },
    ],
  },
  {
    id: "two-groups",
    level: "expert",
    title: "Two values, two noodles",
    blurb: "Name and key on separate variables. Easy to mess up the names.",
    minutes: 8,
    startEmpty: true,
    exampleId: "wired-id",
    steps: [
      {
        title: "Hat",
        toolbox: "Events",
        find: ["Events → when touched"],
        do: "Left list → Events. Grab when touched. State default.",
        why: "Same as the wired greeter, now with two noodles. Examples → Wired name + key is the finished stack if you get stuck.",
        expect: { type: "lsl_event_touch_start" },
      },
      {
        title: "Write who",
        toolbox: "Variables",
        find: [
          "Variables → Create variable…",
          "Control → group",
          "Variables → set who to",
          "Sensing → detected name",
        ],
        do: "Create string who. Control → group named detect, snap under the hat. Inside: Variables → set who to, value = Sensing → detected name, index 0.",
        why: "Two variables, two names. If you reuse who for the key, the types fight and the noodle is lying.",
        expect: { type: "lsl_set_var", root: "lsl_event_touch_start" },
      },
      {
        title: "Write id",
        toolbox: "Variables",
        find: ["Variables → Create variable…", "Variables → set id to", "Sensing → detected key"],
        do: "Create key id. Still inside detect, under the first set: Variables → set id to. Value is Sensing → detected key, index 0. The second noodle shows up once greet reads it.",
        why: "Keys and strings are close in LSL (they coerce) but keeping them on separate variables matches what you'd do with two sockets on a node.",
        expect: { variable: { name: "id" } },
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
        title: "Hat + raw",
        toolbox: "Control",
        find: ["Events → when touched", "Control → raw LSL"],
        do: "Events → when touched. Then Control → raw LSL (it says raw LSL on the brick). Snap it under the hat. Type real LSL in it, e.g. llOwnerSay((string)llGetUnixTime());",
        why: "The type checker will not save you. Missing on purpose: vehicles, KFM, llJson*, HMAC. Combat 2.0 hats (on_damage, final_damage, on_death) and game_control are in Events. Hover a catalog brick for the wiki signature.",
        expect: { type: "lsl_raw_stmt", root: "lsl_event_touch_start" },
      },
    ],
  },
  {
    id: "place-on-land",
    level: "basic",
    title: "Drop it on land",
    blurb: "on_rez reset, hover on state_entry, touch greets. The usual box you rez and leave.",
    minutes: 10,
    startEmpty: true,
    exampleId: "placeable",
    steps: [
      {
        title: "Reset when it rezs",
        toolbox: "Events",
        find: ["Events → when rezzed", "World → reset this script"],
        do: "Left list → Events. Grab when rezzed. State default. Then World → reset this script, snap it under that hat.",
        why: "A placeable keeps whatever listens and timers it had last time it was in-world. llResetScript() on rez is the usual land-drop pattern so state_entry runs clean. start_param is ignored on purpose.",
        expect: { type: "lsl_fn_llResetScript", root: "lsl_event_on_rez" },
      },
      {
        title: "Hover so people see it",
        toolbox: "Events",
        find: ["Events → when entering state", "Looks → set hover text"],
        do: "Events → when entering state, next to when rezzed, not inside it. Looks → set hover text. Type Touch me.",
        why: "state_entry runs after the reset. Hover text lives on the prim until you clear it. Colors are 0–1.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_state_entry" },
      },
      {
        title: "Touch greets",
        toolbox: "Events",
        find: ["Events → when touched", "Chat → say … on channel …"],
        do: "Events → when touched, a third hat. Chat → say … on channel …, Hello, Avatar!, channel 0. Snap Chat → owner-say under it if you want a private confirm.",
        why: "Three hats, one default state. That is a complete placeable. Copy, New Script, paste, drop the prim on the ground, touch it.",
        expect: { type: "lsl_fn_llSay", root: "lsl_event_touch_start" },
      },
    ],
  },
  {
    id: "tip-jar",
    level: "intermediate",
    title: "A tip jar",
    blurb: "Pay pie, money event, running total on the hover. L$ goes to the owner — you do not need debit for that.",
    minutes: 16,
    startEmpty: true,
    exampleId: "tipjar",
    steps: [
      {
        title: "Make total",
        toolbox: "Variables",
        find: ["Variables → Create variable…"],
        do: "Left list → Variables. Button at the top: Create variable…. Name it total. Type integer. OK.",
        why: "The money event gives you amount for this pay only. A global is how you remember the sum across pays. integer total = 0; at the top of the script.",
        expect: { variable: { name: "total" } },
      },
      {
        title: "state_entry hat",
        toolbox: "Events",
        find: ["Events → when entering state"],
        do: "Left list → Events. Grab when entering state. State default. This is the setup hat, not the pay hat.",
        why: "llSetPayPrice and click action have to run once when the script starts. Doing them in money() works but wastes the first pay.",
        expect: { type: "lsl_event_state_entry", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Click action is Pay",
        toolbox: "Looks",
        find: ["Looks → set click action", "Constants → CLICK_ACTION_PAY"],
        do: "Left list → Looks. Grab set click action. Snap it under when entering state. The action socket is a dropdown brick — pick CLICK_ACTION_PAY (Constants has that same list if the socket is empty).",
        why: "Without this, left-click is still Touch. Pay is a pie slice unless you make it the default click. For Sale in the build window is a different thing — leave it off.",
        expect: { type: "lsl_fn_llSetClickAction", root: "lsl_event_state_entry" },
      },
      {
        title: "The pay pie",
        toolbox: "Looks",
        find: ["Looks → set pay price", "Constants → PAY_DEFAULT", "Lists → [ a , b , c , d ]"],
        do: "Looks → set pay price. Price socket: Constants → PAY_DEFAULT (dropdown on that brick). Buttons socket: Lists → [ a , b , c , d ] with integers 1, 5, 10, 20.",
        why: "PAY_DEFAULT shows the pie. PAY_HIDE hides it (useful on a HUD). Four quick amounts, each an integer L$. A fifth is ignored. This is not llGiveMoney — visitors are paying the object.",
        expect: { type: "lsl_fn_llSetPayPrice", root: "lsl_event_state_entry" },
      },
      {
        title: "Label it",
        toolbox: "Looks",
        find: ["Looks → set hover text"],
        do: "Still under when entering state, under the pay bricks: Looks → set hover text. Type Tip jar — L$0. Color can stay yellow-ish if you have Looks → color; white is fine.",
        why: "Hover is how people know it is a jar and not a random box. You will rewrite this text on every pay.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_state_entry" },
      },
      {
        title: "The money hat",
        toolbox: "Events",
        find: ["Events → when money received"],
        do: "Left list → Events. Grab when money received. Drop it next to when entering state, not inside it. State default. Signature is money(key id, integer amount) — those names are official.",
        why: "Fires when someone actually pays. id is the payer. amount is L$. You do not use llDetected* here — that family is for touch / collision / sensor. Sensing → event value is how you read amount and id.",
        expect: { type: "lsl_event_money" },
      },
      {
        title: "Add the amount",
        toolbox: "Variables",
        find: ["Variables → change total by", "Sensing → event value"],
        do: "Under when money received: Variables → change total by. Delta socket: Sensing → event value, pick amount (not a typed 1).",
        why: "That's total += amount. A hardcoded 1 would ignore a L$20 button. Event value amount only exists under this hat.",
        expect: { type: "lsl_change_var", root: "lsl_event_money" },
      },
      {
        title: "Say thanks",
        toolbox: "Chat",
        find: ["Chat → say … on channel …"],
        do: "Under that, Chat → say … on channel …, Thanks!, channel 0. Optionally Chat → owner-say a debug line so you see who paid when you are not looking at Nearby.",
        why: "Public thank is the usual jar. Channel 0, 20 m. The L$ already landed on the owner's account — this script is just the receipt.",
        expect: { type: "lsl_fn_llSay", root: "lsl_event_money" },
      },
      {
        title: "Rewrite the hover",
        toolbox: "Looks",
        find: ["Looks → set hover text", "Operators → (type) …", "Variables → get total"],
        do: "Under the say: Looks → set hover text. Message socket: Operators → the (type) cast brick, set to string, around Variables → get total. Not a typed L$0.",
        why: "LSL will not glue an integer onto a string. (string)total is the cast brick. Paste, Save, left-click Pay, pick 1. Hover should bump.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_money" },
      },
    ],
  },
  {
    id: "wear-hud",
    level: "intermediate",
    title: "Wear this HUD",
    blurb: "attach fires with the avatar key, NULL_KEY on detach. Owner-say only — worn things should not spam Nearby.",
    minutes: 12,
    startEmpty: true,
    exampleId: "wearable",
    steps: [
      {
        title: "The attach hat",
        toolbox: "Events",
        find: ["Events → when attached or detached"],
        do: "Left list → Events. Grab when attached or detached. State default. Parameter is key id — avatar when attaching, NULL_KEY when detaching.",
        why: "This is the wearable event. It is not when rezzed (that's the object appearing). A HUD, a ring, a collar: attach.",
        expect: { type: "lsl_event_attach", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Attached or not",
        toolbox: "Control",
        find: [
          "Control → if (the one with an else row)",
          "Operators → comparison",
          "Sensing → event value",
          "Constants → NULL_KEY",
        ],
        do: "Control → if — pick the second if, the one with an else row under it. Snap it under the hat. Condition: Operators → the comparison brick, pick ≠. Left: Sensing → event value, pick id. Right: Constants → NULL_KEY.",
        why: "id != NULL_KEY means it just went on. else is take-off. Using llDetected* here is empty data — wrong family.",
        expect: { type: "lsl_ifelse", root: "lsl_event_attach" },
      },
      {
        title: "Owner-say, not say",
        toolbox: "Chat",
        find: ["Chat → owner-say"],
        do: "Then-branch: Chat → owner-say HUD on. Else-branch: Chat → owner-say Detached. Do not use say … on channel … — a HUD that talks in public is a fast way to get muted.",
        why: "llOwnerSay is in-region, owner only. Visitors never hear it. That's the wearable default.",
        expect: { type: "lsl_fn_llOwnerSay", root: "lsl_event_attach" },
      },
      {
        title: "Reset on rez",
        toolbox: "Events",
        find: ["Events → when rezzed", "World → reset this script"],
        do: "Events → when rezzed, a second hat. World → reset this script under it.",
        why: "Wearing something rezs it on the attach point. Reset so state_entry can ask llGetAttached() and set up clean. Same idea as the land-drop, different event pairing.",
        expect: { type: "lsl_fn_llResetScript", root: "lsl_event_on_rez" },
      },
    ],
  },
  {
    id: "worn-or-placed",
    level: "advanced",
    title: "Worn and placed",
    blurb: "One script. Worn: private HUD. On land: public hover + say. Branch on llGetAttached.",
    minutes: 14,
    startEmpty: true,
    exampleId: "dual",
    steps: [
      {
        title: "Reset on rez",
        toolbox: "Events",
        find: ["Events → when rezzed", "World → reset this script"],
        do: "Events → when rezzed, state default, World → reset this script under it. Same as both previous walkthroughs.",
        why: "You do not know if the next rez is a wear or a drop. Reset, then ask.",
        expect: { type: "lsl_fn_llResetScript", root: "lsl_event_on_rez" },
      },
      {
        title: "Ask in state_entry",
        toolbox: "Events",
        find: [
          "Events → when entering state",
          "Control → if (the one with an else row)",
          "World → attach point",
        ],
        do: "Events → when entering state. Control → if — the second if, with an else row. Condition: World → attach point ≠ 0 (Operators → comparison, World → attach point on the left, integer 0 on the right).",
        why: "llGetAttached() is 0 on the ground, a HUD or body point otherwise. That's the branch. Do it in state_entry so it runs on every clean start.",
        expect: { type: "lsl_fn_llGetAttached", root: "lsl_event_state_entry" },
      },
      {
        title: "Two setups",
        toolbox: "Looks",
        find: ["Chat → owner-say", "Looks → set hover text"],
        do: "Then (worn): Chat → owner-say Ready (worn), and Looks → set hover text to an empty string so a HUD does not float world text. Else (placed): Looks → set hover text Touch me.",
        why: "Hover on a HUD is world-visible and looks like a bug. Empty string + alpha 0 is how you hide it. On land, hover is the whole point.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_state_entry" },
      },
      {
        title: "Touch does two jobs",
        toolbox: "Events",
        find: ["Events → when touched", "Chat → owner-say", "Chat → say … on channel …"],
        do: "Events → when touched. Same if: World → attach point ≠ 0. Then Chat → owner-say a private line. Else Chat → say … on channel … Hello, Avatar! on channel 0.",
        why: "One touch_start, two behaviours. Worn stays quiet. Placed greets. Copy this into a box, wear it as a HUD, then drop it on the ground and compare.",
        expect: { type: "lsl_event_touch_start" },
      },
    ],
  },
  {
    id: "tipjar-travels",
    level: "expert",
    title: "Tip jar that travels",
    blurb: "Placed: pay pie and public thanks. Worn: hide pay, HUD total only. Reset on new owner.",
    minutes: 14,
    startEmpty: true,
    exampleId: "tipjar-hud",
    steps: [
      {
        title: "Jar first",
        toolbox: "Variables",
        find: [
          "Variables → Create variable…",
          "Events → when entering state",
          "Looks → set click action",
          "Looks → set pay price",
          "Events → when money received",
        ],
        do: "Variables → Create variable…, integer total. Events → when entering state: Looks → set click action (CLICK_ACTION_PAY), Looks → set pay price (PAY_DEFAULT) with Lists → [ a , b , c , d ] as 1/5/10/20, Looks → set hover text Tip jar — L$0. Events → when money received: Variables → change total by amount, Chat → say … on channel … Thanks.",
        why: "Same bones as A tip jar. You are about to make the setup depend on worn vs placed. Get the money path compiling before you branch.",
        expect: { type: "lsl_event_money" },
      },
      {
        title: "Hide pay when worn",
        toolbox: "Events",
        find: [
          "Events → when attached or detached",
          "Control → if (the one with an else row)",
          "Looks → set pay price",
          "Constants → PAY_HIDE",
        ],
        do: "Events → when attached or detached. Control → if with an else row. Condition: Sensing → event value id ≠ Constants → NULL_KEY. Then: Looks → set pay price, dropdown PAY_HIDE (empty-ish buttons ok), Looks → set hover text empty. Else: PAY_DEFAULT and the Tip jar hover again.",
        why: "A HUD with a Pay pie is how you accidentally pay yourself in a crowd. PAY_HIDE removes the pie until it is on the ground again.",
        expect: { type: "lsl_event_attach" },
      },
      {
        title: "New owner, fresh total",
        toolbox: "Events",
        find: [
          "Events → when object changed",
          "Control → if",
          "Operators → bitwise",
          "Sensing → event value",
          "Constants → CHANGED_OWNER",
          "World → reset this script",
        ],
        do: "Events → when object changed. Control → if. Condition: Operators → the bitwise brick, pick &. Left: Sensing → event value, pick change. Right: Constants → CHANGED_OWNER. Body: World → reset this script.",
        why: "You sold the jar. total is still the old owner's sum. CHANGED_OWNER + reset is the usual cleanup. Flag tests are & , not &&.",
        expect: { type: "lsl_event_changed" },
      },
    ],
  },
  {
    id: "split-tips",
    level: "expert",
    title: "Split the tips",
    blurb: "Pay still lands on the owner. Debit permission, then llGiveMoney half to a partner. This is the one that fails if debit is missing.",
    minutes: 16,
    startEmpty: true,
    exampleId: "split-tips",
    steps: [
      {
        title: "Partner is a key",
        toolbox: "Variables",
        find: ["Variables → Create variable…"],
        do: "Left list → Variables → Create variable…. Name it partner, type key. Create another: integer total. You will paste a real avatar UUID into set partner later — NULL_KEY means 'don't send'.",
        why: "llGiveMoney wants a key, not a name. A string UUID needs (key)\"…\" if you type it; a key variable is cleaner. Don't put your own key if you just wanted a jar.",
        expect: { variable: { name: "partner" } },
      },
      {
        title: "Ask for debit",
        toolbox: "Events",
        find: [
          "Events → when entering state",
          "World → request permissions",
          "Sensing → owner key",
          "Constants → PERMISSION_DEBIT",
        ],
        do: "Events → when entering state. World → request permissions. Agent socket: Sensing → owner key. Bits socket: Constants → PERMISSION_DEBIT (dropdown on the permissions brick).",
        why: "Paying the object does not need debit. Giving L$ from the owner to someone else does. Only the owner can grant PERMISSION_DEBIT. The dialog appears unless the script is already trusted.",
        expect: { type: "lsl_fn_llRequestPermissions", root: "lsl_event_state_entry" },
      },
      {
        title: "Wait for the answer",
        toolbox: "Events",
        find: [
          "Events → when permissions granted",
          "Control → if",
          "Sensing → event value",
          "Constants → PERMISSION_DEBIT",
          "Chat → owner-say",
        ],
        do: "Events → when permissions granted. Control → if. Condition: Operators → bitwise &, left Sensing → event value perm, right Constants → PERMISSION_DEBIT. Then Chat → owner-say Debit granted. Else Chat → owner-say No debit — splits will not fire.",
        why: "Granting is async. Do not llGiveMoney in state_entry — perm is not there yet. This hat is the answer. Check the bit every time; don't assume.",
        expect: { type: "lsl_event_run_time_permissions" },
      },
      {
        title: "Pay pie + money",
        toolbox: "Looks",
        find: [
          "Looks → set click action",
          "Looks → set pay price",
          "Events → when money received",
          "Chat → say … on channel …",
        ],
        do: "Back in when entering state (under the request): Looks → set click action PAY, Looks → set pay price PAY_DEFAULT, Looks → set hover text. Then a new hat: Events → when money received. Variables → change total by amount, Chat → say … on channel … Thanks.",
        why: "Same jar as before. Split is an extra line, not a different pay path. L$ from the visitor already went to the owner before this event ran.",
        expect: { type: "lsl_event_money" },
      },
      {
        title: "Give half",
        toolbox: "World",
        find: ["World → give L$", "Variables → get partner", "Operators → arithmetic"],
        do: "Under the money thank-you: Control → if, partner is not NULL_KEY. Then World → give L$. Destination: Variables → get partner. Amount: Sensing → event value amount ÷ 2 (Operators → arithmetic, integers). The give brick is a statement — LSL lets you throw the return away.",
        why: "integer division. L$7 becomes 3. Odd lindens stay with the owner. No debit → the give fails silently-ish (check your statement). Paste, grant debit, pay L$10, partner should see L$5.",
        expect: { type: "lsl_fn_llGiveMoney", root: "lsl_event_money" },
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
