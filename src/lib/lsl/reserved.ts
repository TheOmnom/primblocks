/** Compiler keywords and types that cannot be used as identifiers. */
export const LSL_KEYWORDS = new Set([
  "default",
  "state",
  "jump",
  "return",
  "if",
  "else",
  "while",
  "do",
  "for",
  "event",
  "TRUE",
  "FALSE",
  "integer",
  "float",
  "string",
  "key",
  "vector",
  "rotation",
  "list",
  "quaternion",
]);

export const LSL_EVENTS = [
  "state_entry",
  "state_exit",
  "touch_start",
  "touch",
  "touch_end",
  "collision_start",
  "collision",
  "collision_end",
  "land_collision_start",
  "land_collision",
  "land_collision_end",
  "timer",
  "listen",
  "sensor",
  "no_sensor",
  "control",
  "dataserver",
  "http_response",
  "http_request",
  "link_message",
  "changed",
  "attach",
  "on_rez",
  "object_rez",
  "money",
  "run_time_permissions",
  "experience_permissions",
  "experience_permissions_denied",
  "at_target",
  "not_at_target",
  "at_rot_target",
  "not_at_rot_target",
  "moving_start",
  "moving_end",
  "email",
  "remote_data",
  "transaction_result",
  "path_update",
  "linkset_data",
  "on_damage",
  "final_damage",
  "on_death",
  "game_control",
] as const;

export type LslEventName = (typeof LSL_EVENTS)[number];

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidIdent(name: string): boolean {
  return IDENT.test(name) && !LSL_KEYWORDS.has(name);
}

/** Coerce a user-typed name into a legal LSL identifier. */
export function sanitizeIdent(raw: string, fallback: string): string {
  let s = raw.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "");
  if (!s) s = fallback;
  if (/^[0-9]/.test(s)) s = `_${s}`;
  if (LSL_KEYWORDS.has(s)) s = `${s}_`;
  if (!IDENT.test(s)) s = fallback;
  return s;
}

export function sanitizeStateName(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "default") return "default";
  return sanitizeIdent(trimmed, "state_1");
}

export function lslStringLiteral(text: string): string {
  return `"${text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")}"`;
}
