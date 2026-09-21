import { CAT } from "./colors";
import type { LslEventName } from "./reserved";

export type EventParam = { type: string; name: string };

export type EventDef = {
  id: LslEventName;
  type: string;
  hat: string;
  params: EventParam[];
  signature: string;
  tooltip: string;
  helpUrl: string;
  colour: string;
};

function wikiEvent(name: string): string {
  return `https://wiki.secondlife.com/wiki/${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function ev(
  id: LslEventName,
  hat: string,
  params: EventParam[],
  tooltip: string,
): EventDef {
  const signature = `${id}(${params.map((p) => `${p.type} ${p.name}`).join(", ")})`;
  return {
    id,
    type: `lsl_event_${id}`,
    hat,
    params,
    signature,
    tooltip: `${signature}\n${tooltip}`,
    helpUrl: wikiEvent(id),
    colour: CAT.event,
  };
}

const N = { type: "integer", name: "num_detected" };

/** Complete classic + modern LSL event set with official signatures. */
export const LSL_EVENT_DEFS: EventDef[] = [
  ev("state_entry", "when entering state %1", [], "Fires on script start, reset, and every time this state is entered. Always first in the queue."),
  ev("state_exit", "when leaving state %1", [], "Fires when switching away from this state, just before the event queue is cleared."),
  ev("touch_start", "when touched in state %1", [N], "Fires once when an agent begins touching. Use llDetected* with index 0..num_detected-1."),
  ev("touch", "while held in state %1", [N], "Fires repeatedly while the touch is held. Prefer touch_start unless you need a hold."),
  ev("touch_end", "when touch released in state %1", [N], "Fires when the toucher releases. Detection data is still valid here."),
  ev("collision_start", "when collision starts in state %1", [N], "Fires when this object starts colliding with another object or avatar."),
  ev("collision", "while colliding in state %1", [N], "Fires while the collision continues."),
  ev("collision_end", "when collision ends in state %1", [N], "Fires when the collision stops."),
  ev("land_collision_start", "when hitting ground in state %1", [{ type: "vector", name: "pos" }], "Fires when colliding with terrain. pos is the land contact point."),
  ev("land_collision", "while on ground in state %1", [{ type: "vector", name: "pos" }], "Fires while colliding with terrain."),
  ev("land_collision_end", "when leaving ground in state %1", [{ type: "vector", name: "pos" }], "Fires when terrain collision ends."),
  ev("timer", "when timer fires in state %1", [], "Fires on the interval set by llSetTimerEvent. Pass 0.0 to stop. Timer is cleared on state change."),
  ev(
    "listen",
    "when chat heard in state %1",
    [
      { type: "integer", name: "channel" },
      { type: "string", name: "name" },
      { type: "key", name: "id" },
      { type: "string", name: "message" },
    ],
    "Fires for chat matching an llListen handle. Listens are removed on state change — set them up again in state_entry.",
  ),
  ev("sensor", "when sensor detects in state %1", [N], "Result of llSensor / llSensorRepeat. Up to 16 detections, nearest first."),
  ev("no_sensor", "when sensor finds nothing in state %1", [], "Fires when a sensor sweep matches nothing."),
  ev(
    "control",
    "when controls change in state %1",
    [
      { type: "key", name: "id" },
      { type: "integer", name: "level" },
      { type: "integer", name: "edge" },
    ],
    "Requires PERMISSION_TAKE_CONTROLS and llTakeControls. level is currently held; edge is what just changed.",
  ),
  ev(
    "dataserver",
    "when dataserver replies in state %1",
    [
      { type: "key", name: "queryid" },
      { type: "string", name: "data" },
    ],
    "Replies for notecards, llRequestAgentData, llGetNotecardLine, etc. data is EOF at end of notecard.",
  ),
  ev(
    "http_response",
    "when HTTP response arrives in state %1",
    [
      { type: "key", name: "request_id" },
      { type: "integer", name: "status" },
      { type: "list", name: "metadata" },
      { type: "string", name: "body" },
    ],
    "Reply to llHTTPRequest. status is the HTTP code (or a negative LSL error). body is truncated to 2048 bytes (16384 with HTTP_BODY_MAXLENGTH).",
  ),
  ev(
    "http_request",
    "when HTTP request received in state %1",
    [
      { type: "key", name: "request_id" },
      { type: "string", name: "method" },
      { type: "string", name: "body" },
    ],
    "Inbound request to the script's HTTP-in URL from llRequestURL / llRequestSecureURL. Reply with llHTTPResponse.",
  ),
  ev(
    "link_message",
    "when link message received in state %1",
    [
      { type: "integer", name: "sender_num" },
      { type: "integer", name: "num" },
      { type: "string", name: "str" },
      { type: "key", name: "id" },
    ],
    "Message from llMessageLinked in this linkset. Scripts do not receive their own link messages.",
  ),
  ev("changed", "when object changed in state %1", [{ type: "integer", name: "change" }], "Bitfield of CHANGED_* flags. Test with bitwise AND, e.g. change & CHANGED_OWNER."),
  ev("attach", "when attached or detached in state %1", [{ type: "key", name: "id" }], "id is the avatar when attaching, NULL_KEY when detaching."),
  ev("on_rez", "when rezzed in state %1", [{ type: "integer", name: "start_param" }], "Fires when the object is rezzed. start_param comes from llRezObject. Common pattern: llResetScript()."),
  ev("object_rez", "when this rezzes an object in state %1", [{ type: "key", name: "id" }], "Fires in the rezzer with the new object's key."),
  ev(
    "money",
    "when money received in state %1",
    [
      { type: "key", name: "id" },
      { type: "integer", name: "amount" },
    ],
    "Fires when this object is paid. Debit/give requires PERMISSION_DEBIT from the owner.",
  ),
  ev("run_time_permissions", "when permissions granted in state %1", [{ type: "integer", name: "perm" }], "Fires after llRequestPermissions. perm is the granted bitfield."),
  ev("experience_permissions", "when experience permissions granted in state %1", [{ type: "key", name: "agent_id" }], "The agent accepted experience permissions."),
  ev(
    "experience_permissions_denied",
    "when experience permissions denied in state %1",
    [
      { type: "key", name: "agent_id" },
      { type: "integer", name: "reason" },
    ],
    "The agent denied experience permissions, or they could not be granted.",
  ),
  ev(
    "at_target",
    "when at position target in state %1",
    [
      { type: "integer", name: "tnum" },
      { type: "vector", name: "targetpos" },
      { type: "vector", name: "ourpos" },
    ],
    "Reached an llTarget handle. Physical objects only.",
  ),
  ev("not_at_target", "when not at position target in state %1", [], "No longer at the llTarget location."),
  ev(
    "at_rot_target",
    "when at rotation target in state %1",
    [
      { type: "integer", name: "tnum" },
      { type: "rotation", name: "targetrot" },
      { type: "rotation", name: "ourrot" },
    ],
    "Reached an llRotTarget handle.",
  ),
  ev("not_at_rot_target", "when not at rotation target in state %1", [], "No longer at the llRotTarget rotation."),
  ev("moving_start", "when movement starts in state %1", [], "The object started moving."),
  ev("moving_end", "when movement ends in state %1", [], "The object stopped moving."),
  ev(
    "email",
    "when email received in state %1",
    [
      { type: "string", name: "time" },
      { type: "string", name: "address" },
      { type: "string", name: "subject" },
      { type: "string", name: "message" },
      { type: "integer", name: "num_left" },
    ],
    "Fires after llGetNextEmail. Address is <script-key>@lsl.secondlife.com.",
  ),
  ev(
    "remote_data",
    "when remote data in state %1",
    [
      { type: "integer", name: "event_type" },
      { type: "key", name: "channel" },
      { type: "key", name: "message_id" },
      { type: "string", name: "sender" },
      { type: "integer", name: "idata" },
      { type: "string", name: "sdata" },
    ],
    "XML-RPC remote data (legacy). Prefer HTTP-in for new work.",
  ),
  ev(
    "transaction_result",
    "when L$ transfer result in state %1",
    [
      { type: "key", name: "id" },
      { type: "integer", name: "success" },
      { type: "string", name: "data" },
    ],
    "Result of llTransferLindenDollars. success is TRUE/FALSE.",
  ),
  ev(
    "path_update",
    "when pathfinding updates in state %1",
    [
      { type: "integer", name: "type" },
      { type: "list", name: "reserved" },
    ],
    "Pathfinding character status. type is a PU_* constant.",
  ),
  ev(
    "linkset_data",
    "when linkset data changes in state %1",
    [
      { type: "integer", name: "action" },
      { type: "string", name: "name" },
      { type: "string", name: "value" },
    ],
    "Fires for llLinksetDataWrite / Delete / Reset. action is LINKSETDATA_UPDATE, LINKSETDATA_DELETE, or LINKSETDATA_RESET.",
  ),
  ev(
    "on_damage",
    "when damage pending in state %1",
    [N],
    "Combat 2.0. Fires before damage is applied. llDetected* plus llDetectedDamage / llAdjustDamage are valid here. Region must allow damage adjustment.",
  ),
  ev(
    "final_damage",
    "when damage applied in state %1",
    [N],
    "Combat 2.0. Fires after every on_damage handler has run and the damage is applied. llDetected* and llDetectedDamage are valid here.",
  ),
  ev("on_death", "when this avatar dies in state %1", [], "Combat 2.0. Fires on attachments worn by an avatar when health reaches 0. No parameters."),
  ev(
    "game_control",
    "when gamepad input in state %1",
    [
      { type: "key", name: "id" },
      { type: "integer", name: "button_levels" },
      { type: "list", name: "axes" },
    ],
    "Needs PERMISSION_GAME_CONTROL (auto-granted on attach / sit). button_levels is a GAME_CONTROL_BUTTON_* bitfield. axes is six floats in [-1, 1].",
  ),
];
