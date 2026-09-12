const KEYWORD =
  /\b(default|state|jump|return|if|else|while|do|for|TRUE|FALSE)\b/;
const TYPE = /\b(integer|float|string|key|vector|rotation|list)\b/;
const EVENT =
  /\b(state_entry|state_exit|touch_start|touch_end|touch|collision_start|collision_end|collision|land_collision_start|land_collision_end|land_collision|timer|listen|sensor|no_sensor|control|dataserver|http_response|http_request|link_message|changed|attach|on_rez|object_rez|money|run_time_permissions|experience_permissions_denied|experience_permissions|at_rot_target|not_at_rot_target|at_target|not_at_target|moving_start|moving_end|email|remote_data|transaction_result|path_update|linkset_data)\b/;
const FUNC = /\b(ll[A-Za-z][A-Za-z0-9]*)\b/;
const CONST = /\b([A-Z][A-Z0-9_]+)\b/;
const NUMBER = /\b\d+(?:\.\d+)?\b/;

type Kind = "comment" | "string" | "keyword" | "type" | "event" | "func" | "const" | "number";

function classifyWord(word: string): Kind | null {
  if (KEYWORD.test(word)) return "keyword";
  if (TYPE.test(word)) return "type";
  if (EVENT.test(word)) return "event";
  if (FUNC.test(word)) return "func";
  if (CONST.test(word)) return "const";
  if (NUMBER.test(word)) return "number";
  return null;
}

export type HighlightSpan = { kind?: Kind; text: string };

/** Tiny tokenizer — strings and comments first so keywords inside them stay plain. */
export function highlightLsl(src: string): HighlightSpan[] {
  const out: HighlightSpan[] = [];
  const re =
    /(\/\/[^\n]*)|("(?:\\.|[^"\\])*")|(\b[A-Za-z_][A-Za-z0-9_]*\b)|(\b\d+(?:\.\d+)?\b)|([^A-Za-z0-9_"/]+)|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m[1]) out.push({ kind: "comment", text: m[1] });
    else if (m[2]) out.push({ kind: "string", text: m[2] });
    else if (m[3]) {
      const kind = classifyWord(m[3]);
      out.push(kind ? { kind, text: m[3] } : { text: m[3] });
    } else if (m[4]) out.push({ kind: "number", text: m[4] });
    else out.push({ text: m[5] || m[6] || "" });
  }
  return out;
}
