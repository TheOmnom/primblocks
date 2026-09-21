import { CAT, type CategoryId } from "./colors.ts";
import { delayNote } from "./limits.ts";

export type LslCheck = "Integer" | "Number" | "String" | "Key" | "Vector" | "Rotation" | "List" | "Boolean";

export type ShadowSpec =
  | { kind: "int"; value: number }
  | { kind: "float"; value: number }
  | { kind: "string"; value: string }
  | { kind: "vector"; x: number; y: number; z: number }
  | { kind: "rotation"; x: number; y: number; z: number; s: number }
  | { kind: "bool" }
  | { kind: "const"; block: string; field?: string; value?: string };

export type FnArg = {
  name: string;
  check: LslCheck | LslCheck[];
  shadow?: ShadowSpec;
};

export type FnDef = {
  type: string;
  ll: string;
  category: CategoryId;
  /** Blockly message0, %n matches args left-to-right */
  message: string;
  args: FnArg[];
  /** LSL call order; defaults to args order */
  order?: string[];
  returns?: LslCheck;
  /** LSL allows discarding a return. Brick snaps as a statement and emits `call;`. */
  discardReturn?: boolean;
  tooltip: string;
};

function fn(
  ll: string,
  category: CategoryId,
  message: string,
  args: FnArg[],
  tooltip: string,
  extra?: Partial<Pick<FnDef, "order" | "returns" | "discardReturn">>,
): FnDef {
  return {
    type: `lsl_fn_${ll}`,
    ll,
    category,
    message,
    args,
    tooltip: `${tooltip}`,
    ...extra,
  };
}

const ch = (value = 0): FnArg => ({
  name: "CHANNEL",
  check: "Integer",
  shadow: { kind: "int", value },
});
const msg = (value = "Hello, Avatar!"): FnArg => ({
  name: "MSG",
  check: "String",
  shadow: { kind: "string", value },
});
const vol: FnArg = { name: "VOL", check: "Number", shadow: { kind: "float", value: 1 } };
const face: FnArg = {
  name: "FACE",
  check: "Integer",
  shadow: { kind: "const", block: "lsl_const_face", value: "ALL_SIDES" },
};
const link: FnArg = {
  name: "LINK",
  check: "Integer",
  shadow: { kind: "const", block: "lsl_const_link", value: "LINK_THIS" },
};
const color: FnArg = {
  name: "COLOR",
  check: "Vector",
  shadow: { kind: "vector", x: 1, y: 1, z: 1 },
};
const vec0: FnArg = {
  name: "POS",
  check: "Vector",
  shadow: { kind: "vector", x: 0, y: 0, z: 0 },
};
const num = (name: string, value: number, kind: "int" | "float" = "float"): FnArg => ({
  name,
  check: kind === "int" ? "Integer" : "Number",
  shadow: { kind, value },
});
const str = (name: string, value: string): FnArg => ({
  name,
  check: "String",
  shadow: { kind: "string", value },
});
const keyArg = (name: string): FnArg => ({
  name,
  check: "Key",
  shadow: { kind: "const", block: "lsl_const_nullkey" },
});
const idx: FnArg = { name: "INDEX", check: "Integer", shadow: { kind: "int", value: 0 } };

export const LSL_FUNCTIONS: FnDef[] = [
  // --- Chat ---
  fn("llSay", "chat", "say %1 on channel %2", [msg(), ch(0)], "llSay(integer channel, string msg) — 20 m, 1023-byte cap.", { order: ["CHANNEL", "MSG"] }),
  fn("llWhisper", "chat", "whisper %1 on channel %2", [msg(), ch(0)], "llWhisper(integer channel, string msg) — 10 m.", { order: ["CHANNEL", "MSG"] }),
  fn("llShout", "chat", "shout %1 on channel %2", [msg(), ch(0)], "llShout(integer channel, string msg) — 100 m.", { order: ["CHANNEL", "MSG"] }),
  fn("llRegionSay", "chat", "region-say %1 on channel %2", [msg(), ch(-1)], "llRegionSay(integer channel, string msg) — whole region. Channel 0 is not allowed.", { order: ["CHANNEL", "MSG"] }),
  fn("llRegionSayTo", "chat", "region-say %1 to %2 on channel %3", [msg(), keyArg("TARGET"), ch(0)], "llRegionSayTo(key target, integer channel, string msg) — one avatar or object in the region.", { order: ["TARGET", "CHANNEL", "MSG"] }),
  fn("llOwnerSay", "chat", "owner-say %1", [msg("Ready.")], "llOwnerSay(string msg) — only the owner hears this, any distance in-region."),
  fn("llInstantMessage", "chat", "IM %1 to %2", [msg("Hello"), keyArg("USER")], "llInstantMessage(key user, string message) — 2 s throttle, works off-world if the user allows IMs.", { order: ["USER", "MSG"] }),
  fn(
    "llListen",
    "chat",
    "listen on channel %1 from name %2 key %3 message %4",
    [
      ch(0),
      str("NAME", ""),
      keyArg("ID"),
      str("FILTER", ""),
    ],
    "llListen(integer channel, string name, key id, string msg) — empty name / NULL_KEY / empty msg = wildcard. Returns a handle; this brick emits the call as a statement, which LSL allows. Cleared on state change.",
  ),
  fn("llListenRemove", "chat", "remove listen %1", [num("HANDLE", 0, "int")], "llListenRemove(integer handle) — drop a specific listen."),
  fn("llListenControl", "chat", "set listen %1 active %2", [num("HANDLE", 0, "int"), { name: "ACTIVE", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "TRUE" } }], "llListenControl(integer handle, integer active) — mute or re-enable a listen without removing it."),
  fn(
    "llDialog",
    "chat",
    "dialog to %1 message %2 buttons %3 channel %4",
    [keyArg("AVATAR"), str("PROMPT", "Choose:"), { name: "BUTTONS", check: "List" }, ch(-99)],
    "llDialog(key avatar, string message, list buttons, integer channel) — 1–12 button labels, each ≤24 bytes. Listen on that channel to catch the reply.",
  ),
  fn("llTextBox", "chat", "text box to %1 message %2 channel %3", [keyArg("AVATAR"), str("PROMPT", "Type:"), ch(-99)], "llTextBox(key avatar, string message, integer channel) — free-text reply on that channel."),
  fn("llLoadURL", "chat", "offer URL %1 with label %2 to %3", [str("URL", "https://secondlife.com"), str("LABEL", "Open"), keyArg("AVATAR")], "llLoadURL(key avatar, string message, string url) — the user must click to open.", { order: ["AVATAR", "LABEL", "URL"] }),
  fn("llMessageLinked", "chat", "link-message to %1 num %2 string %3 key %4", [link, num("NUM", 0, "int"), str("STR", ""), keyArg("ID")], "llMessageLinked(integer linknum, integer num, string str, key id) — received as link_message. A script cannot hear itself."),

  // --- Looks ---
  fn("llSetText", "looks", "set hover text %1 color %2 alpha %3", [str("TEXT", "Hello"), color, num("ALPHA", 1)], "llSetText(string text, vector color, float alpha) — floating text over the prim. 254 bytes shown."),
  fn("llSetColor", "looks", "set color %1 on face %2", [color, face], "llSetColor(vector color, integer face) — RGB 0.0–1.0, not 0–255."),
  fn("llSetAlpha", "looks", "set alpha %1 on face %2", [num("ALPHA", 1), face], "llSetAlpha(float alpha, integer face) — 0.0 invisible, 1.0 opaque."),
  fn("llSetTexture", "looks", "set texture %1 on face %2", [str("TEXTURE", "BLANK"), face], "llSetTexture(string texture, integer face) — inventory name or UUID."),
  fn("llScaleTexture", "looks", "scale texture u %1 v %2 on face %3", [num("U", 1), num("V", 1), face], "llScaleTexture(float u, float v, integer face)."),
  fn("llOffsetTexture", "looks", "offset texture u %1 v %2 on face %3", [num("U", 0), num("V", 0), face], "llOffsetTexture(float u, float v, integer face)."),
  fn("llRotateTexture", "looks", "rotate texture %1 rad on face %2", [num("RAD", 0), face], "llRotateTexture(float rotation, integer face) — radians."),
  fn("llSetLinkColor", "looks", "set link %1 color %2 face %3", [link, color, face], "llSetLinkColor(integer linknumber, vector color, integer face)."),
  fn("llSetLinkAlpha", "looks", "set link %1 alpha %2 face %3", [link, num("ALPHA", 1), face], "llSetLinkAlpha(integer linknumber, float alpha, integer face)."),
  fn("llSetLinkTexture", "looks", "set link %1 texture %2 face %3", [link, str("TEXTURE", "BLANK"), face], "llSetLinkTexture(integer linknumber, string texture, integer face)."),
  fn("llSetScale", "looks", "set scale %1", [{ name: "SCALE", check: "Vector", shadow: { kind: "vector", x: 0.5, y: 0.5, z: 0.5 } }], "llSetScale(vector scale) — this prim, meters. Root of a linked set is limited."),
  fn("llGetScale", "looks", "prim scale", [], "llGetScale() returns vector.", { returns: "Vector" }),
  fn("llSetObjectName", "looks", "set object name %1", [str("NAME", "Object")], "llSetObjectName(string name) — 63 bytes."),
  fn("llGetObjectName", "looks", "object name", [], "llGetObjectName() returns string.", { returns: "String" }),
  fn("llSetObjectDesc", "looks", "set description %1", [str("DESC", "")], "llSetObjectDesc(string desc) — 127 bytes."),
  fn("llGetObjectDesc", "looks", "object description", [], "llGetObjectDesc() returns string.", { returns: "String" }),
  fn("llSetClickAction", "looks", "set click action %1", [{ name: "ACTION", check: "Integer", shadow: { kind: "const", block: "lsl_const_click", value: "CLICK_ACTION_TOUCH" } }], "llSetClickAction(integer action) — touch, sit, buy, pay, open, play, zoom, ignore."),
  fn("llSetPayPrice", "looks", "set pay price %1 quick buttons %2", [{ name: "PRICE", check: "Integer", shadow: { kind: "const", block: "lsl_const_pay", value: "PAY_DEFAULT" } }, { name: "QUICK", check: "List" }], "llSetPayPrice(integer price, list quick_pay_buttons) — PAY_DEFAULT shows the pie, PAY_HIDE hides it. Four quick amounts (1, 5, 10, 20 is the usual set). Does not put the object For Sale — Pay is a different pie."),
  fn("llParticleSystem", "looks", "particle system %1", [{ name: "RULES", check: "List" }], "llParticleSystem(list rules) — empty list [] stops particles. See the Looks presets for working rule lists."),

  // --- Motion ---
  fn("llSetPos", "motion", "set position %1", [vec0], "llSetPos(vector pos) — region coords if root, local if child. ~10 m per call for unattached roots."),
  fn("llGetPos", "motion", "position", [], "llGetPos() returns vector — region coordinates of this prim.", { returns: "Vector" }),
  fn("llGetLocalPos", "motion", "local position", [], "llGetLocalPos() returns vector — offset from root (or region pos if root).", { returns: "Vector" }),
  fn("llSetRot", "motion", "set rotation %1", [{ name: "ROT", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }], "llSetRot(rotation rot) — region rotation if root."),
  fn("llGetRot", "motion", "rotation", [], "llGetRot() returns rotation.", { returns: "Rotation" }),
  fn("llSetLocalRot", "motion", "set local rotation %1", [{ name: "ROT", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }], "llSetLocalRot(rotation rot)."),
  fn("llGetLocalRot", "motion", "local rotation", [], "llGetLocalRot() returns rotation.", { returns: "Rotation" }),
  fn("llSetRegionPos", "motion", "set region position %1", [vec0], "llSetRegionPos(vector pos) — warp anywhere in the region if the point is valid. Returns integer TRUE/FALSE; this brick discards it (legal LSL).", { returns: "Integer", discardReturn: true }),
  fn("llTargetOmega", "motion", "spin axis %1 rate %2 gain %3", [{ name: "AXIS", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 1 } }, num("RATE", 1), num("GAIN", 1)], "llTargetOmega(vector axis, float spinrate, float gain) — client-side spin if nonphysical; physical uses gain. Rate 0 stops."),
  fn("llMoveToTarget", "motion", "move to %1 with tau %2", [vec0, num("TAU", 0.2)], "llMoveToTarget(vector target, float tau) — physical only. Smaller tau = snappier."),
  fn("llStopMoveToTarget", "motion", "stop move to target", [], "llStopMoveToTarget()."),
  fn("llLookAt", "motion", "look at %1 strength %2 damping %3", [vec0, num("STR", 0.5), num("DAMP", 0.1)], "llLookAt(vector target, float strength, float damping) — physical."),
  fn("llStopLookAt", "motion", "stop look at", [], "llStopLookAt()."),
  fn("llSetStatus", "motion", "set status %1 to %2", [{ name: "STATUS", check: "Integer", shadow: { kind: "const", block: "lsl_const_status", value: "STATUS_PHYSICS" } }, { name: "VALUE", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "TRUE" } }], "llSetStatus(integer status, integer value) — PHYSICS, PHANTOM, ROTATE_X/Y/Z, SANDBOX, BLOCK_GRAB, DIE_AT_EDGE, RETURN_AT_EDGE."),
  fn("llGetStatus", "motion", "status %1", [{ name: "STATUS", check: "Integer", shadow: { kind: "const", block: "lsl_const_status", value: "STATUS_PHYSICS" } }], "llGetStatus(integer status) returns integer TRUE/FALSE.", { returns: "Integer" }),
  fn("llSetForce", "motion", "set force %1 local %2", [{ name: "FORCE", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 0 } }, { name: "LOCAL", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "FALSE" } }], "llSetForce(vector force, integer local) — physical, continuous."),
  fn("llApplyImpulse", "motion", "apply impulse %1 local %2", [{ name: "FORCE", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 1 } }, { name: "LOCAL", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "TRUE" } }], "llApplyImpulse(vector force, integer local) — physical, instant."),
  fn("llSetVelocity", "motion", "set velocity %1 local %2", [{ name: "VEL", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 0 } }, { name: "LOCAL", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "FALSE" } }], "llSetVelocity(vector velocity, integer local) — physical."),
  fn("llGetVel", "motion", "velocity", [], "llGetVel() returns vector m/s.", { returns: "Vector" }),
  fn("llGetOmega", "motion", "angular velocity", [], "llGetOmega() returns vector radians/s.", { returns: "Vector" }),
  fn("llSitTarget", "motion", "sit target offset %1 rot %2", [{ name: "OFFSET", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 0.1 } }, { name: "ROT", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }], "llSitTarget(vector offset, rotation rot) — ZERO_VECTOR clears the sit target."),
  fn("llAvatarOnSitTarget", "motion", "avatar on sit target", [], "llAvatarOnSitTarget() returns key — NULL_KEY if empty.", { returns: "Key" }),
  fn("llUnSit", "motion", "unsit %1", [keyArg("ID")], "llUnSit(key id) — stand the seated avatar."),
  fn("llSetHoverHeight", "motion", "hover height %1 water %2 tau %3", [num("HEIGHT", 2), { name: "WATER", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "FALSE" } }, num("TAU", 0.5)], "llSetHoverHeight(float height, integer water, float tau) — physical."),
  fn("llStopHover", "motion", "stop hover", [], "llStopHover()."),
  fn("llSetBuoyancy", "motion", "set buoyancy %1", [num("B", 0)], "llSetBuoyancy(float buoyancy) — 1.0 floats, 0.0 normal, physical."),
  fn("llGetMass", "motion", "mass", [], "llGetMass() returns float.", { returns: "Number" }),
  fn("llVolumeDetect", "motion", "volume detect %1", [{ name: "DETECT", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "TRUE" } }], "llVolumeDetect(integer detect) — phantom volume; collisions fire without physical push."),

  // --- Sound ---
  fn("llPlaySound", "sound", "play sound %1 volume %2", [str("SOUND", ""), vol], "llPlaySound(string sound, float volume) — attached to this prim, 0.0–1.0."),
  fn("llLoopSound", "sound", "loop sound %1 volume %2", [str("SOUND", ""), vol], "llLoopSound(string sound, float volume)."),
  fn("llStopSound", "sound", "stop sound", [], "llStopSound() — stops the attached sound on this prim."),
  fn("llPreloadSound", "sound", "preload sound %1", [str("SOUND", "")], "llPreloadSound(string sound) — hint the viewer to cache it."),
  fn("llTriggerSound", "sound", "trigger sound %1 volume %2", [str("SOUND", ""), vol], "llTriggerSound(string sound, float volume) — unattached, fire-and-forget at current position."),
  fn("llSetSoundRadius", "sound", "sound radius %1 m", [num("RADIUS", 20)], "llSetSoundRadius(float radius) — 0 = default."),
  fn("llAdjustSoundVolume", "sound", "adjust volume %1", [vol], "llAdjustSoundVolume(float volume)."),

  // --- Sensing ---
  fn("llGetOwner", "sensing", "owner key", [], "llGetOwner() returns key.", { returns: "Key" }),
  fn("llGetKey", "sensing", "this key", [], "llGetKey() returns key of this prim.", { returns: "Key" }),
  fn("llGetCreator", "sensing", "creator key", [], "llGetCreator() returns key.", { returns: "Key" }),
  fn("llGetOwnerKey", "sensing", "owner of %1", [keyArg("ID")], "llGetOwnerKey(key id) returns key — owner of the object, or the key itself if it is an avatar.", { returns: "Key" }),
  fn("llKey2Name", "sensing", "name of %1", [keyArg("ID")], "llKey2Name(key id) returns string — empty if the id is not in the region.", { returns: "String" }),
  fn("llDetectedKey", "sensing", "detected key %1", [idx], "llDetectedKey(integer number) — valid inside touch/collision/sensor/on_damage/final_damage.", { returns: "Key" }),
  fn("llDetectedName", "sensing", "detected name %1", [idx], "llDetectedName(integer number) returns string.", { returns: "String" }),
  fn("llDetectedOwner", "sensing", "detected owner %1", [idx], "llDetectedOwner(integer number) returns key of the owner of the detected object or avatar.", { returns: "Key" }),
  fn("llDetectedGroup", "sensing", "detected same group %1", [idx], "llDetectedGroup(integer number) returns integer TRUE if the detected object/avatar shares the active group.", { returns: "Integer" }),
  fn("llDetectedPos", "sensing", "detected position %1", [idx], "llDetectedPos(integer number) returns vector.", { returns: "Vector" }),
  fn("llDetectedRot", "sensing", "detected rotation %1", [idx], "llDetectedRot(integer number) returns rotation.", { returns: "Rotation" }),
  fn("llDetectedVel", "sensing", "detected velocity %1", [idx], "llDetectedVel(integer number) returns vector.", { returns: "Vector" }),
  fn("llDetectedType", "sensing", "detected type %1", [idx], "llDetectedType(integer number) returns bitfield AGENT | ACTIVE | PASSIVE | SCRIPTED.", { returns: "Integer" }),
  fn("llDetectedLinkNumber", "sensing", "detected link number %1", [idx], "llDetectedLinkNumber(integer number) returns integer.", { returns: "Integer" }),
  fn("llDetectedGrab", "sensing", "detected grab %1", [idx], "llDetectedGrab(integer number) returns vector offset.", { returns: "Vector" }),
  fn("llDetectedTouchST", "sensing", "touch ST %1", [idx], "llDetectedTouchST(integer number) returns vector — face UV in <s, t, 0>. TOUCH_INVALID_TEXCOORD if not a touch.", { returns: "Vector" }),
  fn("llDetectedTouchUV", "sensing", "touch UV %1", [idx], "llDetectedTouchUV(integer number) returns vector — texture UV.", { returns: "Vector" }),
  fn("llDetectedTouchPos", "sensing", "touch position %1", [idx], "llDetectedTouchPos(integer number) returns vector region pos.", { returns: "Vector" }),
  fn("llDetectedTouchFace", "sensing", "touch face %1", [idx], "llDetectedTouchFace(integer number) returns integer face index.", { returns: "Integer" }),
  fn("llDetectedTouchNormal", "sensing", "touch normal %1", [idx], "llDetectedTouchNormal(integer number) returns vector.", { returns: "Vector" }),
  fn("llDetectedTouchBinormal", "sensing", "touch binormal %1", [idx], "llDetectedTouchBinormal(integer number) returns vector.", { returns: "Vector" }),
  fn("llDetectedDamage", "sensing", "detected damage %1", [idx], "llDetectedDamage(integer number) returns [float damage, integer type, float original]. Valid in on_damage and final_damage.", { returns: "List" }),
  fn("llDetectedRezzer", "sensing", "detected rezzer %1", [idx], "llDetectedRezzer(integer number) returns key of who rezzed the detected object. Combat 2.0 / detect events.", { returns: "Key" }),
  fn(
    "llSensor",
    "sensing",
    "sensor name %1 key %2 type %3 range %4 arc %5",
    [
      str("NAME", ""),
      keyArg("ID"),
      { name: "TYPE", check: "Integer", shadow: { kind: "const", block: "lsl_const_sensor", value: "AGENT" } },
      num("RANGE", 10),
      { name: "ARC", check: "Number", shadow: { kind: "const", block: "lsl_const_math", value: "PI" } },
    ],
    "llSensor(string name, key id, integer type, float range, float arc) — one sweep, max 16 hits, 96 m. Arc PI = full sphere.",
  ),
  fn(
    "llSensorRepeat",
    "sensing",
    "repeat sensor name %1 key %2 type %3 range %4 arc %5 rate %6",
    [
      str("NAME", ""),
      keyArg("ID"),
      { name: "TYPE", check: "Integer", shadow: { kind: "const", block: "lsl_const_sensor", value: "AGENT" } },
      num("RANGE", 10),
      { name: "ARC", check: "Number", shadow: { kind: "const", block: "lsl_const_math", value: "PI" } },
      num("RATE", 5),
    ],
    "llSensorRepeat(string name, key id, integer type, float range, float arc, float rate) — repeating sweep. Cleared on state change.",
  ),
  fn("llSensorRemove", "sensing", "remove sensor", [], "llSensorRemove()."),
  fn("llSameGroup", "sensing", "same group as %1", [keyArg("ID")], "llSameGroup(key id) returns integer TRUE if the object/avatar shares the active group.", { returns: "Integer" }),
  fn("llOverMyLand", "sensing", "over my land %1", [keyArg("ID")], "llOverMyLand(key id) returns integer.", { returns: "Integer" }),
  fn("llGetAgentInfo", "sensing", "agent info %1", [keyArg("ID")], "llGetAgentInfo(key id) returns AGENT_* bitfield (walking, flying, away, sitting, busy, typing, …).", { returns: "Integer" }),
  fn("llGetAgentSize", "sensing", "agent size %1", [keyArg("ID")], "llGetAgentSize(key id) returns vector — ZERO_VECTOR if not in region.", { returns: "Vector" }),
  fn("llRequestAgentData", "sensing", "request agent data %1 field %2", [keyArg("ID"), { name: "DATA", check: "Integer", shadow: { kind: "const", block: "lsl_const_agentdata", value: "DATA_NAME" } }], "llRequestAgentData(key id, integer data) returns key queryid — result in dataserver.", { returns: "Key" }),
  fn("llGetObjectDetails", "sensing", "object details of %1 params %2", [keyArg("ID"), { name: "PARAMS", check: "List" }], "llGetObjectDetails(key id, list params) returns list of OBJECT_* fields.", { returns: "List" }),
  fn("llGetRegionName", "sensing", "region name", [], "llGetRegionName() returns string.", { returns: "String" }),
  fn("llGetRegionTimeDilation", "sensing", "time dilation", [], "llGetRegionTimeDilation() returns float 0–1.", { returns: "Number" }),
  fn("llGetRegionFPS", "sensing", "region FPS", [], "llGetRegionFPS() returns float.", { returns: "Number" }),
  fn("llGround", "sensing", "ground height at %1", [{ name: "OFFSET", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 0 } }], "llGround(vector offset) returns float height relative to this prim + offset.", { returns: "Number" }),
  fn("llWater", "sensing", "water height at %1", [{ name: "OFFSET", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 0 } }], "llWater(vector offset) returns float.", { returns: "Number" }),
  fn("llGetUnixTime", "sensing", "unix time", [], "llGetUnixTime() returns integer seconds since 1970-01-01 UTC.", { returns: "Integer" }),
  fn("llGetTimestamp", "sensing", "timestamp", [], "llGetTimestamp() returns string — UTC with milliseconds.", { returns: "String" }),
  fn("llGetDate", "sensing", "date", [], "llGetDate() returns string YYYY-MM-DD UTC.", { returns: "String" }),
  fn("llGetWallclock", "sensing", "SL wallclock", [], "llGetWallclock() returns float seconds since midnight SLT.", { returns: "Number" }),
  fn("llGetGMTclock", "sensing", "GMT clock", [], "llGetGMTclock() returns float seconds since midnight UTC.", { returns: "Number" }),
  fn("llGetTime", "sensing", "script time", [], "llGetTime() returns float seconds since last llResetTime / script reset.", { returns: "Number" }),
  fn("llResetTime", "sensing", "reset script time", [], "llResetTime()."),
  fn("llGetAndResetTime", "sensing", "get and reset script time", [], "llGetAndResetTime() returns float.", { returns: "Number" }),
  fn("llGetFreeMemory", "sensing", "free memory", [], "llGetFreeMemory() returns integer bytes (Mono/Luau differ in meaning).", { returns: "Integer" }),
  fn("llGetUsedMemory", "sensing", "used memory", [], "llGetUsedMemory() returns integer bytes.", { returns: "Integer" }),
  fn("llGetScriptName", "sensing", "script name", [], "llGetScriptName() returns string.", { returns: "String" }),
  fn("llGetLinkNumber", "sensing", "this link number", [], "llGetLinkNumber() returns integer — 0 unlinked, 1 root.", { returns: "Integer" }),
  fn("llGetNumberOfPrims", "sensing", "number of prims", [], "llGetNumberOfPrims() returns integer.", { returns: "Integer" }),
  fn("llGetLinkKey", "sensing", "key of link %1", [num("LINKNUM", 1, "int")], "llGetLinkKey(integer linknumber) returns key.", { returns: "Key" }),
  fn("llGetLinkName", "sensing", "name of link %1", [num("LINKNUM", 1, "int")], "llGetLinkName(integer linknumber) returns string.", { returns: "String" }),
  fn("llGetNumberOfSides", "sensing", "number of sides", [], "llGetNumberOfSides() returns integer.", { returns: "Integer" }),
  fn("llGetStartParameter", "sensing", "start parameter", [], "llGetStartParameter() returns integer from llRezObject.", { returns: "Integer" }),
  fn("llGetInventoryNumber", "sensing", "inventory count of type %1", [{ name: "INVTYPE", check: "Integer", shadow: { kind: "const", block: "lsl_const_inv", value: "INVENTORY_ALL" } }], "llGetInventoryNumber(integer type) returns integer.", { returns: "Integer" }),
  fn("llGetInventoryName", "sensing", "inventory name type %1 index %2", [{ name: "INVTYPE", check: "Integer", shadow: { kind: "const", block: "lsl_const_inv", value: "INVENTORY_NOTECARD" } }, num("NUMBER", 0, "int")], "llGetInventoryName(integer type, integer number) returns string — 0-based.", { returns: "String" }),
  fn("llGetInventoryKey", "sensing", "inventory key %1", [str("NAME", "")], "llGetInventoryKey(string name) returns key — NULL_KEY if no copy/transfer full-perm.", { returns: "Key" }),
  fn("llGetInventoryType", "sensing", "inventory type of %1", [str("NAME", "")], "llGetInventoryType(string name) returns INVENTORY_* or INVENTORY_NONE.", { returns: "Integer" }),

  // --- World / script / avatar ---
  fn("llSleep", "world", "pause script %1 seconds", [num("SEC", 1)], "llSleep(float sec) — freezes THIS script. Events queue (max 64) but do not run until it wakes. Prefer a timer for long waits."),
  fn("llSetTimerEvent", "world", "set timer every %1 seconds", [num("SEC", 1)], "llSetTimerEvent(float sec) — 0.0 stops. Cleared on state change. Minimum useful interval ~0.01s, subject to dilation."),
  fn("llResetScript", "world", "reset this script", [], "llResetScript() — returns to default, state_entry runs, globals reset."),
  fn("llDie", "world", "delete this object", [], "llDie() — object is deleted. Cannot delete attachments this way."),
  fn("llMinEventDelay", "world", "min event delay %1", [num("SEC", 0.1)], "llMinEventDelay(float delay) — throttle between events."),
  fn("llGiveInventory", "world", "give inventory %1 to %2", [str("ITEM", ""), keyArg("DEST")], "llGiveInventory(key destination, string inventory) — no-copy items cannot go to objects.", { order: ["DEST", "ITEM"] }),
  fn("llRemoveInventory", "world", "remove inventory %1", [str("ITEM", "")], "llRemoveInventory(string name)."),
  fn("llRezObject", "world", "rez %1 at %2 vel %3 rot %4 param %5", [str("ITEM", "Object"), vec0, { name: "VEL", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 0 } }, { name: "ROT", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }, num("PARAM", 0, "int")], "llRezObject(string inventory, vector pos, vector vel, rotation rot, integer param) — pos within ~10 m, then on_rez(param) on the new object."),
  fn("llRezAtRoot", "world", "rez at root %1 at %2 vel %3 rot %4 param %5", [str("ITEM", "Object"), vec0, { name: "VEL", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 0 } }, { name: "ROT", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }, num("PARAM", 0, "int")], "llRezAtRoot(string inventory, vector pos, vector vel, rotation rot, integer param) — pos is the root prim, not the geometric center."),
  fn("llRequestPermissions", "world", "request permissions from %1 bits %2", [keyArg("AGENT"), { name: "PERM", check: "Integer", shadow: { kind: "const", block: "lsl_const_perm", value: "PERMISSION_TRIGGER_ANIMATION" } }], "llRequestPermissions(key agent, integer perm) — result in run_time_permissions. Anim/control/camera: sitting or attaching. Debit: owner only."),
  fn("llGetPermissions", "world", "granted permissions", [], "llGetPermissions() returns integer bitfield.", { returns: "Integer" }),
  fn("llGetPermissionsKey", "world", "permissions avatar", [], "llGetPermissionsKey() returns key of the granter, or NULL_KEY.", { returns: "Key" }),
  fn("llStartAnimation", "world", "start animation %1", [str("ANIM", "sit")], "llStartAnimation(string anim) — needs PERMISSION_TRIGGER_ANIMATION. Inventory name or built-in (sit, stand, walk, …)."),
  fn("llStopAnimation", "world", "stop animation %1", [str("ANIM", "sit")], "llStopAnimation(string anim)."),
  fn("llTakeControls", "world", "take controls %1 accept %2 pass %3", [{ name: "CONTROLS", check: "Integer", shadow: { kind: "const", block: "lsl_const_control", value: "CONTROL_FWD" } }, { name: "ACCEPT", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "TRUE" } }, { name: "PASS", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "FALSE" } }], "llTakeControls(integer controls, integer accept, integer pass_on) — needs PERMISSION_TAKE_CONTROLS."),
  fn("llReleaseControls", "world", "release controls", [], "llReleaseControls()."),
  fn("llDetachFromAvatar", "world", "detach from avatar", [], "llDetachFromAvatar() — only works while attached."),
  fn("llAttachToAvatar", "world", "attach to point %1", [{ name: "POINT", check: "Integer", shadow: { kind: "int", value: 0 } }], "llAttachToAvatar(integer attach_point) — needs PERMISSION_ATTACH. ATTACH_* constants."),
  fn("llGetAttached", "world", "attach point", [], "llGetAttached() returns integer 0 if not attached.", { returns: "Integer" }),
  fn("llHTTPRequest", "world", "HTTP request url %1 params %2 body %3", [str("URL", "https://"), { name: "PARAMS", check: "List" }, str("BODY", "")], "llHTTPRequest(string url, list parameters, string body) returns key request_id — result in http_response. 1 request / 0.5 s / owner / region caps apply.", { returns: "Key" }),
  fn("llHTTPResponse", "world", "HTTP response id %1 status %2 body %3", [keyArg("REQUEST"), num("STATUS", 200, "int"), str("BODY", "OK")], "llHTTPResponse(key request_id, integer status, string body) — reply to http_request."),
  fn("llRequestURL", "world", "request HTTP-in URL", [], "llRequestURL() returns key — URL arrives via http_request with method URL_REQUEST_GRANTED. This brick discards the query key (legal LSL).", { returns: "Key", discardReturn: true }),
  fn("llRequestSecureURL", "world", "request HTTPS-in URL", [], "llRequestSecureURL() returns key. This brick discards it; the URL still arrives in http_request.", { returns: "Key", discardReturn: true }),
  fn("llReleaseURL", "world", "release URL %1", [str("URL", "")], "llReleaseURL(string url)."),
  fn("llGetNotecardLine", "world", "notecard %1 line %2", [str("NAME", "config"), num("LINE", 0, "int")], "llGetNotecardLine(string name, integer line) returns key queryid — dataserver. 0-based. data == EOF at end.", { returns: "Key" }),
  fn("llGetNumberOfNotecardLines", "world", "notecard line count %1", [str("NAME", "config")], "llGetNumberOfNotecardLines(string name) returns key queryid — dataserver, (integer)data.", { returns: "Key" }),
  fn("llAllowInventoryDrop", "world", "allow inventory drop %1", [{ name: "ADD", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "TRUE" } }], "llAllowInventoryDrop(integer add) — others can drop items; CHANGED_ALLOWED_DROP fires."),
  fn("llPassTouches", "world", "pass touches %1", [{ name: "PASS", check: "Integer", shadow: { kind: "int", value: 1 } }], "llPassTouches(integer pass) — 0 hold, 1 pass after this script, 2 pass even if unhandled."),
  fn("llPassCollisions", "world", "pass collisions %1", [{ name: "PASS", check: "Integer", shadow: { kind: "int", value: 1 } }], "llPassCollisions(integer pass)."),
  fn("llGiveMoney", "world", "give L$ %1 to %2", [num("AMOUNT", 1, "int"), keyArg("DEST")], "llGiveMoney(key destination, integer amount) returns integer. Needs PERMISSION_DEBIT from the owner. This brick discards the return (legal LSL).", { order: ["DEST", "AMOUNT"], returns: "Integer", discardReturn: true }),
  fn("llTeleportAgentHome", "world", "teleport %1 home", [keyArg("AVATAR")], "llTeleportAgentHome(key id) — object owner must be estate manager / land owner."),
  fn("llEjectFromLand", "world", "eject %1 from parcel", [keyArg("AVATAR")], "llEjectFromLand(key avatar) — parcel owner / group abilities required."),
  fn("llBreakAllLinks", "world", "break all links", [], "llBreakAllLinks() — needs PERMISSION_CHANGE_LINKS."),
  fn("llCreateLink", "world", "create link to %1 parent %2", [keyArg("TARGET"), { name: "PARENT", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "TRUE" } }], "llCreateLink(key target, integer parent) — needs PERMISSION_CHANGE_LINKS."),
  fn("llSetLinkPrimitiveParamsFast", "world", "set link params link %1 rules %2", [link, { name: "RULES", check: "List" }], "llSetLinkPrimitiveParamsFast(integer link, list rules) — PRIM_* rules. Preferred over llSetPrimitiveParams (no forced delay)."),
  fn("llGetPrimitiveParams", "world", "get primitive params %1", [{ name: "RULES", check: "List" }], "llGetPrimitiveParams(list params) returns list.", { returns: "List" }),
  fn("llLinksetDataWrite", "world", "linkset data write %1 = %2", [str("NAME", "key"), str("VALUE", "")], "llLinksetDataWrite(string name, string value) returns integer error code (0 = ok). 128 KiB store shared by the linkset. This brick discards the code (legal LSL).", { returns: "Integer", discardReturn: true }),
  fn("llLinksetDataRead", "world", "linkset data read %1", [str("NAME", "key")], "llLinksetDataRead(string name) returns string — empty if missing.", { returns: "String" }),
  fn("llLinksetDataDelete", "world", "linkset data delete %1", [str("NAME", "key")], "llLinksetDataDelete(string name) returns integer. This brick discards it (legal LSL).", { returns: "Integer", discardReturn: true }),
  fn("llLinksetDataCountKeys", "world", "linkset data key count", [], "llLinksetDataCountKeys() returns integer.", { returns: "Integer" }),
  fn("llDamage", "world", "damage %1 amount %2 type %3", [keyArg("TARGET"), num("AMOUNT", 10), { name: "DTYPE", check: "Integer", shadow: { kind: "const", block: "lsl_const_damage", value: "DAMAGE_TYPE_GENERIC" } }], "llDamage(key target, float damage, integer damage_type) — Combat 2.0. Negative amount heals. Throttled ~10/30s per recipient."),
  fn("llAdjustDamage", "world", "adjust damage index %1 to %2", [num("INDEX", 0, "int"), num("AMOUNT", 0)], "llAdjustDamage(integer number, float new_damage) — only legal inside on_damage. Other events shout to DEBUG_CHANNEL."),
  fn("llGetHealth", "world", "health of %1", [keyArg("ID")], "llGetHealth(key id) returns float current health of an avatar or damageable object in the region.", { returns: "Number" }),

  // --- Math (reporters) ---
  fn("llAbs", "operator", "abs %1", [num("VAL", 0, "int")], "llAbs(integer val) returns integer. For floats use llFabs.", { returns: "Integer" }),
  fn("llFabs", "operator", "fabs %1", [num("VAL", 0)], "llFabs(float val) returns float.", { returns: "Number" }),
  fn("llFloor", "operator", "floor %1", [num("VAL", 0)], "llFloor(float val) returns integer.", { returns: "Integer" }),
  fn("llCeil", "operator", "ceil %1", [num("VAL", 0)], "llCeil(float val) returns integer.", { returns: "Integer" }),
  fn("llRound", "operator", "round %1", [num("VAL", 0)], "llRound(float val) returns integer — away from zero on .5.", { returns: "Integer" }),
  fn("llSqrt", "operator", "sqrt %1", [num("VAL", 0)], "llSqrt(float val) returns float. Domain error if val < 0.", { returns: "Number" }),
  fn("llPow", "operator", "%1 ^ %2", [num("BASE", 2), num("EXP", 2)], "llPow(float base, float exponent) returns float.", { returns: "Number" }),
  fn("llSin", "operator", "sin %1", [num("VAL", 0)], "llSin(float theta) — radians.", { returns: "Number" }),
  fn("llCos", "operator", "cos %1", [num("VAL", 0)], "llCos(float theta) — radians.", { returns: "Number" }),
  fn("llTan", "operator", "tan %1", [num("VAL", 0)], "llTan(float theta) — radians.", { returns: "Number" }),
  fn("llAsin", "operator", "asin %1", [num("VAL", 0)], "llAsin(float val) returns radians.", { returns: "Number" }),
  fn("llAcos", "operator", "acos %1", [num("VAL", 0)], "llAcos(float val) returns radians.", { returns: "Number" }),
  fn("llAtan2", "operator", "atan2 y %1 x %2", [num("Y", 0), num("X", 1)], "llAtan2(float y, float x) returns radians.", { returns: "Number" }),
  fn("llLog", "operator", "ln %1", [num("VAL", 1)], "llLog(float val) natural log.", { returns: "Number" }),
  fn("llLog10", "operator", "log10 %1", [num("VAL", 10)], "llLog10(float val).", { returns: "Number" }),
  fn("llFrand", "operator", "random 0 to %1", [num("MAG", 1)], "llFrand(float mag) returns float in [0, mag). Not inclusive of mag.", { returns: "Number" }),
  fn("llVecMag", "operator", "magnitude of %1", [{ name: "V", check: "Vector", shadow: { kind: "vector", x: 1, y: 0, z: 0 } }], "llVecMag(vector v) returns float.", { returns: "Number" }),
  fn("llVecNorm", "operator", "normalize %1", [{ name: "V", check: "Vector", shadow: { kind: "vector", x: 1, y: 0, z: 0 } }], "llVecNorm(vector v) returns vector. ZERO_VECTOR in → ZERO_VECTOR out.", { returns: "Vector" }),
  fn("llVecDist", "operator", "distance %1 to %2", [{ name: "A", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 0 } }, { name: "B", check: "Vector", shadow: { kind: "vector", x: 1, y: 0, z: 0 } }], "llVecDist(vector v1, vector v2) returns float.", { returns: "Number" }),
  fn("llEuler2Rot", "operator", "euler %1 to rotation", [{ name: "EULER", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 0 } }], "llEuler2Rot(vector v) — v in radians. Multiply degrees by DEG_TO_RAD first.", { returns: "Rotation" }),
  fn("llRot2Euler", "operator", "rotation %1 to euler", [{ name: "ROT", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }], "llRot2Euler(rotation r) returns vector radians.", { returns: "Vector" }),
  fn("llRot2Fwd", "operator", "forward of %1", [{ name: "ROT", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }], "llRot2Fwd(rotation r) returns vector.", { returns: "Vector" }),
  fn("llRot2Left", "operator", "left of %1", [{ name: "ROT", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }], "llRot2Left(rotation r) returns vector.", { returns: "Vector" }),
  fn("llRot2Up", "operator", "up of %1", [{ name: "ROT", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }], "llRot2Up(rotation r) returns vector.", { returns: "Vector" }),
  fn("llAxes2Rot", "operator", "axes fwd %1 left %2 up %3 to rotation", [{ name: "FWD", check: "Vector", shadow: { kind: "vector", x: 1, y: 0, z: 0 } }, { name: "LEFT", check: "Vector", shadow: { kind: "vector", x: 0, y: 1, z: 0 } }, { name: "UP", check: "Vector", shadow: { kind: "vector", x: 0, y: 0, z: 1 } }], "llAxes2Rot(vector fwd, vector left, vector up) returns rotation.", { returns: "Rotation" }),
  fn("llRotBetween", "operator", "rotation from %1 to %2", [{ name: "A", check: "Vector", shadow: { kind: "vector", x: 1, y: 0, z: 0 } }, { name: "B", check: "Vector", shadow: { kind: "vector", x: 0, y: 1, z: 0 } }], "llRotBetween(vector start, vector end) returns rotation.", { returns: "Rotation" }),
  fn("llAngleBetween", "operator", "angle between %1 and %2", [{ name: "A", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }, { name: "B", check: "Rotation", shadow: { kind: "const", block: "lsl_const_zerorot" } }], "llAngleBetween(rotation a, rotation b) returns float radians.", { returns: "Number" }),

  // --- Strings ---
  fn("llStringLength", "operator", "length of %1", [str("S", "")], "llStringLength(string str) returns integer — bytes in LSL, not always Unicode characters.", { returns: "Integer" }),
  fn("llToUpper", "operator", "upper %1", [str("S", "")], "llToUpper(string str) returns string.", { returns: "String" }),
  fn("llToLower", "operator", "lower %1", [str("S", "")], "llToLower(string str) returns string.", { returns: "String" }),
  fn("llGetSubString", "operator", "substring of %1 from %2 to %3", [str("S", ""), num("START", 0, "int"), num("END", -1, "int")], "llGetSubString(string src, integer start, integer end) — inclusive, negative from the end.", { returns: "String" }),
  fn("llDeleteSubString", "operator", "delete substring of %1 from %2 to %3", [str("S", ""), num("START", 0, "int"), num("END", 0, "int")], "llDeleteSubString(string src, integer start, integer end) returns string.", { returns: "String" }),
  fn("llInsertString", "operator", "insert %1 into %2 at %3", [str("DST", ""), str("SRC", ""), num("POS", 0, "int")], "llInsertString(string dst, integer position, string src) — generator reorders to official args.", { order: ["DST", "POS", "SRC"], returns: "String" }),
  fn("llSubStringIndex", "operator", "index of %1 in %2", [str("PATTERN", ""), str("SOURCE", "")], "llSubStringIndex(string source, string pattern) returns integer, -1 if missing.", { order: ["SOURCE", "PATTERN"], returns: "Integer" }),
  fn("llStringTrim", "operator", "trim %1 mode %2", [str("S", ""), { name: "MODE", check: "Integer", shadow: { kind: "const", block: "lsl_const_trim", value: "STRING_TRIM" } }], "llStringTrim(string src, integer type) — STRING_TRIM, STRING_TRIM_HEAD, STRING_TRIM_TAIL.", { returns: "String" }),
  fn("llMD5String", "operator", "MD5 of %1 nonce %2", [str("S", ""), num("NONCE", 0, "int")], "llMD5String(string src, integer nonce) returns string hex digest.", { returns: "String" }),
  fn("llSHA1String", "operator", "SHA1 of %1", [str("S", "")], "llSHA1String(string src) returns string hex digest.", { returns: "String" }),
  fn("llEscapeURL", "operator", "escape URL %1", [str("S", "")], "llEscapeURL(string url) returns string.", { returns: "String" }),
  fn("llUnescapeURL", "operator", "unescape URL %1", [str("S", "")], "llUnescapeURL(string url) returns string.", { returns: "String" }),
  fn("llChar", "operator", "char %1", [num("CODE", 65, "int")], "llChar(integer val) returns string of that Unicode code point.", { returns: "String" }),
  fn("llOrd", "operator", "ord %1 index %2", [str("S", "A"), num("INDEX", 0, "int")], "llOrd(string str, integer index) returns integer code point.", { returns: "Integer" }),

  // --- Lists ---
  fn("llGetListLength", "list", "length of list %1", [{ name: "SRC", check: "List" }], "llGetListLength(list src) returns integer.", { returns: "Integer" }),
  fn("llList2String", "list", "item %2 of %1 as string", [{ name: "SRC", check: "List" }, idx], "llList2String(list src, integer index) returns string. Negative index counts from the end.", { returns: "String" }),
  fn("llList2Integer", "list", "item %2 of %1 as integer", [{ name: "SRC", check: "List" }, idx], "llList2Integer(list src, integer index) returns integer.", { returns: "Integer" }),
  fn("llList2Float", "list", "item %2 of %1 as float", [{ name: "SRC", check: "List" }, idx], "llList2Float(list src, integer index) returns float.", { returns: "Number" }),
  fn("llList2Key", "list", "item %2 of %1 as key", [{ name: "SRC", check: "List" }, idx], "llList2Key(list src, integer index) returns key.", { returns: "Key" }),
  fn("llList2Vector", "list", "item %2 of %1 as vector", [{ name: "SRC", check: "List" }, idx], "llList2Vector(list src, integer index) returns vector.", { returns: "Vector" }),
  fn("llList2Rot", "list", "item %2 of %1 as rotation", [{ name: "SRC", check: "List" }, idx], "llList2Rot(list src, integer index) returns rotation.", { returns: "Rotation" }),
  fn("llList2List", "list", "sublist of %1 from %2 to %3", [{ name: "SRC", check: "List" }, num("START", 0, "int"), num("END", -1, "int")], "llList2List(list src, integer start, integer end) returns list, inclusive.", { returns: "List" }),
  fn("llDeleteSubList", "list", "delete items %2 to %3 of %1", [{ name: "SRC", check: "List" }, num("START", 0, "int"), num("END", 0, "int")], "llDeleteSubList(list src, integer start, integer end) returns list.", { returns: "List" }),
  fn("llListInsertList", "list", "insert %2 into %1 at %3", [{ name: "DEST", check: "List" }, { name: "SRC", check: "List" }, num("START", 0, "int")], "llListInsertList(list dest, list src, integer start) returns list.", { returns: "List" }),
  fn("llListReplaceList", "list", "replace %2 to %3 of %1 with %4", [{ name: "DEST", check: "List" }, num("START", 0, "int"), num("END", 0, "int"), { name: "SRC", check: "List" }], "llListReplaceList(list dest, list src, integer start, integer end) — generator reorders to official args.", { order: ["DEST", "SRC", "START", "END"], returns: "List" }),
  fn("llListFindList", "list", "find %2 in %1", [{ name: "SRC", check: "List" }, { name: "TEST", check: "List" }], "llListFindList(list src, list test) returns integer index or -1.", { returns: "Integer" }),
  fn("llListSort", "list", "sort %1 stride %2 ascending %3", [{ name: "SRC", check: "List" }, num("STRIDE", 1, "int"), { name: "ASC", check: ["Boolean", "Integer"], shadow: { kind: "const", block: "lsl_const_bool", value: "TRUE" } }], "llListSort(list src, integer stride, integer ascending) returns list.", { returns: "List" }),
  fn("llListRandomize", "list", "randomize %1 stride %2", [{ name: "SRC", check: "List" }, num("STRIDE", 1, "int")], "llListRandomize(list src, integer stride) returns list.", { returns: "List" }),
  fn("llDumpList2String", "list", "join %1 with %2", [{ name: "SRC", check: "List" }, str("SEP", ", ")], "llDumpList2String(list src, string separator) returns string.", { returns: "String" }),
  fn("llParseString2List", "list", "split %1 on %2 keep %3", [str("SRC", ""), { name: "SEPS", check: "List" }, { name: "SPACERS", check: "List" }], "llParseString2List(string src, list separators, list spacers) returns list. Max 8 separators and 8 spacers.", { returns: "List" }),
  fn("llCSV2List", "list", "CSV %1 to list", [str("SRC", "")], "llCSV2List(string src) returns list.", { returns: "List" }),
  fn("llList2CSV", "list", "list %1 to CSV", [{ name: "SRC", check: "List" }], "llList2CSV(list src) returns string.", { returns: "String" }),
  fn("llListStatistics", "list", "stats %1 of %2", [{ name: "OP", check: "Integer", shadow: { kind: "const", block: "lsl_const_stats", value: "LIST_STAT_SUM" } }, { name: "SRC", check: "List" }], "llListStatistics(integer operation, list src) returns float.", { returns: "Number" }),
];

for (const f of LSL_FUNCTIONS) {
  f.tooltip = delayNote(f.ll, f.tooltip);
}

export const CAT_LABEL: Record<CategoryId, string> = {
  event: "Events",
  control: "Control",
  looks: "Looks",
  motion: "Motion",
  sound: "Sound",
  sensing: "Sensing",
  chat: "Chat",
  world: "World",
  operator: "Operators",
  variable: "Variables",
  list: "Lists",
  fn: "My functions",
  constant: "Constants",
};

export function fallbackLiteral(check: LslCheck | LslCheck[]): string {
  const c = Array.isArray(check) ? check[0] : check;
  switch (c) {
    case "Integer":
    case "Number":
      return "0";
    case "String":
      return '""';
    case "Key":
      return "NULL_KEY";
    case "Vector":
      return "ZERO_VECTOR";
    case "Rotation":
      return "ZERO_ROTATION";
    case "List":
      return "[]";
    case "Boolean":
      return "FALSE";
    default:
      return "0";
  }
}

export function wikiFn(ll: string): string {
  return `https://wiki.secondlife.com/wiki/${ll.charAt(0).toUpperCase()}${ll.slice(1)}`;
}
