import type { ExampleId } from "@/lib/lsl/examples";

export type TutorialLevel = "basic" | "intermediate" | "advanced" | "expert";

export type Tutorial = {
  id: string;
  level: TutorialLevel;
  title: string;
  blurb: string;
  minutes: number;
  exampleId?: ExampleId;
  openNotecard?: boolean;
  steps: string[];
  tryThis?: string;
};

export const LEVELS: { id: TutorialLevel; label: string; hint: string }[] = [
  { id: "basic", label: "Basic", hint: "Hats, say, paste into a prim" },
  { id: "intermediate", label: "Intermediate", hint: "Timers, listens, states, dialogs" },
  { id: "advanced", label: "Advanced", hint: "Sensors, notecards, delays" },
  { id: "expert", label: "Expert", hint: "The stuff that fails in-world" },
];

export const TUTORIALS: Tutorial[] = [
  // —— Basic ————————————————————————————————————————————————
  {
    id: "hello",
    level: "basic",
    title: "Hello, Avatar!",
    blurb: "Yellow hat, two stacked bricks, paste into a prim.",
    minutes: 3,
    exampleId: "greeter",
    steps: [
      "Hit Load these bricks. You should see a yellow touch_start hat with a say brick and an owner-say brick stacked under it.",
      "Look at the panel on the right. That is real LSL, not a sketch. default is first. The event is named touch_start(integer num_detected) because that is what the wiki uses.",
      "Copy. In Second Life: right-click a box → Build → Content → New Script. Select all, paste, Save.",
      "Touch the box. Chat should say Hello, Avatar! and you (the owner) also get Touched. on the owner channel.",
    ],
    tryThis: "If llOwnerSay is missing from the panel, the next-block chain is broken. Don't paste that.",
  },
  {
    id: "edit-text",
    level: "basic",
    title: "Change the text and the channel",
    blurb: "Click a field. That's the whole editor.",
    minutes: 3,
    exampleId: "greeter",
    steps: [
      "Load these bricks (same greeter).",
      "Click Hello, Avatar! on the teal brick. Type whatever you want. Watch the right panel update as you type.",
      "The channel field is 0 — public chat, 20 metres. Negative channels are script-to-script and don't show in Nearby. Don't put llRegionSay on channel 0; the editor will flag it.",
      "Copy, paste into the same New Script, Save. Touch again.",
    ],
    tryThis: "Put a 2000-character novel in the say brick. The yellow warning is the 1023-byte chat cap. It still compiles; the sim truncates.",
  },
  {
    id: "hover-text",
    level: "basic",
    title: "Hover text over the prim",
    blurb: "Looks → set hover text. Colors are 0 to 1, not 0 to 255.",
    minutes: 4,
    exampleId: "greeter",
    steps: [
      "Load the greeter so you have a hat to snap under.",
      "Open Looks in the toolbox. Drag set hover text under the owner-say brick until it clicks.",
      "The color brick is a vector. White is <1, 1, 1>. Photoshop 255 will look like a blown-out sun and is wrong.",
      "Copy, paste, Save. The floating text sits on the prim until you set it to an empty string.",
    ],
    tryThis: "Hover text does not accept a raw integer. If you want a number up there, snap a (string) cast around it. The counter example does that.",
  },
  {
    id: "owner-vs-public",
    level: "basic",
    title: "Owner-only vs everyone",
    blurb: "llOwnerSay is quiet. llSay is 20 m. llWhisper is 10. llShout is 100.",
    minutes: 3,
    exampleId: "greeter",
    steps: [
      "Load the greeter. The stack is already public say + owner say. That's the usual pattern: a hello for the room, a debug line only you see.",
      "Chat → shout / whisper / region-say are the other ranges. Region-say cannot use channel 0 (that's an error, not a warning).",
      "llOwnerSay only works if you are in the same region as the prim. Walk to the next sim and it goes silent.",
      "Paste, Save, touch from a friend's account if you have one — they should see Hello, Avatar! and not Touched.",
    ],
  },

  // —— Intermediate ——————————————————————————————————————————
  {
    id: "timer-counter",
    level: "intermediate",
    title: "Count on a timer",
    blurb: "Typed global, state_entry starts the clock, timer ticks.",
    minutes: 5,
    exampleId: "counter",
    steps: [
      "Load these bricks. integer count is a global at the top of the script, not a brick on the hat.",
      "state_entry runs when the script starts and every time you enter that state. That's where llSetTimerEvent(1.0) belongs.",
      "The yellow timer hat has no parameters. Inside: change count by 1, then hover-text (string)count. LSL will not stringify for you.",
      "llSetTimerEvent(0.0) stops it. 0.001 will warn — a sim frame is about 0.022 s and the sim will not honor faster.",
    ],
    tryThis: "Set the interval to 0.001 and read the yellow strip above the LSL. Then set it back to 1.0 before you paste.",
  },
  {
    id: "owner-commands",
    level: "intermediate",
    title: "Listen for owner commands",
    blurb: "Negative channel, filter to llGetOwner, if / else if on the message.",
    minutes: 6,
    exampleId: "listen",
    steps: [
      "Load these bricks. state_entry opens a listen on a negative channel, filtered to the owner key — strangers on that channel are ignored.",
      "The listen hat has four values: channel, name, id, message. The if bricks compare message to spin and stop.",
      "llListen returns a handle. This example throws the handle away, which is legal, but then you cannot llListenRemove later. Keep it in a global if you need to.",
      "Paste, Save. From chat on that channel (or a second script that llSay's to it) send spin / stop.",
    ],
    tryThis: "Add a second state later and the listen is gone. Re-arm it in the new state's state_entry. That's the next tutorial's cousin.",
  },
  {
    id: "two-state-door",
    level: "intermediate",
    title: "A door with two states",
    blurb: "default is closed. Touch flips to open. default must stay first.",
    minutes: 6,
    exampleId: "door",
    steps: [
      "Load these bricks. Two yellow hats with different state fields: default and open.",
      "The right panel must print default { … } first, then state open { … }. If open is on top, don't paste — that's a compiler error in SL.",
      "Rotation is llEuler2Rot(<0, 0, 90> * DEG_TO_RAD). Degrees in the brick, radians in the script. Don't type a quaternion by hand.",
      "state open; is a statement, not a function call. This door has no listens or timers, so the 'cleared on state change' rule doesn't bite yet.",
    ],
    tryThis: "Put the prim on a hinge-friendly axis. If it swings the wrong way, flip the 90 to -90.",
  },
  {
    id: "touch-dialog",
    level: "intermediate",
    title: "A dialog with buttons",
    blurb: "llDialog to the toucher. 1–12 buttons. 1 second forced delay.",
    minutes: 5,
    exampleId: "dialog",
    steps: [
      "Load these bricks. Touch → llDialog to llDetectedKey(0) with a short button list on a negative channel.",
      "The reply is a listen, same channel. Buttons are 1 to 12 strings, each 24 bytes max — the editor warns if you go over.",
      "llDialog sleeps this script for 1 second. That's a warning, not an error. The script still compiles. Don't stack five dialogs in one event.",
      "Paste, Save, touch. Click a color. The listen branch should change the prim.",
    ],
    tryThis: "Add a thirteenth button. Read the warning. The sim will drop extras.",
  },

  // —— Advanced —————————————————————————————————————————————
  {
    id: "sensor-greeter",
    level: "advanced",
    title: "Greet whoever walks up",
    blurb: "llSensorRepeat, AGENT, 8 m, full sphere. Cap is 96 m.",
    minutes: 6,
    exampleId: "sensor",
    steps: [
      "Load these bricks. state_entry starts llSensorRepeat for AGENT, 8 metres, PI arc (that's a sphere), every 5 seconds.",
      "The sensor hat fires with num_detected. Hits come nearest-first, max 16. Use llDetectedName(0) / llDetectedKey(0) inside that hat only — they are illegal in a timer.",
      "Range 96 m is the cap. Type 200; the editor warns. The sim clamps.",
      "Repeating sensors die on state change, same as listens and timers. This example is one state, so you're fine.",
    ],
    tryThis: "Add a no_sensor hat if you want a 'nobody here' hover. It's optional; this example skips it.",
  },
  {
    id: "notecard-config",
    level: "advanced",
    title: "Config on a notecard",
    blurb: "The pattern real objects use: inventory check, NAK, EOF, CHANGED_INVENTORY.",
    minutes: 8,
    exampleId: "notecard",
    openNotecard: true,
    steps: [
      "Load these bricks. The World hat is not an LSL event — the generator injects nc_start_config(), dataserver, and changed so you still have one handler per event.",
      "Open the Notecard panel (it should have opened). Inventory name config. greeting = Hello, Avatar! and channel = 0. Copy that, in SL: New Note, paste, name it config, drop it in the same prim as the script.",
      "llGetNotecardLine is async. 0.1 s forced delay per line. NAK means the asset isn't cached yet — retry the same line, don't skip. EOF means done. Blank / # / // are skipped.",
      "touch_start waits on nc_ready_config. If you touch before the card finishes, nothing happens. That's on purpose.",
    ],
    tryThis: "Edit the notecard in inventory. CHANGED_INVENTORY should reload it. Don't state foo; while a read is in flight — the event queue is cleared and you miss EOF.",
  },
  {
    id: "state-clears-listens",
    level: "advanced",
    title: "State change kills listens",
    blurb: "Timers, sensors, and listens reset. Re-arm in the new state's state_entry.",
    minutes: 5,
    exampleId: "door",
    steps: [
      "Load the door. It survives state change because it doesn't listen. Now imagine you added llListen in default's state_entry.",
      "The moment you run state open; LSL: leaves default (state_exit), dumps the event queue, forgets every listen / sensor / timer.",
      "The open state's state_entry has to call llListen again if you still want commands. PrimBlocks warns. It will not auto-insert that brick — you'd hide a bug.",
      "llResetScript() jumps back to default and zeros globals. Use it as a panic button, not a state machine.",
    ],
    tryThis: "Snap a listen into default, add a second state, and read the warning strip. Then put the matching listen in the new state's state_entry.",
  },
  {
    id: "delays-and-sleep",
    level: "advanced",
    title: "Forced delays vs a frozen script",
    blurb: "IM is 2 s. Dialog is 1 s. SetPos is 0.2 s. llSleep freezes everything.",
    minutes: 5,
    exampleId: "dialog",
    steps: [
      "Load the dialog example. The yellow strip is the 1 s llDialog delay. The script still emits. The sim is what actually sleeps.",
      "llInstantMessage is 2 s. llSetPos on an unattached root is 0.2 s and ~10 m per call. llSetLinkPrimitiveParamsFast has no that delay — prefer it for bulk PRIM_*.",
      "llSleep freezes this script. Events queue (max 64) but do not run. A long sleep is how you make a prim that ignores touches. Prefer a timer.",
      "The forever-loop brick injects a sleep on purpose so a snapped infinite loop cannot lock the sim with no yield.",
    ],
    tryThis: "Stack llOwnerSay then llInstantMessage then llDialog in one touch. Add up the delays. That's why vendors use timers.",
  },

  // —— Expert ———————————————————————————————————————————————
  {
    id: "notecard-acl",
    level: "expert",
    title: "Access list from a notecard",
    blurb: "Raw lines (no =), inventory check, don't change state mid-read.",
    minutes: 8,
    exampleId: "notecard",
    openNotecard: true,
    steps: [
      "Notecard format in PrimBlocks: key = value for settings, a line with no equals for a raw name/key (access lists), # and // for comments. 255 UTF-8 bytes per line or the sim truncates.",
      "The reader already checks llGetInventoryType(name) == INVENTORY_NOTECARD. Wrong name → NULL_KEY and silence. That's the bug everyone hits.",
      "Build the card in the Notecard panel so byte-cap warnings happen here, not in-world. Copy, New Note, matching inventory name, same prim.",
      "CHANGED_INVENTORY reloads. A state change while the query is in flight dumps the event queue — you will never see EOF and nc_ready_* stays false forever.",
    ],
    tryThis: "Duplicate a key in the panel. The inspect warning is the same class of mistake as two greeting = lines fighting.",
  },
  {
    id: "types-that-fail",
    level: "expert",
    title: "The snaps LSL will reject",
    blurb: "If the brick won't click, the compiler wouldn't either.",
    minutes: 6,
    steps: [
      "Integer plugs into a float socket. Float does not plug into integer — use the cast brick. String + number does not coerce; (string)n.",
      "String and key are interchangeable at the socket (LSL is like that). Boolean sockets take integer / TRUE / FALSE. if conditions are integer, not float.",
      "% is integer or vector, not float. Vector * vector is a dot (float out). Vector % vector is cross. You cannot == two lists.",
      "List + anything concatenates (list out). Lists cannot contain lists. Hover text, llSay, and dialog buttons want strings — cast.",
    ],
    tryThis: "Try to snap a float number into an llSetTimerEvent? That's actually a float socket, so it will click. Try snapping it into a channel instead.",
  },
  {
    id: "one-handler",
    level: "expert",
    title: "One handler, no state in functions",
    blurb: "LSL allows one touch_start per state. Functions cannot state foo;",
    minutes: 5,
    exampleId: "door",
    steps: [
      "Two touch_start hats in default: the generator keeps the first, drops the second, and notes it in the header comments. Merge them yourself.",
      "User-function bricks emit above the states. Putting state open; inside a function is a compiler error in SL. The brick currently still lets you snap one — that's a known hole. Don't.",
      "Event queue is 64. A tight timer that llSleeps will drop touches. That's why the forever brick yields.",
      "default must exist even if you only built state open. assembleScript will emit an empty default if you forgot. Empty default still counts.",
    ],
    tryThis: "Drop two touch_start hats in default and read the generated header comment. Then stack both bodies under one hat.",
  },
  {
    id: "raw-escape",
    level: "expert",
    title: "When to use a raw LSL brick",
    blurb: "Vehicles, JSON, jump/@label, HMAC, pathfinding. Catalog is not the wiki.",
    minutes: 5,
    steps: [
      "The catalog is greeters, doors, listens, dialogs, sensors, particles, looks, motion — the ll* you actually snap. It is not every function on the wiki.",
      "Missing on purpose: vehicles, KFM, full PRIM_TYPE sculpt/mesh, pathfinding character API, llJson*, llHMAC* / llSHA256*, llCastRay extras, llGetEnv.",
      "Raw LSL statement / expression bricks are the escape hatch. They will happily emit garbage. That's the point. The type checker does not save you.",
      "jump / @label exist in LSL and do not exist as bricks. List brick is 4 slots — longer lists are empty list + llListInsertList, or raw.",
    ],
    tryThis: "Hover a brick. The tooltip starts with the official signature and a wiki-ish gotcha. If the tooltip is missing, the table row in functions.ts is the bug, not the generator.",
  },
];

export function tutorialsFor(level: TutorialLevel): Tutorial[] {
  return TUTORIALS.filter((t) => t.level === level);
}

export function tutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find((t) => t.id === id);
}
