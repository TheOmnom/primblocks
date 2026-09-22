import { LSL_EVENT_DEFS } from "./events.ts";
import { LSL_FUNCTIONS, type FnArg, type FnDef } from "./functions.ts";
import {
  exprCallName,
  exprIsIdent,
  exprIsTrue,
  parseLsl,
  type Expr,
  type ScriptAst,
  type Stmt,
} from "./parse-lsl.ts";
import { LSL_EVENTS, lslStringLiteral } from "./reserved.ts";

export type ImportResult = {
  state: object;
  warnings: string[];
  brickCount: number;
};

type BlockJson = Record<string, unknown>;

type VarInfo = { name: string; type: string; id: string };

type Ctx = {
  vars: Map<string, VarInfo>;
  eventParams: Set<string>;
  warnings: string[];
};

const FN_BY_LL = new Map<string, FnDef>(LSL_FUNCTIONS.map((fn) => [fn.ll, fn]));
const EVENT_IDS = new Set<string>(LSL_EVENTS);

const PARAM_NAMES = new Set([
  "num_detected",
  "channel",
  "name",
  "id",
  "message",
  "change",
  "perm",
  "start_param",
  "queryid",
  "data",
  "pos",
  "amount",
  "str",
  "num",
  "sender_num",
  "request_id",
  "status",
  "body",
  "method",
  "button_levels",
  "axes",
]);

const COLORS: Record<string, string> = {
  "<1.000, 1.000, 1.000>": "white",
  "<0.000, 0.000, 0.000>": "black",
  "<1.000, 0.000, 0.000>": "red",
  "<0.000, 1.000, 0.000>": "green",
  "<0.000, 0.350, 1.000>": "blue",
  "<1.000, 0.900, 0.000>": "yellow",
  "<0.000, 1.000, 1.000>": "cyan",
  "<1.000, 0.000, 1.000>": "magenta",
  "<1.000, 0.450, 0.000>": "orange",
  "<1.000, 0.400, 0.700>": "pink",
  "<0.950, 0.750, 0.200>": "gold",
  "<0.290, 0.659, 0.612>": "teal",
};

const CONST_TYPE: Record<string, string> = {};

function addConsts(type: string, names: string[]) {
  for (const n of names) CONST_TYPE[n] = type;
}

addConsts("lsl_const_bool", ["TRUE", "FALSE"]);
addConsts("lsl_const_nullkey", ["NULL_KEY"]);
addConsts("lsl_const_zerovec", ["ZERO_VECTOR"]);
addConsts("lsl_const_zerorot", ["ZERO_ROTATION"]);
addConsts("lsl_const_face", ["ALL_SIDES"]);
addConsts("lsl_const_link", ["LINK_THIS", "LINK_SET", "LINK_ROOT", "LINK_ALL_CHILDREN", "LINK_ALL_OTHERS"]);
addConsts("lsl_const_math", ["PI", "TWO_PI", "PI_BY_TWO", "DEG_TO_RAD", "RAD_TO_DEG", "SQRT2"]);
addConsts("lsl_const_channel", ["PUBLIC_CHANNEL", "DEBUG_CHANNEL"]);
addConsts("lsl_const_status", [
  "STATUS_PHYSICS",
  "STATUS_PHANTOM",
  "STATUS_ROTATE_X",
  "STATUS_ROTATE_Y",
  "STATUS_ROTATE_Z",
  "STATUS_SANDBOX",
  "STATUS_BLOCK_GRAB",
  "STATUS_DIE_AT_EDGE",
  "STATUS_RETURN_AT_EDGE",
]);
addConsts("lsl_const_changed", [
  "CHANGED_INVENTORY",
  "CHANGED_COLOR",
  "CHANGED_SHAPE",
  "CHANGED_SCALE",
  "CHANGED_TEXTURE",
  "CHANGED_LINK",
  "CHANGED_ALLOWED_DROP",
  "CHANGED_OWNER",
  "CHANGED_REGION",
  "CHANGED_TELEPORT",
  "CHANGED_REGION_START",
  "CHANGED_MEDIA",
]);
addConsts("lsl_const_perm", [
  "PERMISSION_TRIGGER_ANIMATION",
  "PERMISSION_TAKE_CONTROLS",
  "PERMISSION_DEBIT",
  "PERMISSION_ATTACH",
  "PERMISSION_TRACK_CAMERA",
  "PERMISSION_CONTROL_CAMERA",
  "PERMISSION_TELEPORT",
  "PERMISSION_CHANGE_LINKS",
  "PERMISSION_OVERRIDE_ANIMATIONS",
  "PERMISSION_RETURN_OBJECTS",
  "PERMISSION_GAME_CONTROL",
]);
addConsts("lsl_const_sensor", [
  "AGENT",
  "AGENT_BY_USERNAME",
  "AGENT_BY_LEGACY_NAME",
  "ACTIVE",
  "PASSIVE",
  "SCRIPTED",
  "DAMAGEABLE",
]);
addConsts("lsl_const_inv", [
  "INVENTORY_ALL",
  "INVENTORY_TEXTURE",
  "INVENTORY_SOUND",
  "INVENTORY_OBJECT",
  "INVENTORY_SCRIPT",
  "INVENTORY_LANDMARK",
  "INVENTORY_CLOTHING",
  "INVENTORY_NOTECARD",
  "INVENTORY_BODYPART",
  "INVENTORY_ANIMATION",
  "INVENTORY_GESTURE",
]);
addConsts("lsl_const_control", [
  "CONTROL_FWD",
  "CONTROL_BACK",
  "CONTROL_LEFT",
  "CONTROL_RIGHT",
  "CONTROL_ROT_LEFT",
  "CONTROL_ROT_RIGHT",
  "CONTROL_UP",
  "CONTROL_DOWN",
  "CONTROL_LBUTTON",
  "CONTROL_ML_LBUTTON",
]);
addConsts("lsl_const_click", [
  "CLICK_ACTION_TOUCH",
  "CLICK_ACTION_SIT",
  "CLICK_ACTION_BUY",
  "CLICK_ACTION_PAY",
  "CLICK_ACTION_OPEN",
  "CLICK_ACTION_PLAY",
  "CLICK_ACTION_OPEN_MEDIA",
  "CLICK_ACTION_ZOOM",
  "CLICK_ACTION_NONE",
]);
addConsts("lsl_const_pay", ["PAY_DEFAULT", "PAY_HIDE"]);
addConsts("lsl_const_agentdata", ["DATA_NAME", "DATA_ONLINE", "DATA_BORN", "DATA_RATING", "DATA_PAYINFO"]);
addConsts("lsl_const_trim", ["STRING_TRIM", "STRING_TRIM_HEAD", "STRING_TRIM_TAIL"]);
addConsts("lsl_const_stats", [
  "LIST_STAT_SUM",
  "LIST_STAT_MIN",
  "LIST_STAT_MAX",
  "LIST_STAT_MEAN",
  "LIST_STAT_MEDIAN",
  "LIST_STAT_STD_DEV",
  "LIST_STAT_GEOMETRIC_MEAN",
  "LIST_STAT_NUM_COUNT",
  "LIST_STAT_RANGE",
]);
addConsts("lsl_const_eof", ["EOF", "NAK"]);
addConsts("lsl_const_damage", [
  "DAMAGE_TYPE_IMPACT",
  "DAMAGE_TYPE_GENERIC",
  "DAMAGE_TYPE_ACID",
  "DAMAGE_TYPE_BLUDGEONING",
  "DAMAGE_TYPE_COLD",
  "DAMAGE_TYPE_ELECTRIC",
  "DAMAGE_TYPE_FIRE",
  "DAMAGE_TYPE_FORCE",
  "DAMAGE_TYPE_NECROTIC",
  "DAMAGE_TYPE_PIERCING",
  "DAMAGE_TYPE_POISON",
  "DAMAGE_TYPE_PSYCHIC",
  "DAMAGE_TYPE_RADIANT",
  "DAMAGE_TYPE_SLASHING",
  "DAMAGE_TYPE_SONIC",
  "DAMAGE_TYPE_EMOTIONAL",
]);
addConsts("lsl_const_gamebtn", [
  "GAME_CONTROL_BUTTON_A",
  "GAME_CONTROL_BUTTON_B",
  "GAME_CONTROL_BUTTON_X",
  "GAME_CONTROL_BUTTON_Y",
  "GAME_CONTROL_BUTTON_SOUTH",
  "GAME_CONTROL_BUTTON_EAST",
  "GAME_CONTROL_BUTTON_WEST",
  "GAME_CONTROL_BUTTON_NORTH",
  "GAME_CONTROL_BUTTON_START",
  "GAME_CONTROL_BUTTON_BACK",
  "GAME_CONTROL_BUTTON_LEFTSHOULDER",
  "GAME_CONTROL_BUTTON_RIGHTSHOULDER",
  "GAME_CONTROL_BUTTON_DPAD_UP",
  "GAME_CONTROL_BUTTON_DPAD_DOWN",
  "GAME_CONTROL_BUTTON_DPAD_LEFT",
  "GAME_CONTROL_BUTTON_DPAD_RIGHT",
]);

const ARITH = new Set(["+", "-", "*", "/", "%"]);
const COMPARE = new Set(["==", "!=", "<", ">", "<=", ">="]);
const LOGIC = new Set(["&&", "||"]);
const BITWISE = new Set(["&", "|", "^", "<<", ">>"]);

function chain(blocks: BlockJson[]): BlockJson | undefined {
  if (!blocks.length) return undefined;
  for (let i = 0; i < blocks.length - 1; i++) blocks[i].next = { block: blocks[i + 1] };
  return blocks[0];
}

function doInput(blocks: BlockJson[]): Record<string, unknown> | undefined {
  const head = chain(blocks);
  return head ? { block: head } : undefined;
}

function skipVarName(name: string): boolean {
  return (
    name.startsWith("_i") ||
    name.startsWith("_nc_") ||
    /^nc_(name|line|query|ready)_/.test(name)
  );
}

function fromCableName(name: string): string | null {
  if (!name.startsWith("cbl_")) return null;
  return name.slice(4) || "wire";
}

function ensureVar(ctx: Ctx, name: string, type: string): VarInfo {
  const existing = ctx.vars.get(name);
  if (existing) return existing;
  const info: VarInfo = { name, type, id: `var_${name}` };
  ctx.vars.set(name, info);
  return info;
}

function varField(info: VarInfo) {
  return { id: info.id, name: info.name, type: info.type };
}

function inferType(expr: Expr): string {
  switch (expr.k) {
    case "int":
      return "integer";
    case "float":
      return "float";
    case "str":
      return "string";
    case "list":
      return "list";
    case "vec":
      return expr.items.length >= 4 ? "rotation" : "vector";
    case "ident":
      if (expr.name === "TRUE" || expr.name === "FALSE") return "integer";
      if (expr.name === "NULL_KEY") return "key";
      if (expr.name === "ZERO_VECTOR") return "vector";
      if (expr.name === "ZERO_ROTATION") return "rotation";
      return "string";
    case "cast":
      return expr.type === "quaternion" ? "rotation" : expr.type;
    default:
      return "string";
  }
}

function intBlock(n: number): BlockJson {
  return { type: "lsl_integer", fields: { NUM: Math.trunc(n) } };
}

function floatBlock(n: number): BlockJson {
  return { type: "lsl_float", fields: { NUM: n } };
}

function strBlock(s: string): BlockJson {
  return { type: "lsl_string", fields: { TEXT: s } };
}

function constBlock(type: string, val: string): BlockJson {
  return { type, fields: { VAL: val } };
}

function namedColor(vec: string): BlockJson | null {
  if (COLORS[vec]) return { type: "lsl_color_named", fields: { COL: vec } };
  return null;
}

function formatNamedVec(items: Expr[]): string | null {
  if (items.length !== 3) return null;
  const nums = items.map((it) => {
    if (it.k === "float" || it.k === "int") return it.n;
    return null;
  });
  if (nums.some((n) => n == null)) return null;
  return `<${nums.map((n) => Number(n).toFixed(3)).join(", ")}>`;
}

function exprToLsl(e: Expr): string {
  switch (e.k) {
    case "int":
      return String(Math.trunc(e.n));
    case "float": {
      let s = e.raw || String(e.n);
      if (!s.includes(".")) s += ".0";
      return s;
    }
    case "str":
      return lslStringLiteral(e.s);
    case "ident":
      return e.name;
    case "vec":
      return `<${e.items.map(exprToLsl).join(", ")}>`;
    case "list":
      return `[${e.items.map(exprToLsl).join(", ")}]`;
    case "call":
      return `${e.name}(${e.args.map(exprToLsl).join(", ")})`;
    case "binop":
      return `${exprToLsl(e.a)} ${e.op} ${exprToLsl(e.b)}`;
    case "unop":
      return `${e.op}${exprToLsl(e.a)}`;
    case "cast":
      return `(${e.type})${exprToLsl(e.a)}`;
    case "member":
      return `${exprToLsl(e.a)}.${e.comp}`;
    case "paren":
      return `(${exprToLsl(e.a)})`;
    case "raw":
      return e.code;
    default:
      return "0";
  }
}

function leafShadow(expr: Expr): BlockJson | null {
  if (expr.k === "int") return intBlock(expr.n);
  if (expr.k === "float") return floatBlock(expr.n);
  if (expr.k === "str") return strBlock(expr.s);
  if (expr.k === "ident") {
    const t = CONST_TYPE[expr.name];
    if (t) return constBlock(t, expr.name);
  }
  if (expr.k === "vec") {
    const named = formatNamedVec(expr.items);
    if (named) {
      const col = namedColor(named);
      if (col) return col;
    }
    if (expr.items.length === 3 && expr.items.every((it) => it.k === "int" || it.k === "float")) {
      return {
        type: "lsl_vector",
        inputs: {
          X: { shadow: floatBlock(expr.items[0].k === "int" || expr.items[0].k === "float" ? expr.items[0].n : 0) },
          Y: { shadow: floatBlock(expr.items[1].k === "int" || expr.items[1].k === "float" ? expr.items[1].n : 0) },
          Z: { shadow: floatBlock(expr.items[2].k === "int" || expr.items[2].k === "float" ? expr.items[2].n : 0) },
        },
      };
    }
  }
  if (expr.k === "list" && expr.items.length === 0) return { type: "lsl_empty_list" };
  return null;
}

function wrapArg(expr: Expr, ctx: Ctx, _arg?: FnArg): { block?: BlockJson; shadow?: BlockJson } {
  const shadow = leafShadow(expr);
  if (shadow) return { shadow };
  return { block: exprToBlock(expr, ctx) };
}

function fnInputs(fn: FnDef, args: Expr[], ctx: Ctx): Record<string, unknown> {
  const names = fn.order ?? fn.args.map((a) => a.name);
  const inputs: Record<string, unknown> = {};
  for (let i = 0; i < names.length && i < args.length; i++) {
    const spec = fn.args.find((a) => a.name === names[i]);
    inputs[names[i]] = wrapArg(args[i], ctx, spec);
  }
  return inputs;
}

function fnCallBlock(fn: FnDef, args: Expr[], ctx: Ctx): BlockJson {
  const inputs = fnInputs(fn, args, ctx);
  const block: BlockJson = { type: fn.type };
  if (Object.keys(inputs).length) block.inputs = inputs;
  return block;
}

function abcInputs(args: Expr[], ctx: Ctx): Record<string, unknown> {
  const names = ["A", "B", "C"];
  const inputs: Record<string, unknown> = {};
  for (let i = 0; i < Math.min(3, args.length); i++) inputs[names[i]] = wrapArg(args[i], ctx);
  return inputs;
}

function listHasIdent(expr: Expr, name: string): boolean {
  if (expr.k !== "list") return false;
  return expr.items.some((it) => it.k === "ident" && it.name === name);
}

function specialCallExpr(e: Extract<Expr, { k: "call" }>, ctx: Ctx): BlockJson | null {
  if (e.name === "llEuler2Rot" && e.args[0]?.k === "binop" && e.args[0].op === "*") {
    const bin = e.args[0];
    const deg = exprIsIdent(bin.b, "DEG_TO_RAD") ? bin.a : exprIsIdent(bin.a, "DEG_TO_RAD") ? bin.b : null;
    if (deg) return { type: "lsl_euler_rot", inputs: { DEG: { block: exprToBlock(deg, ctx) } } };
  }
  return null;
}

function specialCallStmt(e: Extract<Expr, { k: "call" }>, ctx: Ctx): BlockJson | null {
  if (e.name === "llParticleSystem") {
    const rules = e.args[0];
    if (rules && rules.k === "list" && rules.items.length === 0) return { type: "lsl_particles_off" };
    if (rules && listHasIdent(rules, "PSYS_SRC_PATTERN_EXPLODE") && listHasIdent(rules, "PSYS_PART_EMISSIVE_MASK")) {
      let color: Expr | null = null;
      if (rules.k === "list") {
        for (let i = 0; i < rules.items.length - 1; i++) {
          const it = rules.items[i];
          if (it.k === "ident" && it.name === "PSYS_PART_START_COLOR") color = rules.items[i + 1];
        }
      }
      const block: BlockJson = { type: "lsl_particles_sparkle" };
      if (color) block.inputs = { COLOR: wrapArg(color, ctx) };
      return block;
    }
  }
  if (e.name === "llSetLinkPrimitiveParamsFast" && e.args.length >= 2 && e.args[1].k === "list") {
    const rules = e.args[1];
    const first = rules.items[0];
    if (first?.k === "ident" && first.name === "PRIM_GLOW" && rules.items.length >= 3) {
      return {
        type: "lsl_glow",
        inputs: { FACE: wrapArg(rules.items[1], ctx), GLOW: wrapArg(rules.items[2], ctx) },
      };
    }
    if (first?.k === "ident" && first.name === "PRIM_FULLBRIGHT" && rules.items.length >= 3) {
      return {
        type: "lsl_fullbright",
        inputs: { FACE: wrapArg(rules.items[1], ctx), ON: wrapArg(rules.items[2], ctx) },
      };
    }
    if (first?.k === "ident" && first.name === "PRIM_POINT_LIGHT" && rules.items.length >= 6) {
      return {
        type: "lsl_point_light",
        inputs: {
          ON: wrapArg(rules.items[1], ctx),
          COLOR: wrapArg(rules.items[2], ctx),
          INT: wrapArg(rules.items[3], ctx),
          RAD: wrapArg(rules.items[4], ctx),
          FALL: wrapArg(rules.items[5], ctx),
        },
      };
    }
  }
  return specialCallExpr(e, ctx);
}

function exprToBlock(e: Expr, ctx: Ctx): BlockJson {
  switch (e.k) {
    case "int":
      return intBlock(e.n);
    case "float":
      return floatBlock(e.n);
    case "str":
      return strBlock(e.s);
    case "ident":
      return identToBlock(e.name, ctx);
    case "vec": {
      const named = formatNamedVec(e.items);
      if (named) {
        const col = namedColor(named);
        if (col) return col;
      }
      if (e.items.length >= 4) {
        return {
          type: "lsl_rotation",
          inputs: {
            X: wrapArg(e.items[0], ctx),
            Y: wrapArg(e.items[1], ctx),
            Z: wrapArg(e.items[2], ctx),
            S: wrapArg(e.items[3], ctx),
          },
        };
      }
      return {
        type: "lsl_vector",
        inputs: {
          X: wrapArg(e.items[0] ?? { k: "float", n: 0, raw: "0.0" }, ctx),
          Y: wrapArg(e.items[1] ?? { k: "float", n: 0, raw: "0.0" }, ctx),
          Z: wrapArg(e.items[2] ?? { k: "float", n: 0, raw: "0.0" }, ctx),
        },
      };
    }
    case "list": {
      if (!e.items.length) return { type: "lsl_empty_list" };
      const inputs: Record<string, unknown> = {};
      const slots = ["A", "B", "C", "D"];
      for (let i = 0; i < Math.min(4, e.items.length); i++) inputs[slots[i]] = wrapArg(e.items[i], ctx);
      if (e.items.length > 4) {
        ctx.warnings.push("List had more than 4 items; extra values went into a raw brick.");
        return { type: "lsl_raw_expr", fields: { CODE: exprToLsl(e) } };
      }
      return { type: "lsl_list", inputs };
    }
    case "call": {
      const special = specialCallExpr(e, ctx);
      if (special) return special;
      const fn = FN_BY_LL.get(e.name);
      if (fn) return fnCallBlock(fn, e.args, ctx);
      const inputs = abcInputs(e.args, ctx);
      const block: BlockJson = { type: "lsl_call_expr", fields: { NAME: e.name } };
      if (Object.keys(inputs).length) block.inputs = inputs;
      return block;
    }
    case "binop":
      return binopToBlock(e.op, e.a, e.b, ctx);
    case "unop":
      if (e.op === "!") return { type: "lsl_not", inputs: { A: { block: exprToBlock(e.a, ctx) } } };
      return { type: "lsl_negate", inputs: { A: { block: exprToBlock(e.a, ctx) } } };
    case "cast":
      return { type: "lsl_cast", fields: { TYPE: e.type }, inputs: { VAL: { block: exprToBlock(e.a, ctx) } } };
    case "member":
      return {
        type: "lsl_component",
        fields: { COMP: ["x", "y", "z", "s"].includes(e.comp) ? e.comp : "x" },
        inputs: { VAL: { block: exprToBlock(e.a, ctx) } },
      };
    case "paren":
      return { type: "lsl_paren", inputs: { VAL: { block: exprToBlock(e.a, ctx) } } };
    case "raw":
      return { type: "lsl_raw_expr", fields: { CODE: e.code } };
    default:
      return { type: "lsl_raw_expr", fields: { CODE: "0" } };
  }
}

function identToBlock(name: string, ctx: Ctx): BlockJson {
  const cType = CONST_TYPE[name];
  if (cType) return constBlock(cType, name);
  if (name === "_nc_raw") return { type: "lsl_nc_line" };
  if (name === "_nc_key") return { type: "lsl_nc_key" };
  if (name === "_nc_val") return { type: "lsl_nc_value" };
  const ready = /^nc_ready_(.+)$/.exec(name);
  if (ready) return { type: "lsl_nc_ready", fields: { NAME: ready[1] } };
  if (/^nc_line_/.test(name)) return { type: "lsl_nc_index" };
  const cable = fromCableName(name);
  if (cable) {
    const v = ctx.vars.get(cable) ?? ensureVar(ctx, cable, "string");
    return { type: "lsl_get_var", fields: { VAR: varField(v) } };
  }
  if (ctx.eventParams.has(name)) return { type: "lsl_param", fields: { NAME: name } };
  if (ctx.vars.has(name)) {
    const v = ctx.vars.get(name)!;
    return { type: "lsl_get_var", fields: { VAR: varField(v) } };
  }
  if (PARAM_NAMES.has(name)) return { type: "lsl_param", fields: { NAME: name } };
  const v = ensureVar(ctx, name, "string");
  return { type: "lsl_get_var", fields: { VAR: varField(v) } };
}

function binopToBlock(op: string, a: Expr, b: Expr, ctx: Ctx): BlockJson {
  if (ARITH.has(op)) {
    return { type: "lsl_arithmetic", fields: { OP: op }, inputs: { A: { block: exprToBlock(a, ctx) }, B: { block: exprToBlock(b, ctx) } } };
  }
  if (COMPARE.has(op)) {
    return { type: "lsl_compare", fields: { OP: op }, inputs: { A: { block: exprToBlock(a, ctx) }, B: { block: exprToBlock(b, ctx) } } };
  }
  if (LOGIC.has(op)) {
    return { type: "lsl_logic", fields: { OP: op }, inputs: { A: { block: exprToBlock(a, ctx) }, B: { block: exprToBlock(b, ctx) } } };
  }
  if (BITWISE.has(op)) {
    return { type: "lsl_bitwise", fields: { OP: op }, inputs: { A: { block: exprToBlock(a, ctx) }, B: { block: exprToBlock(b, ctx) } } };
  }
  return { type: "lsl_raw_expr", fields: { CODE: `${exprToLsl(a)} ${op} ${exprToLsl(b)}` } };
}

function isNcAssign(name: string, expr: Expr): boolean {
  if (expr.k === "ident" && expr.name === "_nc_val") return true;
  if (expr.k === "cast" && expr.a.k === "ident" && expr.a.name === "_nc_val") return true;
  if (expr.k === "call" && expr.name === "llCSV2List" && expr.args[0] && exprIsIdent(expr.args[0], "_nc_val")) return true;
  return false;
}

function isNcIf(stmt: Extract<Stmt, { k: "if" }>): string | null {
  const c = stmt.cond;
  if (c.k === "binop" && c.op === "==" && exprIsIdent(c.a, "_nc_key") && c.b.k === "str") return c.b.s;
  return null;
}

function isRepeatFor(stmt: Extract<Stmt, { k: "for" }>, declName?: string): Expr | null {
  const init = stmt.init;
  const step = stmt.step;
  const cond = stmt.cond;
  if (!init || !step || !cond) return null;
  const name =
    init.k === "assign"
      ? init.name
      : init.k === "decl"
        ? init.name
        : null;
  if (!name || (declName && name !== declName)) return null;
  if (init.k === "assign" && !(init.expr.k === "int" && init.expr.n === 0)) return null;
  if (init.k === "decl" && init.init && !(init.init.k === "int" && init.init.n === 0)) return null;
  if (!(cond.k === "binop" && cond.op === "<" && exprIsIdent(cond.a, name))) return null;
  if (!(step.k === "inc" && step.name === name && step.delta === 1)) return null;
  return cond.b;
}

function lastSleep(body: Stmt[]): { rest: Stmt[]; sleep: Expr } | null {
  if (!body.length) return null;
  const last = body[body.length - 1];
  if (last.k === "exprstmt" && last.expr.k === "call" && last.expr.name === "llSleep" && last.expr.args[0]) {
    return { rest: body.slice(0, -1), sleep: last.expr.args[0] };
  }
  return null;
}

function callToStmt(e: Extract<Expr, { k: "call" }>, ctx: Ctx): BlockJson {
  const special = specialCallStmt(e, ctx);
  if (special && (special.type === "lsl_particles_off" || special.type === "lsl_particles_sparkle" || special.type === "lsl_glow" || special.type === "lsl_fullbright" || special.type === "lsl_point_light")) {
    return special;
  }
  const fn = FN_BY_LL.get(e.name);
  if (fn) {
    const block = fnCallBlock(fn, e.args, ctx);
    if (fn.returns && !fn.discardReturn) return { type: "lsl_eval", inputs: { VAL: { block } } };
    return block;
  }
  const inputs = abcInputs(e.args, ctx);
  const block: BlockJson = { type: "lsl_call", fields: { NAME: e.name } };
  if (Object.keys(inputs).length) block.inputs = inputs;
  return block;
}

function stmtToBlocks(stmts: Stmt[], ctx: Ctx): BlockJson[] {
  const out: BlockJson[] = [];
  let i = 0;
  while (i < stmts.length) {
    const s = stmts[i];

    if (s.k === "decl" && s.name.startsWith("_i") && stmts[i + 1]?.k === "for") {
      const times = isRepeatFor(stmts[i + 1] as Extract<Stmt, { k: "for" }>, s.name);
      if (times) {
        const forStmt = stmts[i + 1] as Extract<Stmt, { k: "for" }>;
        const body = doInput(stmtToBlocks(forStmt.body, ctx));
        const block: BlockJson = { type: "lsl_repeat", inputs: { TIMES: wrapArg(times, ctx) } };
        if (body) (block.inputs as Record<string, unknown>).DO = body;
        out.push(block);
        i += 2;
        continue;
      }
    }

    if (s.k === "block") {
      out.push(...stmtToBlocks(s.body, ctx));
      i += 1;
      continue;
    }

    if (s.k === "comment" && s.text.toLowerCase().startsWith("group ")) {
      const name = s.text.slice(6).trim() || "group";
      i += 1;
      const inner: Stmt[] = [];
      while (i < stmts.length && !(stmts[i].k === "comment" && (stmts[i] as Extract<Stmt, { k: "comment" }>).text.toLowerCase().startsWith("group "))) {
        inner.push(stmts[i]);
        i += 1;
      }
      const block: BlockJson = { type: "lsl_group", fields: { NAME: name } };
      const body = doInput(stmtToBlocks(inner, ctx));
      if (body) block.inputs = { DO: body };
      out.push(block);
      continue;
    }

    const one = stmtToBlock(s, ctx);
    if (one) out.push(one);
    i += 1;
  }
  return out;
}

function stmtToBlock(s: Stmt, ctx: Ctx): BlockJson | null {
  switch (s.k) {
    case "block":
      return null;
    case "comment": {
      if (/default must exist and come first/i.test(s.text)) return null;
      if (/^Generated by PrimBlocks/i.test(s.text)) return null;
      if (/^Paste into a New Script/i.test(s.text)) return null;
      if (/^note:/i.test(s.text)) return null;
      return { type: "lsl_comment", fields: { TEXT: s.text } };
    }
    case "raw":
      return { type: "lsl_raw_stmt", fields: { CODE: s.code } };
    case "return": {
      const block: BlockJson = { type: "lsl_return" };
      if (s.expr) block.inputs = { VAL: { block: exprToBlock(s.expr, ctx) } };
      return block;
    }
    case "state":
      return { type: "lsl_state_change", fields: { NAME: s.name } };
    case "if": {
      const ncKey = isNcIf(s);
      if (ncKey != null) {
        const block: BlockJson = { type: "lsl_nc_if_key", fields: { KEY: ncKey } };
        const body = doInput(stmtToBlocks(s.then, ctx));
        if (body) block.inputs = { DO: body };
        return block;
      }
      const cond = { block: exprToBlock(s.cond, ctx) };
      if (s.else && s.else.length) {
        const block: BlockJson = { type: "lsl_ifelse", inputs: { COND: cond } };
        const thenDo = doInput(stmtToBlocks(s.then, ctx));
        const els = doInput(stmtToBlocks(s.else, ctx));
        if (thenDo) (block.inputs as Record<string, unknown>).DO = thenDo;
        if (els) (block.inputs as Record<string, unknown>).ELSE = els;
        return block;
      }
      const block: BlockJson = { type: "lsl_if", inputs: { COND: cond } };
      const thenDo = doInput(stmtToBlocks(s.then, ctx));
      if (thenDo) (block.inputs as Record<string, unknown>).DO = thenDo;
      return block;
    }
    case "while": {
      if (exprIsTrue(s.cond)) {
        const sleep = lastSleep(s.body);
        if (sleep) {
          const block: BlockJson = {
            type: "lsl_forever",
            inputs: { SLEEP: wrapArg(sleep.sleep, ctx) },
          };
          const body = doInput(stmtToBlocks(sleep.rest, ctx));
          if (body) (block.inputs as Record<string, unknown>).DO = body;
          return block;
        }
      }
      const block: BlockJson = { type: "lsl_while", inputs: { COND: { block: exprToBlock(s.cond, ctx) } } };
      const body = doInput(stmtToBlocks(s.body, ctx));
      if (body) (block.inputs as Record<string, unknown>).DO = body;
      return block;
    }
    case "dowhile": {
      const block: BlockJson = { type: "lsl_dowhile", inputs: { COND: { block: exprToBlock(s.cond, ctx) } } };
      const body = doInput(stmtToBlocks(s.body, ctx));
      if (body) (block.inputs as Record<string, unknown>).DO = body;
      return block;
    }
    case "for": {
      const times = isRepeatFor(s);
      if (times) {
        const block: BlockJson = { type: "lsl_repeat", inputs: { TIMES: wrapArg(times, ctx) } };
        const body = doInput(stmtToBlocks(s.body, ctx));
        if (body) (block.inputs as Record<string, unknown>).DO = body;
        return block;
      }
      return {
        type: "lsl_raw_stmt",
        fields: { CODE: `for (${s.init ? "?" : ""}; ${s.cond ? exprToLsl(s.cond) : ""}; ) { … }` },
      };
    }
    case "decl": {
      const cable = fromCableName(s.name);
      const vname = cable ?? s.name;
      if (!cable && skipVarName(s.name)) {
        return { type: "lsl_raw_stmt", fields: { CODE: `${s.type} ${s.name}${s.init ? ` = ${exprToLsl(s.init)}` : ""};` } };
      }
      const v = ctx.vars.get(vname) ?? ensureVar(ctx, vname, s.type === "quaternion" ? "rotation" : s.type);
      if (!s.init) return null;
      return {
        type: "lsl_set_var",
        fields: { VAR: varField(v) },
        inputs: { VALUE: { block: exprToBlock(s.init, ctx) } },
      };
    }
    case "assign": {
      const cable = fromCableName(s.name);
      const vname = cable ?? s.name;
      if (isNcAssign(s.name, s.expr)) {
        const v = ctx.vars.get(vname) ?? ensureVar(ctx, vname, inferType(s.expr));
        return { type: "lsl_nc_assign", fields: { VAR: varField(v) } };
      }
      const v = ctx.vars.get(vname) ?? ensureVar(ctx, vname, inferType(s.expr));
      return { type: "lsl_set_var", fields: { VAR: varField(v) }, inputs: { VALUE: { block: exprToBlock(s.expr, ctx) } } };
    }
    case "addassign": {
      const v = ctx.vars.get(s.name) ?? ensureVar(ctx, s.name, "integer");
      return {
        type: "lsl_change_var",
        fields: { VAR: varField(v) },
        inputs: { DELTA: wrapArg(s.expr, ctx) },
      };
    }
    case "inc": {
      const v = ctx.vars.get(s.name) ?? ensureVar(ctx, s.name, "integer");
      return {
        type: "lsl_change_var",
        fields: { VAR: varField(v) },
        inputs: { DELTA: { shadow: intBlock(s.delta) } },
      };
    }
    case "exprstmt": {
      if (s.expr.k === "call") return callToStmt(s.expr, ctx);
      return { type: "lsl_eval", inputs: { VAL: { block: exprToBlock(s.expr, ctx) } } };
    }
    default:
      return null;
  }
}

function isPlaceholderEvent(name: string, body: Stmt[]): boolean {
  if (name !== "state_entry") return false;
  if (!body.length) return true;
  if (body.length === 1 && body[0].k === "comment" && /default must exist/i.test(body[0].text)) return true;
  return false;
}

function astToState(ast: ScriptAst): ImportResult {
  const warnings = [...ast.warnings];
  const ctx: Ctx = { vars: new Map(), eventParams: new Set(), warnings };

  for (const g of ast.globals) {
    if (skipVarName(g.name)) continue;
    const type = g.type === "quaternion" ? "rotation" : g.type;
    const cable = fromCableName(g.name);
    ensureVar(ctx, cable ?? g.name, type);
  }

  const tops: BlockJson[] = [];
  let y = 20;
  const fnX = 520;

  for (const fn of ast.functions) {
    const body = [...fn.body];
    let retExpr: Expr | undefined;
    if (body.length && body[body.length - 1].k === "return") {
      const last = body.pop() as Extract<Stmt, { k: "return" }>;
      retExpr = last.expr;
    }
    const block: BlockJson = {
      type: "lsl_function",
      x: fnX,
      y,
      fields: { NAME: fn.name, RET: fn.ret, PARAMS: fn.params },
    };
    const inputs: Record<string, unknown> = {};
    const stack = doInput(stmtToBlocks(body, ctx));
    if (stack) inputs.STACK = stack;
    if (retExpr) inputs.RETURN = { block: exprToBlock(retExpr, ctx) };
    if (Object.keys(inputs).length) block.inputs = inputs;
    tops.push(block);
    y += 160;
  }

  y = 20;
  for (const st of ast.states) {
    for (const ev of st.events) {
      if (isPlaceholderEvent(ev.name, ev.body)) continue;
      if (!EVENT_IDS.has(ev.name as (typeof LSL_EVENTS)[number])) {
        warnings.push(`Unknown event ${ev.name} — dropped into a raw brick.`);
        tops.push({
          type: "lsl_raw_stmt",
          x: 20,
          y,
          fields: { CODE: `${ev.name}(...) { … }` },
        });
        y += 80;
        continue;
      }
      const evCtx: Ctx = {
        vars: ctx.vars,
        eventParams: new Set(ev.params.map((p) => p.name)),
        warnings,
      };
      const def = LSL_EVENT_DEFS.find((d) => d.id === ev.name);
      const block: BlockJson = {
        type: def?.type ?? `lsl_event_${ev.name}`,
        x: 20,
        y,
        fields: { STATE: st.name },
      };
      const body = doInput(stmtToBlocks(ev.body, evCtx));
      if (body) block.inputs = { DO: body };
      tops.push(block);
      y += 140;
    }
  }

  const variables = [...ctx.vars.values()].map((v) => ({ name: v.name, type: v.type, id: v.id }));
  const state: Record<string, unknown> = { blocks: { languageVersion: 0, blocks: tops } };
  if (variables.length) state.variables = variables;
  return { state, warnings, brickCount: tops.length };
}

export function importLsl(source: string): ImportResult {
  const ast = parseLsl(source);
  if (!ast.states.length && !ast.functions.length && !ast.globals.length) {
    const trimmed = source.trim();
    if (!trimmed) {
      return { state: { blocks: { languageVersion: 0, blocks: [] } }, warnings: ["Nothing to import."], brickCount: 0 };
    }
    ast.warnings.push("Could not find a default state — wrapped the file in a raw brick.");
    ast.states.push({
      name: "default",
      events: [
        {
          name: "state_entry",
          params: [],
          body: [{ k: "raw", code: trimmed.slice(0, 500) }],
        },
      ],
    });
  }
  return astToState(ast);
}

export function topTypes(state: object): string[] {
  const blocks = (state as { blocks?: { blocks?: { type?: string }[] } }).blocks?.blocks ?? [];
  return blocks.map((b) => b.type || "");
}
