import { CAT, type CategoryId } from "./colors";
import { LSL_EVENT_DEFS } from "./events";
import { LSL_FUNCTIONS } from "./functions";
import { shadowFromSpec } from "./blocks";

function cat(name: string, colour: string, contents: object[]) {
  return { kind: "category", name, colour, contents };
}

function block(type: string, inputs?: Record<string, unknown>, fields?: Record<string, unknown>) {
  const item: Record<string, unknown> = { kind: "block", type };
  if (inputs && Object.keys(inputs).length) item.inputs = inputs;
  if (fields) item.fields = fields;
  return item;
}

function shadowNum(kind: "int" | "float", value: number) {
  return {
    shadow: {
      kind: "block",
      type: kind === "int" ? "lsl_integer" : "lsl_float",
      fields: { NUM: value },
    },
  };
}

function fnItems(category: CategoryId): object[] {
  return LSL_FUNCTIONS.filter((f) => f.category === category).map((fn) => {
    const inputs: Record<string, unknown> = {};
    for (const a of fn.args) {
      if (a.shadow) inputs[a.name] = { shadow: shadowFromSpec(a.shadow) };
    }
    return block(fn.type, inputs);
  });
}

const boolTrue = { shadow: { kind: "block", type: "lsl_const_bool", fields: { VAL: "TRUE" } } };
const num0 = shadowNum("int", 0);
const num1 = shadowNum("float", 1);
const vecInputs = {
  X: shadowNum("float", 0),
  Y: shadowNum("float", 0),
  Z: shadowNum("float", 0),
};

export function buildToolbox() {
  return {
    kind: "categoryToolbox",
    contents: [
      cat("Events", CAT.event, [
        ...LSL_EVENT_DEFS.map((ev) => block(ev.type, undefined, { STATE: "default" })),
      ]),
      cat("Control", CAT.control, [
        block("lsl_if", { COND: boolTrue }),
        block("lsl_ifelse", { COND: boolTrue }),
        block("lsl_repeat", { TIMES: shadowNum("int", 10) }),
        block("lsl_while", { COND: boolTrue }),
        block("lsl_dowhile", { COND: boolTrue }),
        block("lsl_forever", { SLEEP: shadowNum("float", 0.1) }),
        block("lsl_state_change", undefined, { NAME: "default" }),
        block("lsl_return"),
        block("lsl_comment"),
        block("lsl_group", undefined, { NAME: "logic" }),
        block("lsl_raw_stmt"),
        block("lsl_eval"),
      ]),
      cat("Looks", CAT.looks, [
        ...fnItems("looks"),
        block("lsl_color_named"),
        block("lsl_particles_sparkle", {
          COLOR: { shadow: { kind: "block", type: "lsl_color_named", fields: { COL: "<1.000, 0.900, 0.000>" } } },
        }),
        block("lsl_particles_off"),
        block("lsl_glow", {
          GLOW: shadowNum("float", 0.25),
          FACE: { shadow: { kind: "block", type: "lsl_const_face", fields: { VAL: "ALL_SIDES" } } },
        }),
        block("lsl_fullbright", {
          ON: boolTrue,
          FACE: { shadow: { kind: "block", type: "lsl_const_face", fields: { VAL: "ALL_SIDES" } } },
        }),
        block("lsl_point_light", {
          ON: boolTrue,
          COLOR: { shadow: { kind: "block", type: "lsl_color_named" } },
          INT: shadowNum("float", 1),
          RAD: shadowNum("float", 8),
          FALL: shadowNum("float", 0.75),
        }),
      ]),
      cat("Motion", CAT.motion, [
        ...fnItems("motion"),
        block("lsl_vector", vecInputs),
        block("lsl_rotation", {
          ...vecInputs,
          S: shadowNum("float", 1),
        }),
        block("lsl_euler_rot", {
          DEG: { shadow: { kind: "block", type: "lsl_vector", inputs: vecInputs } },
        }),
      ]),
      cat("Sound", CAT.sound, fnItems("sound")),
      cat("Chat", CAT.chat, fnItems("chat")),
      cat("Sensing", CAT.sensing, [
        ...fnItems("sensing"),
        block("lsl_param"),
      ]),
      cat("World", CAT.world, [
        block("lsl_notecard_read", undefined, { NAME: "config", STATE: "default" }),
        block("lsl_nc_if_key", undefined, { KEY: "greeting" }),
        block("lsl_nc_assign"),
        block("lsl_nc_line"),
        block("lsl_nc_key"),
        block("lsl_nc_value"),
        block("lsl_nc_index"),
        block("lsl_nc_ready", undefined, { NAME: "config" }),
        ...fnItems("world"),
      ]),
      cat("Operators", CAT.operator, [
        block("lsl_arithmetic", { A: num1, B: num1 }),
        block("lsl_compare", { A: num0, B: num0 }),
        block("lsl_logic", { A: boolTrue, B: boolTrue }),
        block("lsl_not", { A: boolTrue }),
        block("lsl_bitwise", { A: num0, B: num0 }),
        block("lsl_negate", { A: num1 }),
        block("lsl_cast"),
        block("lsl_paren"),
        block("lsl_component"),
        block("lsl_integer"),
        block("lsl_float"),
        block("lsl_string"),
        block("lsl_raw_expr"),
        ...fnItems("operator"),
      ]),
      {
        kind: "category",
        name: "Variables",
        colour: CAT.variable,
        custom: "LSL_VARIABLES",
      },
      cat("Lists", CAT.list, [
        block("lsl_empty_list"),
        block("lsl_list"),
        ...fnItems("list"),
      ]),
      cat("My functions", CAT.fn, [
        block("lsl_function"),
        block("lsl_call"),
        block("lsl_call_expr"),
      ]),
      cat("Constants", CAT.constant, [
        block("lsl_const_bool"),
        block("lsl_const_nullkey"),
        block("lsl_const_zerovec"),
        block("lsl_const_zerorot"),
        block("lsl_const_face"),
        block("lsl_const_link"),
        block("lsl_const_math"),
        block("lsl_const_channel"),
        block("lsl_const_status"),
        block("lsl_const_changed"),
        block("lsl_const_perm"),
        block("lsl_const_sensor"),
        block("lsl_const_inv"),
        block("lsl_const_control"),
        block("lsl_const_click"),
        block("lsl_const_pay"),
        block("lsl_const_agentdata"),
        block("lsl_const_trim"),
        block("lsl_const_stats"),
        block("lsl_const_eof"),
        block("lsl_const_damage"),
        block("lsl_const_gamebtn"),
      ]),
    ],
  };
}
