import * as Blockly from "blockly/core";
import type { Block } from "blockly/core";
import { CAT } from "./colors";
import { installDynamicTypes } from "./dynamics";
import { LSL_EVENT_DEFS } from "./events";
import { LSL_FUNCTIONS, wikiFn, type ShadowSpec } from "./functions";
import { lslGenerator, Order, stripIndent, valueCode, wireFunctionGenerators } from "./generator";
import { lslStringLiteral, sanitizeIdent } from "./reserved";
import { ncGlobalNames } from "./notecard";
import { cableIdent, cableNameOf } from "./cables";

let registered = false;

function dropdown(name: string, options: [string, string][]): object {
  return { type: "field_dropdown", name, options };
}

function numField(name: string, value: number, precision = 0): object {
  return { type: "field_number", name, value, precision };
}

function textField(name: string, text: string): object {
  return { type: "field_input", name, text, spellcheck: false };
}

export function registerBlocks() {
  if (registered) return;
  registered = true;

  const eventJson = LSL_EVENT_DEFS.map((ev) => ({
    type: ev.type,
    message0: ev.hat,
    args0: [textField("STATE", "default")],
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO" }],
    colour: ev.colour,
    tooltip: ev.tooltip,
    helpUrl: ev.helpUrl,
  }));

  const fnJson = LSL_FUNCTIONS.map((fn) => {
    const args0 = fn.args.map((a) => ({
      type: "input_value",
      name: a.name,
      check: a.check,
    }));
    const def: Record<string, unknown> = {
      type: fn.type,
      message0: fn.message,
      args0,
      inputsInline: true,
      colour: CAT[fn.category],
      tooltip: fn.tooltip,
      helpUrl: wikiFn(fn.ll),
    };
    if (fn.returns && !fn.discardReturn) def.output = fn.returns;
    else {
      def.previousStatement = null;
      def.nextStatement = null;
    }
    return def;
  });

  const extraJson: Record<string, unknown>[] = [
    {
      type: "lsl_integer",
      message0: "%1",
      args0: [numField("NUM", 0, 1)],
      output: "Integer",
      colour: CAT.operator,
      tooltip: "integer literal (32-bit signed).",
    },
    {
      type: "lsl_float",
      message0: "%1",
      args0: [numField("NUM", 0, 0)],
      output: "Number",
      colour: CAT.operator,
      tooltip: "float literal. LSL promotes integer to float in mixed math.",
    },
    {
      type: "lsl_string",
      message0: "%1",
      args0: [{ type: "field_input", name: "TEXT", text: "Hello, Avatar!" }],
      output: "String",
      colour: CAT.operator,
      tooltip: "string literal. Quote escaping is applied when compiling.",
    },
    {
      type: "lsl_vector",
      message0: "<%1, %2, %3>",
      args0: [
        { type: "input_value", name: "X", check: "Number" },
        { type: "input_value", name: "Y", check: "Number" },
        { type: "input_value", name: "Z", check: "Number" },
      ],
      inputsInline: true,
      output: "Vector",
      colour: CAT.motion,
      tooltip: "vector <x, y, z> — positions, colors (0–1), and euler triples.",
    },
    {
      type: "lsl_rotation",
      message0: "<%1, %2, %3, %4>",
      args0: [
        { type: "input_value", name: "X", check: "Number" },
        { type: "input_value", name: "Y", check: "Number" },
        { type: "input_value", name: "Z", check: "Number" },
        { type: "input_value", name: "S", check: "Number" },
      ],
      inputsInline: true,
      output: "Rotation",
      colour: CAT.motion,
      tooltip: "rotation <x, y, z, s> quaternion. Prefer euler degrees → rotation for human angles.",
    },
    {
      type: "lsl_euler_rot",
      message0: "euler degrees %1 to rotation",
      args0: [{ type: "input_value", name: "DEG", check: "Vector" }],
      output: "Rotation",
      colour: CAT.motion,
      tooltip: "llEuler2Rot(degrees * DEG_TO_RAD). LSL euler is radians; this brick converts for you.",
    },
    {
      type: "lsl_component",
      message0: "%1 . %2",
      args0: [
        { type: "input_value", name: "VAL", check: ["Vector", "Rotation"] },
        dropdown("COMP", [
          ["x", "x"],
          ["y", "y"],
          ["z", "z"],
          ["s", "s"],
        ]),
      ],
      inputsInline: true,
      output: "Number",
      colour: CAT.operator,
      tooltip: "Component access. .s is only valid on rotation.",
    },
    {
      type: "lsl_list",
      message0: "[ %1 , %2 , %3 , %4 ]",
      args0: [
        { type: "input_value", name: "A", check: ["Integer", "Number", "String", "Key", "Vector", "Rotation", "Boolean"] },
        { type: "input_value", name: "B", check: ["Integer", "Number", "String", "Key", "Vector", "Rotation", "Boolean"] },
        { type: "input_value", name: "C", check: ["Integer", "Number", "String", "Key", "Vector", "Rotation", "Boolean"] },
        { type: "input_value", name: "D", check: ["Integer", "Number", "String", "Key", "Vector", "Rotation", "Boolean"] },
      ],
      inputsInline: true,
      output: "List",
      colour: CAT.list,
      tooltip: "List literal. Leave sockets empty to omit. Lists cannot contain lists.",
    },
    {
      type: "lsl_empty_list",
      message0: "empty list",
      output: "List",
      colour: CAT.list,
      tooltip: "[]",
    },
    {
      type: "lsl_cast",
      message0: "(%1) %2",
      args0: [
        dropdown("TYPE", [
          ["integer", "integer"],
          ["float", "float"],
          ["string", "string"],
          ["key", "key"],
          ["vector", "vector"],
          ["rotation", "rotation"],
          ["list", "list"],
        ]),
        { type: "input_value", name: "VAL" },
      ],
      inputsInline: true,
      output: null,
      colour: CAT.operator,
      tooltip: "Explicit cast. Required to concatenate numbers into strings: (string)n",
    },
    {
      type: "lsl_arithmetic",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: ["Integer", "Number", "Boolean", "Vector", "Rotation", "String", "Key", "List"] },
        dropdown("OP", [
          ["+", "+"],
          ["-", "-"],
          ["×", "*"],
          ["÷", "/"],
          ["mod", "%"],
        ]),
        { type: "input_value", name: "B", check: ["Integer", "Number", "Boolean", "Vector", "Rotation", "String", "Key", "List"] },
      ],
      inputsInline: true,
      output: null,
      colour: CAT.operator,
      tooltip: "+ concatenates strings and adds numbers/vectors. % is integer modulo only.",
    },
    {
      type: "lsl_compare",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A" },
        dropdown("OP", [
          ["=", "=="],
          ["≠", "!="],
          ["<", "<"],
          [">", ">"],
          ["≤", "<="],
          ["≥", ">="],
        ]),
        { type: "input_value", name: "B" },
      ],
      inputsInline: true,
      output: "Boolean",
      colour: CAT.operator,
      tooltip: "LSL has no ===. TRUE is 1, FALSE is 0.",
    },
    {
      type: "lsl_logic",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: ["Boolean", "Integer"] },
        dropdown("OP", [
          ["and", "&&"],
          ["or", "||"],
        ]),
        { type: "input_value", name: "B", check: ["Boolean", "Integer"] },
      ],
      inputsInline: true,
      output: "Boolean",
      colour: CAT.operator,
    },
    {
      type: "lsl_not",
      message0: "not %1",
      args0: [{ type: "input_value", name: "A", check: ["Boolean", "Integer"] }],
      output: "Boolean",
      colour: CAT.operator,
    },
    {
      type: "lsl_bitwise",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: ["Integer", "Boolean"] },
        dropdown("OP", [
          ["bit and", "&"],
          ["bit or", "|"],
          ["bit xor", "^"],
          ["shift left", "<<"],
          ["shift right", ">>"],
        ]),
        { type: "input_value", name: "B", check: ["Integer", "Boolean"] },
      ],
      inputsInline: true,
      output: "Integer",
      colour: CAT.operator,
      tooltip: "Use bit and to test flags: change & CHANGED_OWNER",
    },
    {
      type: "lsl_negate",
      message0: "- %1",
      args0: [{ type: "input_value", name: "A", check: ["Integer", "Number", "Vector"] }],
      output: "Number",
      colour: CAT.operator,
    },
    {
      type: "lsl_paren",
      message0: "( %1 )",
      args0: [{ type: "input_value", name: "VAL" }],
      output: null,
      colour: CAT.operator,
    },
    {
      type: "lsl_if",
      message0: "if %1",
      args0: [{ type: "input_value", name: "COND", check: ["Boolean", "Integer"] }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.control,
      tooltip: "if (condition) { ... } — LSL treats 0 as false, anything else as true.",
    },
    {
      type: "lsl_ifelse",
      message0: "if %1",
      args0: [{ type: "input_value", name: "COND", check: ["Boolean", "Integer"] }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      message2: "else",
      message3: "%1",
      args3: [{ type: "input_statement", name: "ELSE" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.control,
    },
    {
      type: "lsl_while",
      message0: "while %1",
      args0: [{ type: "input_value", name: "COND", check: ["Boolean", "Integer"] }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.control,
      tooltip: "while loops without llSleep or a timer will hit the 0.05s time slice and may stack-heap collide.",
    },
    {
      type: "lsl_dowhile",
      message0: "do",
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      message2: "while %1",
      args2: [{ type: "input_value", name: "COND", check: ["Boolean", "Integer"] }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.control,
    },
    {
      type: "lsl_repeat",
      message0: "repeat %1 times",
      args0: [{ type: "input_value", name: "TIMES", check: ["Integer", "Number"] }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.control,
      tooltip: "LSL cannot declare the loop variable inside for (). PrimBlocks emits integer _i; for (_i = 0; _i < n; ++_i).",
    },
    {
      type: "lsl_forever",
      message0: "loop forever, yield %1 s",
      args0: [{ type: "input_value", name: "SLEEP", check: "Number" }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.control,
      tooltip: "while (TRUE) { ... llSleep(n); } — the yield keeps the script from locking the simulator slice.",
    },
    {
      type: "lsl_state_change",
      message0: "switch to state %1",
      args0: [textField("NAME", "default")],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.control,
      tooltip: "state name; — immediately ends this event, runs state_exit, clears the queue, then enters the target. Not allowed in user functions.",
    },
    {
      type: "lsl_return",
      message0: "return %1",
      args0: [{ type: "input_value", name: "VAL" }],
      previousStatement: null,
      colour: CAT.control,
      tooltip: "return; or return expr; — events cannot return a value.",
    },
    {
      type: "lsl_comment",
      message0: "// %1",
      args0: [{ type: "field_input", name: "TEXT", text: "note" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.constant,
    },
    {
      type: "lsl_raw_stmt",
      message0: "raw LSL %1",
      args0: [{ type: "field_input", name: "CODE", text: "llOwnerSay(\"ok\");" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.constant,
      tooltip: "Escape hatch. Emitted as-is. Use for functions not yet bricked.",
    },
    {
      type: "lsl_eval",
      message0: "run %1 (discard return)",
      args0: [{ type: "input_value", name: "VAL" }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: CAT.control,
      tooltip:
        "LSL lets you throw away a return value. Snap a reporter (llHTTPRequest, llGetNotecardLine, …) here to emit call;",
    },
    {
      type: "lsl_raw_expr",
      message0: "raw expr %1",
      args0: [{ type: "field_input", name: "CODE", text: "TRUE" }],
      output: null,
      colour: CAT.constant,
    },
    {
      type: "lsl_function",
      message0: "define %1 returning %2",
      args0: [
        textField("NAME", "doThing"),
        dropdown("RET", [
          ["nothing", ""],
          ["integer", "integer"],
          ["float", "float"],
          ["string", "string"],
          ["key", "key"],
          ["vector", "vector"],
          ["rotation", "rotation"],
          ["list", "list"],
        ]),
      ],
      message1: "args %1",
      args1: [textField("PARAMS", "")],
      message2: "%1",
      args2: [{ type: "input_statement", name: "STACK" }],
      message3: "return %1",
      args3: [{ type: "input_value", name: "RETURN" }],
      colour: CAT.fn,
      tooltip: "User function. Place at workspace top, not inside an event. Args example: integer n, string s. Cannot change state.",
      helpUrl: "https://wiki.secondlife.com/wiki/User-defined_functions",
    },
    {
      type: "lsl_call",
      message0: "call %1 ( %2 , %3 , %4 )",
      args0: [
        textField("NAME", "doThing"),
        { type: "input_value", name: "A" },
        { type: "input_value", name: "B" },
        { type: "input_value", name: "C" },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: CAT.fn,
    },
    {
      type: "lsl_call_expr",
      message0: "call %1 ( %2 , %3 , %4 )",
      args0: [
        textField("NAME", "doThing"),
        { type: "input_value", name: "A" },
        { type: "input_value", name: "B" },
        { type: "input_value", name: "C" },
      ],
      inputsInline: true,
      output: null,
      colour: CAT.fn,
    },
    {
      type: "lsl_set_var",
      message0: "set %1 to %2",
      args0: [
        { type: "field_variable", name: "VAR", variable: "item" },
        { type: "input_value", name: "VALUE" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.variable,
    },
    {
      type: "lsl_get_var",
      message0: "%1",
      args0: [{ type: "field_variable", name: "VAR" }],
      output: null,
      colour: CAT.variable,
    },
    {
      type: "lsl_change_var",
      message0: "change %1 by %2",
      args0: [
        { type: "field_variable", name: "VAR", variable: "item" },
        { type: "input_value", name: "DELTA", check: ["Integer", "Number", "Boolean"] },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.variable,
      tooltip: "Works for integer and float. Emits name += delta;",
    },
    {
      type: "lsl_particles_off",
      message0: "stop particles",
      previousStatement: null,
      nextStatement: null,
      colour: CAT.looks,
      tooltip: "llParticleSystem([]);",
    },
    {
      type: "lsl_particles_sparkle",
      message0: "sparkle particles color %1",
      args0: [{ type: "input_value", name: "COLOR", check: "Vector" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.looks,
      tooltip: "A complete legal PSYS_* rule list. Color is 0–1 RGB.",
    },
    {
      type: "lsl_glow",
      message0: "set glow %1 on face %2",
      args0: [
        { type: "input_value", name: "GLOW", check: "Number" },
        { type: "input_value", name: "FACE", check: "Integer" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.looks,
      tooltip: "llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, face, glow]); glow 0.0–1.0.",
    },
    {
      type: "lsl_fullbright",
      message0: "fullbright %1 on face %2",
      args0: [
        { type: "input_value", name: "ON", check: ["Boolean", "Integer"] },
        { type: "input_value", name: "FACE", check: "Integer" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.looks,
    },
    {
      type: "lsl_point_light",
      message0: "point light %1 color %2 intensity %3 radius %4 falloff %5",
      args0: [
        { type: "input_value", name: "ON", check: ["Boolean", "Integer"] },
        { type: "input_value", name: "COLOR", check: "Vector" },
        { type: "input_value", name: "INT", check: "Number" },
        { type: "input_value", name: "RAD", check: "Number" },
        { type: "input_value", name: "FALL", check: "Number" },
      ],
      inputsInline: false,
      previousStatement: null,
      nextStatement: null,
      colour: CAT.looks,
      tooltip: "PRIM_POINT_LIGHT — TRUE, color, intensity 0–1, radius meters, falloff 0–2 typically.",
    },
    {
      type: "lsl_color_named",
      message0: "color %1",
      args0: [
        dropdown("COL", [
          ["white", "<1.000, 1.000, 1.000>"],
          ["black", "<0.000, 0.000, 0.000>"],
          ["red", "<1.000, 0.000, 0.000>"],
          ["green", "<0.000, 1.000, 0.000>"],
          ["blue", "<0.000, 0.350, 1.000>"],
          ["yellow", "<1.000, 0.900, 0.000>"],
          ["cyan", "<0.000, 1.000, 1.000>"],
          ["magenta", "<1.000, 0.000, 1.000>"],
          ["orange", "<1.000, 0.450, 0.000>"],
          ["pink", "<1.000, 0.400, 0.700>"],
          ["gold", "<0.950, 0.750, 0.200>"],
          ["teal", "<0.290, 0.659, 0.612>"],
        ]),
      ],
      output: "Vector",
      colour: CAT.looks,
      tooltip: "LSL colors are vectors of 0.0–1.0, not 0–255.",
    },
    constBlock("lsl_const_bool", "Boolean", [
      ["true", "TRUE"],
      ["false", "FALSE"],
    ]),
    constBlock("lsl_const_nullkey", "Key", [["NULL_KEY", "NULL_KEY"]]),
    constBlock("lsl_const_zerovec", "Vector", [["ZERO_VECTOR", "ZERO_VECTOR"]]),
    constBlock("lsl_const_zerorot", "Rotation", [["ZERO_ROTATION", "ZERO_ROTATION"]]),
    constBlock("lsl_const_face", "Integer", [
      ["all sides", "ALL_SIDES"],
      ["face 0", "0"],
      ["face 1", "1"],
      ["face 2", "2"],
      ["face 3", "3"],
      ["face 4", "4"],
      ["face 5", "5"],
    ]),
    constBlock("lsl_const_link", "Integer", [
      ["this prim", "LINK_THIS"],
      ["whole set", "LINK_SET"],
      ["root", "LINK_ROOT"],
      ["all children", "LINK_ALL_CHILDREN"],
      ["all others", "LINK_ALL_OTHERS"],
    ]),
    constBlock("lsl_const_math", "Number", [
      ["PI", "PI"],
      ["TWO_PI", "TWO_PI"],
      ["PI_BY_TWO", "PI_BY_TWO"],
      ["DEG_TO_RAD", "DEG_TO_RAD"],
      ["RAD_TO_DEG", "RAD_TO_DEG"],
      ["SQRT2", "SQRT2"],
    ]),
    constBlock("lsl_const_channel", "Integer", [
      ["PUBLIC_CHANNEL (0)", "PUBLIC_CHANNEL"],
      ["DEBUG_CHANNEL", "DEBUG_CHANNEL"],
    ]),
    constBlock("lsl_const_status", "Integer", [
      ["STATUS_PHYSICS", "STATUS_PHYSICS"],
      ["STATUS_PHANTOM", "STATUS_PHANTOM"],
      ["STATUS_ROTATE_X", "STATUS_ROTATE_X"],
      ["STATUS_ROTATE_Y", "STATUS_ROTATE_Y"],
      ["STATUS_ROTATE_Z", "STATUS_ROTATE_Z"],
      ["STATUS_SANDBOX", "STATUS_SANDBOX"],
      ["STATUS_BLOCK_GRAB", "STATUS_BLOCK_GRAB"],
      ["STATUS_DIE_AT_EDGE", "STATUS_DIE_AT_EDGE"],
      ["STATUS_RETURN_AT_EDGE", "STATUS_RETURN_AT_EDGE"],
    ]),
    constBlock("lsl_const_changed", "Integer", [
      ["CHANGED_INVENTORY", "CHANGED_INVENTORY"],
      ["CHANGED_COLOR", "CHANGED_COLOR"],
      ["CHANGED_SHAPE", "CHANGED_SHAPE"],
      ["CHANGED_SCALE", "CHANGED_SCALE"],
      ["CHANGED_TEXTURE", "CHANGED_TEXTURE"],
      ["CHANGED_LINK", "CHANGED_LINK"],
      ["CHANGED_ALLOWED_DROP", "CHANGED_ALLOWED_DROP"],
      ["CHANGED_OWNER", "CHANGED_OWNER"],
      ["CHANGED_REGION", "CHANGED_REGION"],
      ["CHANGED_TELEPORT", "CHANGED_TELEPORT"],
      ["CHANGED_REGION_START", "CHANGED_REGION_START"],
      ["CHANGED_MEDIA", "CHANGED_MEDIA"],
    ]),
    constBlock("lsl_const_perm", "Integer", [
      ["PERMISSION_TRIGGER_ANIMATION", "PERMISSION_TRIGGER_ANIMATION"],
      ["PERMISSION_TAKE_CONTROLS", "PERMISSION_TAKE_CONTROLS"],
      ["PERMISSION_DEBIT", "PERMISSION_DEBIT"],
      ["PERMISSION_ATTACH", "PERMISSION_ATTACH"],
      ["PERMISSION_TRACK_CAMERA", "PERMISSION_TRACK_CAMERA"],
      ["PERMISSION_CONTROL_CAMERA", "PERMISSION_CONTROL_CAMERA"],
      ["PERMISSION_TELEPORT", "PERMISSION_TELEPORT"],
      ["PERMISSION_CHANGE_LINKS", "PERMISSION_CHANGE_LINKS"],
      ["PERMISSION_OVERRIDE_ANIMATIONS", "PERMISSION_OVERRIDE_ANIMATIONS"],
      ["PERMISSION_RETURN_OBJECTS", "PERMISSION_RETURN_OBJECTS"],
      ["PERMISSION_GAME_CONTROL", "PERMISSION_GAME_CONTROL"],
    ]),
    constBlock("lsl_const_sensor", "Integer", [
      ["AGENT", "AGENT"],
      ["AGENT_BY_USERNAME", "AGENT_BY_USERNAME"],
      ["AGENT_BY_LEGACY_NAME", "AGENT_BY_LEGACY_NAME"],
      ["ACTIVE", "ACTIVE"],
      ["PASSIVE", "PASSIVE"],
      ["SCRIPTED", "SCRIPTED"],
      ["DAMAGEABLE", "DAMAGEABLE"],
    ]),
    constBlock("lsl_const_inv", "Integer", [
      ["INVENTORY_ALL", "INVENTORY_ALL"],
      ["INVENTORY_TEXTURE", "INVENTORY_TEXTURE"],
      ["INVENTORY_SOUND", "INVENTORY_SOUND"],
      ["INVENTORY_OBJECT", "INVENTORY_OBJECT"],
      ["INVENTORY_SCRIPT", "INVENTORY_SCRIPT"],
      ["INVENTORY_LANDMARK", "INVENTORY_LANDMARK"],
      ["INVENTORY_CLOTHING", "INVENTORY_CLOTHING"],
      ["INVENTORY_NOTECARD", "INVENTORY_NOTECARD"],
      ["INVENTORY_BODYPART", "INVENTORY_BODYPART"],
      ["INVENTORY_ANIMATION", "INVENTORY_ANIMATION"],
      ["INVENTORY_GESTURE", "INVENTORY_GESTURE"],
    ]),
    constBlock("lsl_const_control", "Integer", [
      ["CONTROL_FWD", "CONTROL_FWD"],
      ["CONTROL_BACK", "CONTROL_BACK"],
      ["CONTROL_LEFT", "CONTROL_LEFT"],
      ["CONTROL_RIGHT", "CONTROL_RIGHT"],
      ["CONTROL_ROT_LEFT", "CONTROL_ROT_LEFT"],
      ["CONTROL_ROT_RIGHT", "CONTROL_ROT_RIGHT"],
      ["CONTROL_UP", "CONTROL_UP"],
      ["CONTROL_DOWN", "CONTROL_DOWN"],
      ["CONTROL_LBUTTON", "CONTROL_LBUTTON"],
      ["CONTROL_ML_LBUTTON", "CONTROL_ML_LBUTTON"],
    ]),
    constBlock("lsl_const_click", "Integer", [
      ["CLICK_ACTION_TOUCH", "CLICK_ACTION_TOUCH"],
      ["CLICK_ACTION_SIT", "CLICK_ACTION_SIT"],
      ["CLICK_ACTION_BUY", "CLICK_ACTION_BUY"],
      ["CLICK_ACTION_PAY", "CLICK_ACTION_PAY"],
      ["CLICK_ACTION_OPEN", "CLICK_ACTION_OPEN"],
      ["CLICK_ACTION_PLAY", "CLICK_ACTION_PLAY"],
      ["CLICK_ACTION_OPEN_MEDIA", "CLICK_ACTION_OPEN_MEDIA"],
      ["CLICK_ACTION_ZOOM", "CLICK_ACTION_ZOOM"],
      ["CLICK_ACTION_NONE", "CLICK_ACTION_NONE"],
    ]),
    constBlock("lsl_const_pay", "Integer", [
      ["PAY_DEFAULT", "PAY_DEFAULT"],
      ["PAY_HIDE", "PAY_HIDE"],
    ]),
    constBlock("lsl_const_agentdata", "Integer", [
      ["DATA_NAME", "DATA_NAME"],
      ["DATA_ONLINE", "DATA_ONLINE"],
      ["DATA_BORN", "DATA_BORN"],
      ["DATA_RATING", "DATA_RATING"],
      ["DATA_PAYINFO", "DATA_PAYINFO"],
    ]),
    constBlock("lsl_const_trim", "Integer", [
      ["STRING_TRIM", "STRING_TRIM"],
      ["STRING_TRIM_HEAD", "STRING_TRIM_HEAD"],
      ["STRING_TRIM_TAIL", "STRING_TRIM_TAIL"],
    ]),
    constBlock("lsl_const_stats", "Integer", [
      ["LIST_STAT_SUM", "LIST_STAT_SUM"],
      ["LIST_STAT_MIN", "LIST_STAT_MIN"],
      ["LIST_STAT_MAX", "LIST_STAT_MAX"],
      ["LIST_STAT_MEAN", "LIST_STAT_MEAN"],
      ["LIST_STAT_MEDIAN", "LIST_STAT_MEDIAN"],
      ["LIST_STAT_STD_DEV", "LIST_STAT_STD_DEV"],
      ["LIST_STAT_GEOMETRIC_MEAN", "LIST_STAT_GEOMETRIC_MEAN"],
      ["LIST_STAT_NUM_COUNT", "LIST_STAT_NUM_COUNT"],
      ["LIST_STAT_RANGE", "LIST_STAT_RANGE"],
    ]),
    constBlock("lsl_const_eof", "String", [
      ["EOF", "EOF"],
      ["NAK", "NAK"],
    ]),
    constBlock("lsl_const_damage", "Integer", [
      ["DAMAGE_TYPE_IMPACT", "DAMAGE_TYPE_IMPACT"],
      ["DAMAGE_TYPE_GENERIC", "DAMAGE_TYPE_GENERIC"],
      ["DAMAGE_TYPE_ACID", "DAMAGE_TYPE_ACID"],
      ["DAMAGE_TYPE_BLUDGEONING", "DAMAGE_TYPE_BLUDGEONING"],
      ["DAMAGE_TYPE_COLD", "DAMAGE_TYPE_COLD"],
      ["DAMAGE_TYPE_ELECTRIC", "DAMAGE_TYPE_ELECTRIC"],
      ["DAMAGE_TYPE_FIRE", "DAMAGE_TYPE_FIRE"],
      ["DAMAGE_TYPE_FORCE", "DAMAGE_TYPE_FORCE"],
      ["DAMAGE_TYPE_NECROTIC", "DAMAGE_TYPE_NECROTIC"],
      ["DAMAGE_TYPE_PIERCING", "DAMAGE_TYPE_PIERCING"],
      ["DAMAGE_TYPE_POISON", "DAMAGE_TYPE_POISON"],
      ["DAMAGE_TYPE_PSYCHIC", "DAMAGE_TYPE_PSYCHIC"],
      ["DAMAGE_TYPE_RADIANT", "DAMAGE_TYPE_RADIANT"],
      ["DAMAGE_TYPE_SLASHING", "DAMAGE_TYPE_SLASHING"],
      ["DAMAGE_TYPE_SONIC", "DAMAGE_TYPE_SONIC"],
      ["DAMAGE_TYPE_EMOTIONAL", "DAMAGE_TYPE_EMOTIONAL"],
    ]),
    constBlock("lsl_const_gamebtn", "Integer", [
      ["GAME_CONTROL_BUTTON_A", "GAME_CONTROL_BUTTON_A"],
      ["GAME_CONTROL_BUTTON_B", "GAME_CONTROL_BUTTON_B"],
      ["GAME_CONTROL_BUTTON_X", "GAME_CONTROL_BUTTON_X"],
      ["GAME_CONTROL_BUTTON_Y", "GAME_CONTROL_BUTTON_Y"],
      ["GAME_CONTROL_BUTTON_SOUTH", "GAME_CONTROL_BUTTON_SOUTH"],
      ["GAME_CONTROL_BUTTON_EAST", "GAME_CONTROL_BUTTON_EAST"],
      ["GAME_CONTROL_BUTTON_WEST", "GAME_CONTROL_BUTTON_WEST"],
      ["GAME_CONTROL_BUTTON_NORTH", "GAME_CONTROL_BUTTON_NORTH"],
      ["GAME_CONTROL_BUTTON_START", "GAME_CONTROL_BUTTON_START"],
      ["GAME_CONTROL_BUTTON_BACK", "GAME_CONTROL_BUTTON_BACK"],
      ["GAME_CONTROL_BUTTON_LEFTSHOULDER", "GAME_CONTROL_BUTTON_LEFTSHOULDER"],
      ["GAME_CONTROL_BUTTON_RIGHTSHOULDER", "GAME_CONTROL_BUTTON_RIGHTSHOULDER"],
      ["GAME_CONTROL_BUTTON_DPAD_UP", "GAME_CONTROL_BUTTON_DPAD_UP"],
      ["GAME_CONTROL_BUTTON_DPAD_DOWN", "GAME_CONTROL_BUTTON_DPAD_DOWN"],
      ["GAME_CONTROL_BUTTON_DPAD_LEFT", "GAME_CONTROL_BUTTON_DPAD_LEFT"],
      ["GAME_CONTROL_BUTTON_DPAD_RIGHT", "GAME_CONTROL_BUTTON_DPAD_RIGHT"],
    ]),
    {
      type: "lsl_param",
      message0: "event value %1",
      args0: [
        dropdown("NAME", [
          ["num_detected", "num_detected"],
          ["channel", "channel"],
          ["name", "name"],
          ["id", "id"],
          ["message", "message"],
          ["change", "change"],
          ["perm", "perm"],
          ["start_param", "start_param"],
          ["queryid", "queryid"],
          ["data", "data"],
          ["pos", "pos"],
          ["amount", "amount"],
          ["str", "str"],
          ["num", "num"],
          ["sender_num", "sender_num"],
          ["request_id", "request_id"],
          ["status", "status"],
          ["body", "body"],
          ["method", "method"],
          ["button_levels", "button_levels"],
          ["axes", "axes"],
        ]),
      ],
      output: null,
      colour: CAT.sensing,
      tooltip: "Official event parameter name. Only valid inside the matching event brick.",
    },
    {
      type: "lsl_notecard_read",
      message0: "read notecard %1 in state %2",
      args0: [textField("NAME", "config"), textField("STATE", "default")],
      message1: "reload when inventory changes %1",
      args1: [{ type: "field_checkbox", name: "RELOAD", checked: true }],
      message2: "for each line / setting %1",
      args2: [{ type: "input_statement", name: "DO" }],
      message3: "when finished %1",
      args3: [{ type: "input_statement", name: "DONE" }],
      message4: "if notecard missing %1",
      args4: [{ type: "input_statement", name: "MISSING" }],
      colour: CAT.world,
      tooltip:
        "Real notecard reader: inventory check, llGetNotecardLine, dataserver, EOF, NAK retry, next line. Skips # // and blank lines. Inventory name must match the Notecard panel. 0.1s delay per line.",
      helpUrl: "https://wiki.secondlife.com/wiki/LlGetNotecardLine",
    },
    {
      type: "lsl_nc_line",
      message0: "notecard line",
      output: "String",
      colour: CAT.world,
      tooltip: "Trimmed line text inside a read-notecard hat. Comments and blanks never reach this.",
    },
    {
      type: "lsl_nc_key",
      message0: "setting key",
      output: "String",
      colour: CAT.world,
      tooltip: "Left of the first =. Empty for a raw line (access lists).",
    },
    {
      type: "lsl_nc_value",
      message0: "setting value",
      output: "String",
      colour: CAT.world,
      tooltip: "Right of the first =. Whole line if there is no equals.",
    },
    {
      type: "lsl_nc_index",
      message0: "notecard line number",
      output: "Integer",
      colour: CAT.world,
      tooltip: "0-based index passed to llGetNotecardLine.",
    },
    {
      type: "lsl_nc_ready",
      message0: "notecard %1 ready",
      args0: [textField("NAME", "config")],
      output: "Integer",
      colour: CAT.world,
      tooltip: "TRUE after EOF. FALSE while reading or if the notecard was missing. Safe in any event.",
    },
    {
      type: "lsl_nc_if_key",
      message0: "if setting %1",
      args0: [textField("KEY", "greeting")],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.world,
      tooltip: "Runs when this line's key matches. Snap set-from-setting inside.",
    },
    {
      type: "lsl_nc_assign",
      message0: "set %1 from this setting",
      args0: [
        {
          type: "field_variable",
          name: "VAR",
          variable: "greeting",
          variableTypes: ["integer", "float", "string", "key", "vector", "rotation", "list"],
          defaultType: "string",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.world,
      tooltip: "Casts the setting value to the variable's type.",
    },
    {
      type: "lsl_group",
      message0: "group %1",
      args0: [textField("NAME", "logic")],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: CAT.chat,
      tooltip:
        "Frame a stack so you can read it. Does not change LSL. Name it for the job. Set a variable at the edge when another group needs the value — the noodle draws itself.",
    },
    {
      type: "lsl_cable_send",
      message0: "send %1 along %2",
      args0: [
        { type: "input_value", name: "VALUE" },
        textField("CABLE", "greeting"),
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: CAT.chat,
      tooltip:
        "Writes this value to a named cable (a typed global). Drop a matching receive elsewhere — a noodle is drawn between them.",
    },
    {
      type: "lsl_cable_recv",
      message0: "along %1",
      args0: [textField("CABLE", "greeting")],
      output: null,
      colour: CAT.chat,
      tooltip:
        "Reads the last value sent on this cable. Name must match a send. Same idea as wiring two nodes, compiled as a global.",
    },
  ];

  Blockly.common.defineBlocksWithJsonArray([
    ...eventJson,
    ...fnJson,
    ...extraJson,
  ] as unknown as object[]);

  installDynamicTypes();

  for (const ev of LSL_EVENT_DEFS) {
    lslGenerator.forBlock[ev.type] = (block, generator) => {
      const body = generator.statementToCode(block, "DO");
      return `${ev.signature}\n{\n${body}}\n`;
    };
  }

  wireFunctionGenerators();

  lslGenerator.forBlock.lsl_integer = (block) => {
    const n = Number(block.getFieldValue("NUM"));
    return [String(Math.trunc(n)), Order.ATOMIC];
  };
  lslGenerator.forBlock.lsl_float = (block) => {
    const n = Number(block.getFieldValue("NUM"));
    let s = String(n);
    if (!s.includes(".")) s += ".0";
    return [s, Order.ATOMIC];
  };
  lslGenerator.forBlock.lsl_string = (block) => [
    lslStringLiteral(String(block.getFieldValue("TEXT") ?? "")),
    Order.ATOMIC,
  ];
  lslGenerator.forBlock.lsl_vector = (block, g) => {
    const x = valueCode(block, g, "X", "0.0");
    const y = valueCode(block, g, "Y", "0.0");
    const z = valueCode(block, g, "Z", "0.0");
    return [`<${x}, ${y}, ${z}>`, Order.ATOMIC];
  };
  lslGenerator.forBlock.lsl_rotation = (block, g) => {
    const x = valueCode(block, g, "X", "0.0");
    const y = valueCode(block, g, "Y", "0.0");
    const z = valueCode(block, g, "Z", "0.0");
    const s = valueCode(block, g, "S", "1.0");
    return [`<${x}, ${y}, ${z}, ${s}>`, Order.ATOMIC];
  };
  lslGenerator.forBlock.lsl_euler_rot = (block, g) => {
    const v = valueCode(block, g, "DEG", "ZERO_VECTOR", Order.MULTIPLICATIVE);
    return [`llEuler2Rot(${v} * DEG_TO_RAD)`, Order.FUNCTION_CALL];
  };
  lslGenerator.forBlock.lsl_component = (block, g) => {
    const v = valueCode(block, g, "VAL", "ZERO_VECTOR", Order.MEMBER);
    const c = block.getFieldValue("COMP");
    return [`${v}.${c}`, Order.MEMBER];
  };
  lslGenerator.forBlock.lsl_list = (block, g) => {
    const parts = ["A", "B", "C", "D"]
      .map((n) => g.valueToCode(block, n, Order.NONE))
      .filter(Boolean);
    return [`[${parts.join(", ")}]`, Order.ATOMIC];
  };
  lslGenerator.forBlock.lsl_empty_list = () => ["[]", Order.ATOMIC];
  lslGenerator.forBlock.lsl_cast = (block, g) => {
    const t = block.getFieldValue("TYPE");
    const v = valueCode(block, g, "VAL", "0", Order.UNARY);
    return [`(${t})${v}`, Order.UNARY];
  };
  lslGenerator.forBlock.lsl_arithmetic = (block, g) => {
    const op = block.getFieldValue("OP") as string;
    const order =
      op === "+" || op === "-"
        ? Order.ADDITIVE
        : Order.MULTIPLICATIVE;
    const a = valueCode(block, g, "A", "0", order);
    const b = valueCode(block, g, "B", "0", order);
    return [`${a} ${op} ${b}`, order];
  };
  lslGenerator.forBlock.lsl_compare = (block, g) => {
    const op = block.getFieldValue("OP") as string;
    const order = op === "==" || op === "!=" ? Order.EQUALITY : Order.RELATIONAL;
    const a = valueCode(block, g, "A", "0", order);
    const b = valueCode(block, g, "B", "0", order);
    return [`${a} ${op} ${b}`, order];
  };
  lslGenerator.forBlock.lsl_logic = (block, g) => {
    const op = block.getFieldValue("OP") as string;
    const order = op === "&&" ? Order.LOGICAL_AND : Order.LOGICAL_OR;
    const a = valueCode(block, g, "A", "FALSE", order);
    const b = valueCode(block, g, "B", "FALSE", order);
    return [`${a} ${op} ${b}`, order];
  };
  lslGenerator.forBlock.lsl_not = (block, g) => {
    const a = valueCode(block, g, "A", "FALSE", Order.UNARY);
    return [`!${a}`, Order.UNARY];
  };
  lslGenerator.forBlock.lsl_bitwise = (block, g) => {
    const op = block.getFieldValue("OP") as string;
    const order =
      op === "<<" || op === ">>"
        ? Order.SHIFT
        : op === "&"
          ? Order.BITWISE_AND
          : op === "^"
            ? Order.BITWISE_XOR
            : Order.BITWISE_OR;
    const a = valueCode(block, g, "A", "0", order);
    const b = valueCode(block, g, "B", "0", order);
    return [`${a} ${op} ${b}`, order];
  };
  lslGenerator.forBlock.lsl_negate = (block, g) => {
    const a = valueCode(block, g, "A", "0", Order.UNARY);
    return [`-${a}`, Order.UNARY];
  };
  lslGenerator.forBlock.lsl_paren = (block, g) => {
    const v = valueCode(block, g, "VAL", "0", Order.NONE);
    return [`(${v})`, Order.ATOMIC];
  };
  lslGenerator.forBlock.lsl_if = (block, g) => {
    const cond = valueCode(block, g, "COND", "FALSE");
    const body = g.statementToCode(block, "DO");
    return `if (${cond})\n{\n${body}}\n`;
  };
  lslGenerator.forBlock.lsl_ifelse = (block, g) => {
    const cond = valueCode(block, g, "COND", "FALSE");
    const body = g.statementToCode(block, "DO");
    const els = g.statementToCode(block, "ELSE");
    return `if (${cond})\n{\n${body}}\nelse\n{\n${els}}\n`;
  };
  lslGenerator.forBlock.lsl_while = (block, g) => {
    const cond = valueCode(block, g, "COND", "FALSE");
    const body = g.statementToCode(block, "DO");
    return `while (${cond})\n{\n${body}}\n`;
  };
  lslGenerator.forBlock.lsl_dowhile = (block, g) => {
    const cond = valueCode(block, g, "COND", "FALSE");
    const body = g.statementToCode(block, "DO");
    return `do\n{\n${body}}\nwhile (${cond});\n`;
  };
  lslGenerator.forBlock.lsl_repeat = (block, g) => {
    const times = valueCode(block, g, "TIMES", "1");
    const body = g.statementToCode(block, "DO");
    const id = sanitizeIdent(`_i_${block.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 8)}`, "_i");
    return `integer ${id};\nfor (${id} = 0; ${id} < ${times}; ++${id})\n{\n${body}}\n`;
  };
  lslGenerator.forBlock.lsl_forever = (block, g) => {
    const sl = valueCode(block, g, "SLEEP", "0.1");
    const body = g.statementToCode(block, "DO");
    return `while (TRUE)\n{\n${body}${g.INDENT}llSleep(${sl});\n}\n`;
  };
  lslGenerator.forBlock.lsl_state_change = (block) => {
    const name = sanitizeIdent(String(block.getFieldValue("NAME") || "default"), "default");
    const target = String(block.getFieldValue("NAME") || "").trim() === "default" ? "default" : name;
    return `state ${target};\n`;
  };
  lslGenerator.forBlock.lsl_return = (block, g) => {
    const v = g.valueToCode(block, "VAL", Order.NONE);
    return v ? `return ${v};\n` : "return;\n";
  };
  lslGenerator.forBlock.lsl_comment = (block) => {
    const t = String(block.getFieldValue("TEXT") ?? "").replace(/\n/g, " ");
    return `// ${t}\n`;
  };
  lslGenerator.forBlock.lsl_raw_stmt = (block) => {
    let code = String(block.getFieldValue("CODE") ?? "").trim();
    if (code && !code.endsWith(";") && !code.endsWith("}")) code += ";";
    return code ? `${code}\n` : "";
  };
  lslGenerator.forBlock.lsl_eval = (block, g) => {
    const v = g.valueToCode(block, "VAL", Order.NONE) || "0";
    return `${v};\n`;
  };
  lslGenerator.forBlock.lsl_raw_expr = (block) => [
    String(block.getFieldValue("CODE") || "0"),
    Order.ATOMIC,
  ];
  lslGenerator.forBlock.lsl_function = (block, g) => {
    const name = sanitizeIdent(String(block.getFieldValue("NAME") || "doThing"), "doThing");
    const ret = String(block.getFieldValue("RET") || "");
    const params = String(block.getFieldValue("PARAMS") || "").trim();
    const body = g.statementToCode(block, "STACK");
    const retVal = g.valueToCode(block, "RETURN", Order.NONE);
    const retLine = ret && retVal ? `${g.INDENT}return ${retVal};\n` : retVal ? `${g.INDENT}return ${retVal};\n` : "";
    const header = ret ? `${ret} ${name}(${params})` : `${name}(${params})`;
    return `${header}\n{\n${body}${retLine}}\n`;
  };
  lslGenerator.forBlock.lsl_call = callStmt;
  lslGenerator.forBlock.lsl_call_expr = (block, g) => [callInner(block, g), Order.FUNCTION_CALL];
  lslGenerator.forBlock.lsl_set_var = (block, g) => {
    const name = varName(block);
    const val = valueCode(block, g, "VALUE", "0");
    return `${name} = ${val};\n`;
  };
  lslGenerator.forBlock.lsl_get_var = (block) => [varName(block), Order.ATOMIC];
  lslGenerator.forBlock.lsl_change_var = (block, g) => {
    const name = varName(block);
    const d = valueCode(block, g, "DELTA", "1");
    return `${name} += ${d};\n`;
  };
  lslGenerator.forBlock.lsl_particles_off = () => "llParticleSystem([]);\n";
  lslGenerator.forBlock.lsl_particles_sparkle = (block, g) => {
    const c = valueCode(block, g, "COLOR", "<1.0, 1.0, 1.0>");
    return (
      "llParticleSystem([\n" +
      "    PSYS_PART_FLAGS, PSYS_PART_EMISSIVE_MASK | PSYS_PART_INTERP_COLOR_MASK | PSYS_PART_FOLLOW_VELOCITY_MASK,\n" +
      "    PSYS_SRC_PATTERN, PSYS_SRC_PATTERN_EXPLODE,\n" +
      `    PSYS_PART_START_COLOR, ${c},\n` +
      `    PSYS_PART_END_COLOR, ${c},\n` +
      "    PSYS_PART_START_ALPHA, 1.0,\n" +
      "    PSYS_PART_END_ALPHA, 0.0,\n" +
      "    PSYS_PART_START_SCALE, <0.04, 0.04, 0.0>,\n" +
      "    PSYS_PART_END_SCALE, <0.08, 0.08, 0.0>,\n" +
      "    PSYS_PART_MAX_AGE, 1.5,\n" +
      "    PSYS_SRC_BURST_RATE, 0.12,\n" +
      "    PSYS_SRC_BURST_PART_COUNT, 8,\n" +
      "    PSYS_SRC_BURST_SPEED_MIN, 0.05,\n" +
      "    PSYS_SRC_BURST_SPEED_MAX, 0.45,\n" +
      "    PSYS_SRC_MAX_AGE, 0.0\n" +
      "]);\n"
    );
  };
  lslGenerator.forBlock.lsl_glow = (block, g) => {
    const glow = valueCode(block, g, "GLOW", "0.2");
    const face = valueCode(block, g, "FACE", "ALL_SIDES");
    return `llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ${face}, ${glow}]);\n`;
  };
  lslGenerator.forBlock.lsl_fullbright = (block, g) => {
    const on = valueCode(block, g, "ON", "TRUE");
    const face = valueCode(block, g, "FACE", "ALL_SIDES");
    return `llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_FULLBRIGHT, ${face}, ${on}]);\n`;
  };
  lslGenerator.forBlock.lsl_point_light = (block, g) => {
    const on = valueCode(block, g, "ON", "TRUE");
    const c = valueCode(block, g, "COLOR", "<1.0, 1.0, 1.0>");
    const i = valueCode(block, g, "INT", "1.0");
    const r = valueCode(block, g, "RAD", "10.0");
    const f = valueCode(block, g, "FALL", "0.75");
    return `llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_POINT_LIGHT, ${on}, ${c}, ${i}, ${r}, ${f}]);\n`;
  };
  lslGenerator.forBlock.lsl_color_named = (block) => [
    String(block.getFieldValue("COL")),
    Order.ATOMIC,
  ];
  lslGenerator.forBlock.lsl_param = (block) => [
    String(block.getFieldValue("NAME")),
    Order.ATOMIC,
  ];
  lslGenerator.forBlock.lsl_notecard_read = () => "";
  lslGenerator.forBlock.lsl_nc_line = () => ["_nc_raw", Order.ATOMIC];
  lslGenerator.forBlock.lsl_nc_key = () => ["_nc_key", Order.ATOMIC];
  lslGenerator.forBlock.lsl_nc_value = () => ["_nc_val", Order.ATOMIC];
  lslGenerator.forBlock.lsl_nc_index = (block) => {
    const names = ncGlobalNames(enclosingNotecard(block));
    return [names.lineVar, Order.ATOMIC];
  };
  lslGenerator.forBlock.lsl_nc_ready = (block) => {
    const names = ncGlobalNames(String(block.getFieldValue("NAME") || "config"));
    return [names.readyVar, Order.ATOMIC];
  };
  lslGenerator.forBlock.lsl_nc_if_key = (block, g) => {
    const key = lslStringLiteral(String(block.getFieldValue("KEY") || ""));
    const body = g.statementToCode(block, "DO");
    return `if (_nc_key == ${key})\n{\n${body}}\n`;
  };
  lslGenerator.forBlock.lsl_nc_assign = (block) => {
    const name = varName(block);
    const field = block.getField("VAR") as Blockly.FieldVariable | null;
    const t = field?.getVariable()?.getType() || "string";
    let rhs = "_nc_val";
    if (t === "integer") rhs = "(integer)_nc_val";
    else if (t === "float") rhs = "(float)_nc_val";
    else if (t === "key") rhs = "(key)_nc_val";
    else if (t === "vector") rhs = "(vector)_nc_val";
    else if (t === "rotation") rhs = "(rotation)_nc_val";
    else if (t === "list") rhs = "llCSV2List(_nc_val)";
    return `${name} = ${rhs};\n`;
  };

  lslGenerator.forBlock.lsl_group = (block, g) => {
    const name = String(block.getFieldValue("NAME") || "group").trim() || "group";
    const body = stripIndent(String(g.statementToCode(block, "DO") || ""));
    return `// group ${name}\n${body}`;
  };
  lslGenerator.forBlock.lsl_cable_send = (block, g) => {
    const ident = cableIdent(cableNameOf(block) || "wire");
    const val = g.valueToCode(block, "VALUE", Order.ASSIGNMENT) || '""';
    return `${ident} = ${val};\n`;
  };
  lslGenerator.forBlock.lsl_cable_recv = (block) => [
    cableIdent(cableNameOf(block) || "wire"),
    Order.ATOMIC,
  ];

  const constTypes = [
    "lsl_const_bool",
    "lsl_const_nullkey",
    "lsl_const_zerovec",
    "lsl_const_zerorot",
    "lsl_const_face",
    "lsl_const_link",
    "lsl_const_math",
    "lsl_const_channel",
    "lsl_const_status",
    "lsl_const_changed",
    "lsl_const_perm",
    "lsl_const_sensor",
    "lsl_const_inv",
    "lsl_const_control",
    "lsl_const_click",
    "lsl_const_pay",
    "lsl_const_agentdata",
    "lsl_const_trim",
    "lsl_const_stats",
    "lsl_const_eof",
    "lsl_const_damage",
    "lsl_const_gamebtn",
  ];
  for (const t of constTypes) {
    lslGenerator.forBlock[t] = (block) => [String(block.getFieldValue("VAL")), Order.ATOMIC];
  }
}

function constBlock(
  type: string,
  output: string,
  options: [string, string][],
): Record<string, unknown> {
  return {
    type,
    message0: "%1",
    args0: [{ type: "field_dropdown", name: "VAL", options }],
    output,
    colour: CAT.constant,
    tooltip: options.map(([, v]) => v).join(", "),
  };
}


function enclosingNotecard(block: Block): string {
  let p: Block | null = block;
  while (p) {
    if (p.type === "lsl_notecard_read") {
      return String(p.getFieldValue("NAME") || "config");
    }
    p = p.getSurroundParent() ?? p.getParent();
  }
  return "config";
}

function varName(block: Block): string {
  const field = block.getField("VAR") as Blockly.FieldVariable | null;
  const model = field?.getVariable();
  const name = model?.getName() ?? String(block.getFieldValue("VAR") ?? "item");
  return sanitizeIdent(name, "item");
}

function callInner(block: Block, g: Blockly.CodeGenerator): string {
  const name = sanitizeIdent(String(block.getFieldValue("NAME") || "doThing"), "doThing");
  const args = ["A", "B", "C"].map((n) => g.valueToCode(block, n, Order.NONE)).filter(Boolean);
  return `${name}(${args.join(", ")})`;
}

function callStmt(block: Block, g: Blockly.CodeGenerator): string {
  return `${callInner(block, g)};\n`;
}

/** Toolbox shadow helper used by toolbox.ts */
export function shadowFromSpec(spec: ShadowSpec): Record<string, unknown> {
  switch (spec.kind) {
    case "int":
      return { kind: "block", type: "lsl_integer", fields: { NUM: spec.value } };
    case "float":
      return { kind: "block", type: "lsl_float", fields: { NUM: spec.value } };
    case "string":
      return { kind: "block", type: "lsl_string", fields: { TEXT: spec.value } };
    case "vector":
      return {
        kind: "block",
        type: "lsl_vector",
        inputs: {
          X: { shadow: { kind: "block", type: "lsl_float", fields: { NUM: spec.x } } },
          Y: { shadow: { kind: "block", type: "lsl_float", fields: { NUM: spec.y } } },
          Z: { shadow: { kind: "block", type: "lsl_float", fields: { NUM: spec.z } } },
        },
      };
    case "rotation":
      return {
        kind: "block",
        type: "lsl_rotation",
        inputs: {
          X: { shadow: { kind: "block", type: "lsl_float", fields: { NUM: spec.x } } },
          Y: { shadow: { kind: "block", type: "lsl_float", fields: { NUM: spec.y } } },
          Z: { shadow: { kind: "block", type: "lsl_float", fields: { NUM: spec.z } } },
          S: { shadow: { kind: "block", type: "lsl_float", fields: { NUM: spec.s } } },
        },
      };
    case "bool":
      return { kind: "block", type: "lsl_const_bool", fields: { VAL: "TRUE" } };
    case "const":
      return {
        kind: "block",
        type: spec.block,
        fields: spec.value ? { VAL: spec.value } : {},
      };
    default:
      return { kind: "block", type: "lsl_integer", fields: { NUM: 0 } };
  }
}
