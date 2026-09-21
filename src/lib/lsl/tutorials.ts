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
        do: "Events is open. Drag touch_start onto the empty workspace. Leave the state field on default. Don't snap anything under it yet.",
        why: "A script does nothing until an event fires. touch_start is a click. LSL requires a state named default, and it has to be first in the file — that's why the field exists.",
        expect: { type: "lsl_event_touch_start", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Say it in public",
        toolbox: "Chat",
        do: "Drag say from Chat. Snap it into the mouth of the hat until it clicks. Type Hello, Avatar! in the message. Leave the channel at 0.",
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
        do: "Still in Chat, drag owner-say. Snap it under the say brick, not next to the hat. Type Touched. or anything you want.",
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
        do: "Drag touch_start onto the workspace. State stays default.",
        why: "Same as last time. Every walkthrough starts empty so you place the brick, not just read about it.",
        expect: { type: "lsl_event_touch_start", field: { name: "STATE", value: "default" } },
      },
      {
        title: "A say brick",
        toolbox: "Chat",
        do: "Drag say under the hat.",
        why: "The message socket is a string brick. Clicking the text is how you edit — there is no separate properties panel.",
        expect: { type: "lsl_fn_llSay", root: "lsl_event_touch_start" },
      },
      {
        title: "Type something else",
        do: "Click the message (probably Hello, Avatar!) and replace it with Hi. Watch the right panel update as you type.",
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
        do: "Drag touch_start. State default.",
        why: "Hover text is a command. It has to live under an event or it never runs.",
        expect: { type: "lsl_event_touch_start" },
      },
      {
        title: "Set hover text",
        toolbox: "Looks",
        do: "Looks → set hover text. Snap it under the hat. Type a short label.",
        why: "llSetText lives on the prim until you set it to an empty string. It is not chat. It is a floating label.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_touch_start" },
      },
      {
        title: "Color is 0 to 1",
        do: "The color socket is a named color brick (or a vector). White is <1, 1, 1>. If you build your own vector, 255 will look like a blown-out sun.",
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
        do: "Variables → Create variable…. Name it count. Type integer. OK. You should see get count / set count in the flyout.",
        why: "Variables become globals at the top of the script: integer count = 0; You do not declare them inside the event.",
        expect: { variable: { name: "count" } },
      },
      {
        title: "state_entry hat",
        toolbox: "Events",
        do: "Events → state_entry. State default. That's the hat that runs when the script starts or the prim rezs.",
        why: "Timers are armed here. If you arm them in touch_start, they don't start until someone clicks.",
        expect: { type: "lsl_event_state_entry", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Start the clock",
        toolbox: "World",
        do: "World → set timer every … seconds. Snap it under state_entry. Put 1 in the seconds. Not 0.001 — that warns because a sim frame is ~0.022 s.",
        why: "llSetTimerEvent(1.0) fires the timer hat every second. 0.0 stops it. Faster than a frame still compiles; the sim will not honor it.",
        expect: { type: "lsl_fn_llSetTimerEvent", root: "lsl_event_state_entry" },
      },
      {
        title: "The tick hat",
        toolbox: "Events",
        do: "Events → timer. Drop it next to state_entry, not inside it. State default.",
        why: "timer() has no parameters. It is a separate event. Two hats, one script.",
        expect: { type: "lsl_event_timer" },
      },
      {
        title: "Bump the counter",
        toolbox: "Variables",
        do: "Variables should now offer change count by. Snap that under the timer hat. Delta 1.",
        why: "That's count += 1. The hover-text brick wants a string, so next you'd cast (string)count — Operators has the cast brick. The bundled Timer counter example does that if you want to peek after.",
        expect: { type: "lsl_change_var", root: "lsl_event_timer" },
      },
    ],
  },
  {
    id: "cables-wire",
    level: "intermediate",
    title: "Wire a value between groups",
    blurb: "Send along a named cable, receive it somewhere else. Noodle draws itself.",
    minutes: 10,
    startEmpty: true,
    exampleId: "wired",
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
        do: "Cables → group. Snap it under the hat. Click the name and type detect.",
        why: "The group brick is a frame. It emits a comment, not extra LSL. Use it when a stack is doing one job.",
        expect: { type: "lsl_group", field: { name: "NAME", value: "detect" }, root: "lsl_event_touch_start" },
      },
      {
        title: "Send the name",
        toolbox: "Cables",
        do: "Inside that group, drop send along. Name the cable who. Sensing → detected name, index 0, plug that into the send's value socket.",
        why: "llDetectedName is only legal in touch / collision / sensor. Matching names on send and receive draw the noodle. Compiled as string cbl_who = \"\"; then an assignment.",
        expect: { type: "lsl_cable_send", field: { name: "CABLE", value: "who" } },
      },
      {
        title: "Second group",
        toolbox: "Cables",
        do: "Drop another group under the first one (still in the hat). Name it greet.",
        why: "Two frames, one event. That's the node-graph idea: one group produces a value, the other consumes it.",
        expect: { type: "lsl_group", field: { name: "NAME", value: "greet" } },
      },
      {
        title: "Receive it on say",
        toolbox: "Cables",
        do: "Inside greet, drop say. Plug along who (Cables) into the message socket. Delete the default string if it fights you. The noodle should appear.",
        why: "Receive is a value brick. It reads the last send on that name. The LSL is cbl_who = llDetectedName(0); llSay(0, cbl_who); — legal, pasteable.",
        expect: { type: "lsl_cable_recv", field: { name: "CABLE", value: "who" } },
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
        do: "Events → state_entry, state default. Chat → listen on channel. Snap it under the hat. Channel −42. Leave name empty, key NULL_KEY, message empty.",
        why: "A listen handle is per-state. If you never call llListen, listen() never fires. Empty name / NULL_KEY / empty message = wildcard. Negative channel so the reply isn't public chat.",
        expect: { type: "lsl_fn_llListen", root: "lsl_event_state_entry" },
      },
      {
        title: "Touch opens the box",
        toolbox: "Events",
        do: "Events → touch_start, next to the other hat, not inside it. Chat → dialog. Avatar socket: Sensing → detected key, 0. Message Pick a color. Channel −42 again.",
        why: "llDialog goes to one avatar. llDetectedKey(0) is the toucher. Same channel as the listen or you never hear the click. 1 second forced delay — you'll see a yellow warning. That's real.",
        expect: { type: "lsl_fn_llDialog", root: "lsl_event_touch_start" },
      },
      {
        title: "Buttons are a list",
        toolbox: "Lists",
        do: "Lists → the [ a, b, c, d ] brick. Plug it into dialog's buttons socket. Put string bricks Red, Green, Blue in the first three holes. Leave the fourth empty.",
        why: "1–12 buttons, 24 bytes each. A thirteenth is dropped in-world. The editor warns; the sim does not error.",
        expect: { type: "lsl_list", root: "lsl_event_touch_start" },
      },
      {
        title: "Hear the click",
        toolbox: "Events",
        do: "Events → listen. State default. Control → if. Condition: Sensing → event value message, compared to the string Red. Looks → set color on the then-branch.",
        why: "listen(integer channel, string name, key id, string message) — those four names are official. Using the wrong one is a compile error. The Color dialog example is the finished version if you get stuck.",
        expect: { type: "lsl_event_listen" },
      },
    ],
  },
  {
    id: "sensor-greeter",
    level: "advanced",
    title: "Greet whoever walks up",
    blurb: "llSensorRepeat, then a cable so the say brick doesn't nest the detect.",
    minutes: 10,
    startEmpty: true,
    exampleId: "wired-sensor",
    steps: [
      {
        title: "Arm it in state_entry",
        toolbox: "Events",
        do: "state_entry, default. Sensing or World → repeating sensor. Type AGENT, range 8, arc PI, rate 5.",
        why: "96 m is the cap — type 200 and you get a warning. Repeating sensors die on state change, same as listens.",
        expect: { type: "lsl_fn_llSensorRepeat", root: "lsl_event_state_entry" },
      },
      {
        title: "The sensor hat",
        toolbox: "Events",
        do: "Events → sensor. Drop it beside state_entry.",
        why: "Hits are nearest-first, max 16. llDetectedName is only legal in this hat (or touch / collision).",
        expect: { type: "lsl_event_sensor" },
      },
      {
        title: "Send the name along a cable",
        toolbox: "Cables",
        do: "Inside the sensor hat: group named sense, then send along who, value = detected name 0.",
        why: "Same pattern as the wired greeter, now in a sensor. The noodle is easier to read than a detect brick nested inside say.",
        expect: { type: "lsl_cable_send", field: { name: "CABLE", value: "who" }, root: "lsl_event_sensor" },
      },
      {
        title: "Say what came in",
        toolbox: "Cables",
        do: "Second group greet, say, message = along who.",
        why: "Compiled as string cbl_who = \"\"; cbl_who = llDetectedName(0); llSay(0, cbl_who); Examples → Wired sensor is the finished stack.",
        expect: { type: "lsl_cable_recv", field: { name: "CABLE", value: "who" } },
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
        do: "World → read notecard. Name it config. State default. This is not an event — it injects nc_start_config(), dataserver, and changed.",
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
        do: "touch_start. Control → if. Condition: World → notecard config ready. Then-branch: say. Else: owner-say still reading.",
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
        do: "touch_start, default.",
        why: "Delays are on the call, but they freeze the whole script until they finish.",
        expect: { type: "lsl_event_touch_start" },
      },
      {
        title: "Drop a dialog",
        toolbox: "Chat",
        do: "Chat → dialog, snap under the hat. Fill avatar with detected key 0 so it isn't NULL_KEY. Look at the yellow warning on the brick and in the LSL panel.",
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
        do: "You need a hat first: Events → touch_start, then Control → if under it.",
        why: "if conditions are integer. TRUE / FALSE are 1 and 0.",
        expect: { type: "lsl_if", root: "lsl_event_touch_start" },
      },
      {
        title: "Try a bad snap",
        toolbox: "Operators",
        do: "Operators → a float number. Try to plug it into the if condition. It should refuse. Plug TRUE (Constants) or an integer instead.",
        why: "Float does not coerce to the condition. String + number needs (string)n. Lists cannot contain lists. That's the connection checker, not a suggestion.",
        expect: { type: "lsl_if" },
      },
    ],
  },
  {
    id: "two-groups",
    level: "expert",
    title: "Two cables, two groups",
    blurb: "Name and key on separate cables. Easy to mess up the names.",
    minutes: 8,
    startEmpty: true,
    exampleId: "wired-id",
    steps: [
      {
        title: "Hat",
        toolbox: "Events",
        do: "touch_start, default.",
        why: "Same as the wired greeter, now with two noodles. Examples → Wired name + key is the finished stack if you get stuck.",
        expect: { type: "lsl_event_touch_start" },
      },
      {
        title: "Send who and id",
        toolbox: "Cables",
        do: "Group detect. send along who = detected name 0, then send along id = detected key 0 (Sensing) under that.",
        why: "Two sends, two names. If you reuse who for the key, the types fight and the noodle is lying.",
        expect: { type: "lsl_cable_send", field: { name: "CABLE", value: "who" } },
      },
      {
        title: "The other send",
        toolbox: "Cables",
        do: "The second send is named id. Value is detected key 0.",
        why: "Keys and strings are close in LSL (they coerce) but keeping them on separate cables matches what you'd do with two sockets on a node.",
        expect: { type: "lsl_cable_send", field: { name: "CABLE", value: "id" } },
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
        do: "touch_start, then Control → raw statement. Type real LSL in it, e.g. llOwnerSay((string)llGetUnixTime());",
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
        do: "Events → on_rez. State default. World → reset this script, snap it under the hat.",
        why: "A placeable keeps whatever listens and timers it had last time it was in-world. llResetScript() on rez is the usual land-drop pattern so state_entry runs clean. start_param is ignored on purpose.",
        expect: { type: "lsl_fn_llResetScript", root: "lsl_event_on_rez" },
      },
      {
        title: "Hover so people see it",
        toolbox: "Events",
        do: "Events → state_entry, next to on_rez, not inside it. Looks → set hover text. Type Touch me.",
        why: "state_entry runs after the reset. Hover text lives on the prim until you clear it. Colors are 0–1.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_state_entry" },
      },
      {
        title: "Touch greets",
        toolbox: "Events",
        do: "Events → touch_start, a third hat. Chat → say Hello, Avatar! on channel 0. Snap owner-say under it if you want a private confirm.",
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
        do: "Variables → Create variable…. Name it total. Type integer. OK.",
        why: "The money event gives you amount for this pay only. A global is how you remember the sum across pays. integer total = 0; at the top of the script.",
        expect: { variable: { name: "total" } },
      },
      {
        title: "state_entry hat",
        toolbox: "Events",
        do: "Events → state_entry. State default. This is the setup hat, not the pay hat.",
        why: "llSetPayPrice and click action have to run once when the script starts. Doing them in money() works but wastes the first pay.",
        expect: { type: "lsl_event_state_entry", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Click action is Pay",
        toolbox: "Looks",
        do: "Looks → set click action. Snap it under state_entry. Pick CLICK_ACTION_PAY.",
        why: "Without this, left-click is still Touch. Pay is a pie slice unless you make it the default click. For Sale in the build window is a different thing — leave it off.",
        expect: { type: "lsl_fn_llSetClickAction", root: "lsl_event_state_entry" },
      },
      {
        title: "The pay pie",
        toolbox: "Looks",
        do: "Looks → set pay price. Price socket: Constants → PAY_DEFAULT. Buttons socket: Lists → [ a, b, c, d ] with integers 1, 5, 10, 20.",
        why: "PAY_DEFAULT shows the pie. PAY_HIDE hides it (useful on a HUD). Four quick amounts, each an integer L$. A fifth is ignored. This is not llGiveMoney — visitors are paying the object.",
        expect: { type: "lsl_fn_llSetPayPrice", root: "lsl_event_state_entry" },
      },
      {
        title: "Label it",
        toolbox: "Looks",
        do: "Still under state_entry, under the pay bricks: set hover text. Type Tip jar — L$0. Color can stay yellow-ish if you have a named color; white is fine.",
        why: "Hover is how people know it is a jar and not a random box. You will rewrite this text on every pay.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_state_entry" },
      },
      {
        title: "The money hat",
        toolbox: "Events",
        do: "Events → money. Drop it next to state_entry, not inside it. State default. Signature is money(key id, integer amount) — those names are official.",
        why: "Fires when someone actually pays. id is the payer. amount is L$. You do not use llDetected* here — that family is for touch / collision / sensor. Sensing → event value is how you read amount and id.",
        expect: { type: "lsl_event_money" },
      },
      {
        title: "Add the amount",
        toolbox: "Variables",
        do: "Under the money hat: change total by. Delta socket: Sensing → event value → amount (not a typed 1).",
        why: "That's total += amount. A hardcoded 1 would ignore a L$20 button. Event value amount only exists under this hat.",
        expect: { type: "lsl_change_var", root: "lsl_event_money" },
      },
      {
        title: "Say thanks",
        toolbox: "Chat",
        do: "Under that, say Thanks! on channel 0. Optionally owner-say a debug line so you see who paid when you are not looking at Nearby.",
        why: "Public thank is the usual jar. Channel 0, 20 m. The L$ already landed on the owner's account — this script is just the receipt.",
        expect: { type: "lsl_fn_llSay", root: "lsl_event_money" },
      },
      {
        title: "Rewrite the hover",
        toolbox: "Looks",
        do: "Under the say: set hover text. Message socket: Operators → (string) around get total. Not a typed L$0.",
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
        do: "Events → attach. State default. Parameter is key id — avatar when attaching, NULL_KEY when detaching.",
        why: "This is the wearable event. It is not on_rez (that's the object appearing). A HUD, a ring, a collar: attach.",
        expect: { type: "lsl_event_attach", field: { name: "STATE", value: "default" } },
      },
      {
        title: "Attached or not",
        toolbox: "Control",
        do: "Control → if / else under the hat. Condition: Operators → ≠ . Left: Sensing → event value id. Right: Constants → NULL_KEY.",
        why: "id != NULL_KEY means it just went on. else is take-off. Using llDetected* here is empty data — wrong family.",
        expect: { type: "lsl_ifelse", root: "lsl_event_attach" },
      },
      {
        title: "Owner-say, not say",
        toolbox: "Chat",
        do: "Then-branch: owner-say HUD on. Else-branch: owner-say Detached. Do not use Nearby say — a HUD that talks in public is a fast way to get muted.",
        why: "llOwnerSay is in-region, owner only. Visitors never hear it. That's the wearable default.",
        expect: { type: "lsl_fn_llOwnerSay", root: "lsl_event_attach" },
      },
      {
        title: "Reset on rez",
        toolbox: "Events",
        do: "Events → on_rez, a second hat. World → reset this script.",
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
        do: "on_rez, default, reset this script. Same as both previous walkthroughs.",
        why: "You do not know if the next rez is a wear or a drop. Reset, then ask.",
        expect: { type: "lsl_fn_llResetScript", root: "lsl_event_on_rez" },
      },
      {
        title: "Ask in state_entry",
        toolbox: "Events",
        do: "state_entry. Control → if / else. Condition: attach point (World / Sensing → llGetAttached) ≠ 0.",
        why: "llGetAttached() is 0 on the ground, a HUD or body point otherwise. That's the branch. Do it in state_entry so it runs on every clean start.",
        expect: { type: "lsl_fn_llGetAttached", root: "lsl_event_state_entry" },
      },
      {
        title: "Two setups",
        toolbox: "Looks",
        do: "Then (worn): owner-say Ready (worn), and set hover text to an empty string so a HUD does not float world text. Else (placed): set hover text Touch me.",
        why: "Hover on a HUD is world-visible and looks like a bug. Empty string + alpha 0 is how you hide it. On land, hover is the whole point.",
        expect: { type: "lsl_fn_llSetText", root: "lsl_event_state_entry" },
      },
      {
        title: "Touch does two jobs",
        toolbox: "Events",
        do: "touch_start. Same if: attach point ≠ 0. Then owner-say a private line. Else say Hello, Avatar! on channel 0.",
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
        do: "Create integer total. state_entry: click action PAY, pay price PAY_DEFAULT with 1/5/10/20, hover Tip jar — L$0. money: change total by amount, say Thanks.",
        why: "Same bones as A tip jar. You are about to make the setup depend on worn vs placed. Get the money path compiling before you branch.",
        expect: { type: "lsl_event_money" },
      },
      {
        title: "Hide pay when worn",
        toolbox: "Events",
        do: "attach hat. if id ≠ NULL_KEY: set pay price PAY_HIDE (empty-ish buttons ok), hover empty. else: PAY_DEFAULT and the Tip jar hover again.",
        why: "A HUD with a Pay pie is how you accidentally pay yourself in a crowd. PAY_HIDE removes the pie until it is on the ground again.",
        expect: { type: "lsl_event_attach" },
      },
      {
        title: "New owner, fresh total",
        toolbox: "Events",
        do: "Events → changed. Control → if. Condition: bit and of event value change and Constants → CHANGED_OWNER. Body: reset this script.",
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
        do: "Create variable partner, type key. Create integer total too. You will paste a real avatar UUID into set partner later — NULL_KEY means 'don't send'.",
        why: "llGiveMoney wants a key, not a name. A string UUID needs (key)\"…\" if you type it; a key variable is cleaner. Don't put your own key if you just wanted a jar.",
        expect: { variable: { name: "partner" } },
      },
      {
        title: "Ask for debit",
        toolbox: "Events",
        do: "state_entry. World → request permissions. Agent: Sensing → owner key. Bits: Constants → PERMISSION_DEBIT.",
        why: "Paying the object does not need debit. Giving L$ from the owner to someone else does. Only the owner can grant PERMISSION_DEBIT. The dialog appears unless the script is already trusted.",
        expect: { type: "lsl_fn_llRequestPermissions", root: "lsl_event_state_entry" },
      },
      {
        title: "Wait for the answer",
        toolbox: "Events",
        do: "Events → run_time_permissions. if: bit and of event value perm and PERMISSION_DEBIT. Then owner-say Debit granted. Else owner-say No debit — splits will not fire.",
        why: "Granting is async. Do not llGiveMoney in state_entry — perm is not there yet. This hat is the answer. Check the bit every time; don't assume.",
        expect: { type: "lsl_event_run_time_permissions" },
      },
      {
        title: "Pay pie + money",
        toolbox: "Looks",
        do: "Back in state_entry (under the request): click action PAY, pay price PAY_DEFAULT, hover. money hat: change total by amount, say Thanks.",
        why: "Same jar as before. Split is an extra line, not a different pay path. L$ from the visitor already went to the owner before this event ran.",
        expect: { type: "lsl_event_money" },
      },
      {
        title: "Give half",
        toolbox: "World",
        do: "Under the money thank-you: if partner is not NULL_KEY, World → give L$. Destination: get partner. Amount: amount ÷ 2 (Operators, integers). The give brick is a statement — LSL lets you throw the return away.",
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
