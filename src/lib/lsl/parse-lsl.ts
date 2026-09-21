/** Tokenizer + recursive descent for an LSL compilation unit. */

export type TokKind = "ident" | "number" | "string" | "punct" | "comment" | "eof";

export type Token = { kind: TokKind; value: string; line: number };

export type Expr =
  | { k: "int"; n: number; raw: string }
  | { k: "float"; n: number; raw: string }
  | { k: "str"; s: string }
  | { k: "ident"; name: string }
  | { k: "vec"; items: Expr[] }
  | { k: "list"; items: Expr[] }
  | { k: "call"; name: string; args: Expr[] }
  | { k: "binop"; op: string; a: Expr; b: Expr }
  | { k: "unop"; op: "!" | "-"; a: Expr }
  | { k: "cast"; type: string; a: Expr }
  | { k: "member"; a: Expr; comp: string }
  | { k: "paren"; a: Expr }
  | { k: "raw"; code: string };

export type Stmt =
  | { k: "if"; cond: Expr; then: Stmt[]; else?: Stmt[] }
  | { k: "while"; cond: Expr; body: Stmt[] }
  | { k: "dowhile"; body: Stmt[]; cond: Expr }
  | { k: "for"; init: Stmt | null; cond: Expr | null; step: Stmt | null; body: Stmt[] }
  | { k: "decl"; type: string; name: string; init?: Expr }
  | { k: "assign"; name: string; expr: Expr }
  | { k: "addassign"; name: string; expr: Expr }
  | { k: "inc"; name: string; delta: number }
  | { k: "exprstmt"; expr: Expr }
  | { k: "return"; expr?: Expr }
  | { k: "state"; name: string }
  | { k: "comment"; text: string }
  | { k: "raw"; code: string }
  | { k: "block"; body: Stmt[] };

export type EventAst = {
  name: string;
  params: { type: string; name: string }[];
  body: Stmt[];
};

export type FuncAst = {
  ret: string;
  name: string;
  params: string;
  body: Stmt[];
};

export type GlobalAst = { type: string; name: string; init?: Expr };

export type StateAst = { name: string; events: EventAst[] };

export type ScriptAst = {
  globals: GlobalAst[];
  functions: FuncAst[];
  states: StateAst[];
  warnings: string[];
};

const TYPES = new Set(["integer", "float", "string", "key", "vector", "rotation", "list", "quaternion"]);

const TWO_CHAR = ["==", "!=", "<=", ">=", "&&", "||", "<<", ">>", "++", "--", "+=", "-=", "*=", "/=", "%="];

export function tokenize(src: string): Token[] {
  const text = src.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  const n = text.length;

  const push = (kind: TokKind, value: string) => {
    tokens.push({ kind, value, line });
  };

  while (i < n) {
    const c = text[i];
    if (c === "\n") {
      line += 1;
      i += 1;
      continue;
    }
    if (c === " " || c === "\t") {
      i += 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      i += 2;
      let s = "";
      while (i < n && text[i] !== "\n") {
        s += text[i];
        i += 1;
      }
      push("comment", s.replace(/^\s/, ""));
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) {
        if (text[i] === "\n") line += 1;
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === '"') {
      i += 1;
      let s = "";
      while (i < n && text[i] !== '"') {
        if (text[i] === "\\" && i + 1 < n) {
          const nch = text[i + 1];
          if (nch === "n") s += "\n";
          else if (nch === "t") s += "\t";
          else if (nch === '"') s += '"';
          else if (nch === "\\") s += "\\";
          else s += nch;
          i += 2;
          continue;
        }
        if (text[i] === "\n") line += 1;
        s += text[i];
        i += 1;
      }
      i += 1;
      push("string", s);
      continue;
    }
    if (c >= "0" && c <= "9") {
      let s = "";
      if (c === "0" && (text[i + 1] === "x" || text[i + 1] === "X")) {
        s = text.slice(i, i + 2);
        i += 2;
        while (i < n && /[0-9a-fA-F]/.test(text[i])) {
          s += text[i];
          i += 1;
        }
        push("number", s);
        continue;
      }
      while (i < n && text[i] >= "0" && text[i] <= "9") {
        s += text[i];
        i += 1;
      }
      if (text[i] === ".") {
        s += ".";
        i += 1;
        while (i < n && text[i] >= "0" && text[i] <= "9") {
          s += text[i];
          i += 1;
        }
      }
      push("number", s);
      continue;
    }
    if (c === "." && text[i + 1] >= "0" && text[i + 1] <= "9") {
      let s = ".";
      i += 1;
      while (i < n && text[i] >= "0" && text[i] <= "9") {
        s += text[i];
        i += 1;
      }
      push("number", s);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let s = "";
      while (i < n && /[A-Za-z0-9_]/.test(text[i])) {
        s += text[i];
        i += 1;
      }
      push("ident", s);
      continue;
    }
    const two = text.slice(i, i + 2);
    if (TWO_CHAR.includes(two)) {
      push("punct", two);
      i += 2;
      continue;
    }
    push("punct", c);
    i += 1;
  }
  push("eof", "");
  return tokens;
}

class Parser {
  i = 0;
  tokens: Token[];
  warnings: string[] = [];
  steps = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.length ? tokens : [{ kind: "eof", value: "", line: 1 }];
  }

  guard() {
    this.steps += 1;
    if (this.steps > 40000) {
      const t = this.peek();
      throw new Error(`parser stuck at token ${this.i}/${this.tokens.length} ${t.kind} ${JSON.stringify(t.value)} line ${t.line}`);
    }
  }

  peek(): Token {
    return this.tokens[this.i] ?? this.tokens[this.tokens.length - 1];
  }

  peekAt(off: number): Token {
    return this.tokens[this.i + off] ?? this.tokens[this.tokens.length - 1];
  }

  at(kind: TokKind, value?: string): boolean {
    const t = this.peek();
    return t.kind === kind && (value === undefined || t.value === value);
  }

  eat(kind: TokKind, value?: string): Token | null {
    if (this.at(kind, value)) {
      const t = this.peek();
      this.i += 1;
      return t;
    }
    return null;
  }

  eatPunct(...vals: string[]): string | null {
    const t = this.peek();
    if (t.kind === "punct" && vals.includes(t.value)) {
      this.i += 1;
      return t.value;
    }
    return null;
  }

  eatIdent(name?: string): string | null {
    const t = this.peek();
    if (t.kind === "ident" && (name === undefined || t.value === name)) {
      this.i += 1;
      return t.value;
    }
    return null;
  }

  warn(msg: string) {
    this.warnings.push(`line ${this.peek().line}: ${msg}`);
  }

  skipComments(): string[] {
    const out: string[] = [];
    while (this.at("comment")) {
      out.push(this.peek().value);
      this.i += 1;
    }
    return out;
  }

  skipJunk() {
    while (this.at("comment") || (this.at("punct", ";") && this.peekAt(1).kind !== "eof")) {
      if (this.at("comment")) {
        this.i += 1;
        continue;
      }
      break;
    }
  }

  recoverStmt() {
    while (!this.at("eof") && !this.at("punct", "}") && !this.at("punct", ";")) this.i += 1;
    this.eat("punct", ";");
  }

  parseScript(): ScriptAst {
    const globals: GlobalAst[] = [];
    const functions: FuncAst[] = [];
    const states: StateAst[] = [];

    while (!this.at("eof")) {
      this.skipComments();
      if (this.at("eof")) break;

      if (this.eatIdent("default")) {
        const events = this.parseStateBody();
        states.push({ name: "default", events });
        continue;
      }
      if (this.eatIdent("state")) {
        const name = this.eatIdent() || "state";
        const events = this.parseStateBody();
        states.push({ name, events });
        continue;
      }

      if (this.peek().kind === "ident" && TYPES.has(this.peek().value)) {
        const type = this.peek().value;
        const after = this.peekAt(1);
        const after2 = this.peekAt(2);
        if (after.kind === "ident" && after2.kind === "punct" && after2.value === "(") {
          functions.push(this.parseFunction());
          continue;
        }
        if (after.kind === "ident") {
          this.i += 1;
          const name = this.eatIdent() || "var1";
          let init: Expr | undefined;
          if (this.eatPunct("=")) init = this.parseExpr();
          this.eatPunct(";");
          globals.push({ type: type === "quaternion" ? "rotation" : type, name, init });
          continue;
        }
      }

      if (this.peek().kind === "ident" && this.peekAt(1).kind === "punct" && this.peekAt(1).value === "(") {
        functions.push(this.parseFunction());
        continue;
      }

      this.warn(`skipped unexpected ${this.peek().kind} '${this.peek().value}'`);
      this.i += 1;
    }

    if (!states.some((s) => s.name === "default")) {
      states.unshift({ name: "default", events: [] });
    }

    return { globals, functions, states, warnings: this.warnings };
  }

  parseStateBody(): EventAst[] {
    const events: EventAst[] = [];
    if (!this.eatPunct("{")) {
      this.warn("state missing '{'");
      return events;
    }
    while (!this.at("eof") && !this.at("punct", "}")) {
      this.skipComments();
      if (this.at("punct", "}")) break;
      if (this.peek().kind !== "ident") {
        this.warn(`expected event name, got '${this.peek().value}'`);
        this.i += 1;
        continue;
      }
      const name = this.eatIdent()!;
      if (!this.eatPunct("(")) {
        this.warn(`event ${name} missing '('`);
        this.recoverStmt();
        continue;
      }
      const params: { type: string; name: string }[] = [];
      if (!this.at("punct", ")")) {
        while (!this.at("eof") && !this.at("punct", ")")) {
          const t = this.eatIdent() || "integer";
          const n = this.eatIdent() || "p";
          params.push({ type: t, name: n });
          if (!this.eatPunct(",")) break;
        }
      }
      this.eatPunct(")");
      const body = this.parseBraceBlock();
      events.push({ name, params, body });
    }
    this.eatPunct("}");
    return events;
  }

  parseFunction(): FuncAst {
    let ret = "";
    if (this.peek().kind === "ident" && TYPES.has(this.peek().value)) {
      ret = this.eatIdent()!;
      if (ret === "quaternion") ret = "rotation";
    }
    const name = this.eatIdent() || "doThing";
    this.eatPunct("(");
    const paramToks: string[] = [];
    let depth = 1;
    while (!this.at("eof") && depth > 0) {
      const t = this.peek();
      if (t.kind === "punct" && t.value === "(") depth += 1;
      if (t.kind === "punct" && t.value === ")") {
        depth -= 1;
        if (depth === 0) {
          this.i += 1;
          break;
        }
      }
      if (depth > 0) {
        paramToks.push(t.kind === "string" ? JSON.stringify(t.value) : t.value);
        this.i += 1;
      }
    }
    const params = paramToks
      .join(" ")
      .replace(/\s+,/g, ",")
      .replace(/,\s+/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
    const body = this.parseBraceBlock();
    return { ret, name, params, body };
  }

  parseBraceBlock(): Stmt[] {
    if (!this.eatPunct("{")) {
      return this.parseStmt() ?? [];
    }
    const body: Stmt[] = [];
    while (!this.at("eof") && !this.at("punct", "}")) {
      this.guard();
      const s = this.parseStmt();
      if (s) body.push(...s);
      else if (!this.at("eof") && !this.at("punct", "}")) this.i += 1;
    }
    this.eatPunct("}");
    return body;
  }

  parseStmtOrBlock(): Stmt[] {
    if (this.at("punct", "{")) return this.parseBraceBlock();
    return this.parseStmt() ?? [];
  }

  parseStmt(): Stmt[] | null {
    this.guard();
    this.skipCommentsKeep();
    if (this.at("eof") || this.at("punct", "}")) return null;

    if (this.at("comment")) {
      const text = this.peek().value;
      this.i += 1;
      return [{ k: "comment", text }];
    }

    if (this.at("punct", "{")) {
      return [{ k: "block", body: this.parseBraceBlock() }];
    }

    if (this.eatIdent("if")) {
      this.eatPunct("(");
      const cond = this.parseExpr();
      this.eatPunct(")");
      const then = this.parseStmtOrBlock();
      let els: Stmt[] | undefined;
      if (this.eatIdent("else")) els = this.parseStmtOrBlock();
      return [{ k: "if", cond, then, else: els }];
    }

    if (this.eatIdent("while")) {
      this.eatPunct("(");
      const cond = this.parseExpr();
      this.eatPunct(")");
      const body = this.parseStmtOrBlock();
      return [{ k: "while", cond, body }];
    }

    if (this.eatIdent("do")) {
      const body = this.parseStmtOrBlock();
      this.eatIdent("while");
      this.eatPunct("(");
      const cond = this.parseExpr();
      this.eatPunct(")");
      this.eatPunct(";");
      return [{ k: "dowhile", body, cond }];
    }

    if (this.eatIdent("for")) {
      this.eatPunct("(");
      let init: Stmt | null = null;
      if (!this.at("punct", ";")) {
        const inner = this.parseSimpleAssignOrDecl();
        init = inner;
      }
      this.eatPunct(";");
      let cond: Expr | null = null;
      if (!this.at("punct", ";")) cond = this.parseExpr();
      this.eatPunct(";");
      let step: Stmt | null = null;
      if (!this.at("punct", ")")) step = this.parseSimpleAssignOrDecl();
      this.eatPunct(")");
      const body = this.parseStmtOrBlock();
      return [{ k: "for", init, cond, step, body }];
    }

    if (this.eatIdent("return")) {
      if (this.eatPunct(";")) return [{ k: "return" }];
      const expr = this.parseExpr();
      this.eatPunct(";");
      return [{ k: "return", expr }];
    }

    if (this.eatIdent("state")) {
      const name = this.eatIdent() || "default";
      this.eatPunct(";");
      return [{ k: "state", name }];
    }

    if (this.eatIdent("jump")) {
      const name = this.eatIdent() || "label";
      this.eatPunct(";");
      return [{ k: "raw", code: `jump ${name};` }];
    }

    if (this.at("punct", "@")) {
      this.i += 1;
      const name = this.eatIdent() || "label";
      this.eatPunct(";");
      return [{ k: "raw", code: `@${name};` }];
    }

    const decl = this.tryDecl();
    if (decl) return [decl];

    const assign = this.tryAssignOrInc();
    if (assign) {
      this.eatPunct(";");
      return [assign];
    }

    try {
      const expr = this.parseExpr();
      this.eatPunct(";");
      return [{ k: "exprstmt", expr }];
    } catch {
      this.warn("could not parse statement");
      const start = this.i;
      this.recoverStmt();
      const bits = this.tokens.slice(start, this.i).map((t) => t.value).join(" ");
      return bits.trim() ? [{ k: "raw", code: bits.trim() }] : null;
    }
  }

  skipCommentsKeep() {
    /* comments become their own statements at this layer via parseStmt */
  }

  tryDecl(): Stmt | null {
    if (!(this.peek().kind === "ident" && TYPES.has(this.peek().value))) return null;
    const after = this.peekAt(1);
    const after2 = this.peekAt(2);
    if (after.kind !== "ident") return null;
    if (after2.kind === "punct" && after2.value === "(") return null;
    const type = this.eatIdent()!;
    const name = this.eatIdent()!;
    let init: Expr | undefined;
    if (this.eatPunct("=")) init = this.parseExpr();
    this.eatPunct(";");
    return { k: "decl", type: type === "quaternion" ? "rotation" : type, name, init };
  }

  tryAssignOrInc(): Stmt | null {
    if (this.at("punct", "++") || this.at("punct", "--")) {
      const op = this.eatPunct("++", "--")!;
      const name = this.eatIdent();
      if (!name) return { k: "raw", code: op };
      return { k: "inc", name, delta: op === "++" ? 1 : -1 };
    }
    if (this.peek().kind !== "ident") return null;
    const next = this.peekAt(1);
    if (next.kind !== "punct") return null;
    if (next.value === "=" || next.value === "+=" || next.value === "-=" || next.value === "*=" || next.value === "/=") {
      const name = this.eatIdent()!;
      const op = this.eatPunct("=", "+=", "-=", "*=", "/=")!;
      const expr = this.parseExpr();
      if (op === "=") return { k: "assign", name, expr };
      if (op === "+=") return { k: "addassign", name, expr };
      return {
        k: "assign",
        name,
        expr: { k: "binop", op: op[0], a: { k: "ident", name }, b: expr },
      };
    }
    if (next.value === "++" || next.value === "--") {
      const name = this.eatIdent()!;
      const op = this.eatPunct("++", "--")!;
      return { k: "inc", name, delta: op === "++" ? 1 : -1 };
    }
    return null;
  }

  parseSimpleAssignOrDecl(): Stmt | null {
    const d = this.tryDeclNoSemi();
    if (d) return d;
    const a = this.tryAssignOrInc();
    return a;
  }

  tryDeclNoSemi(): Stmt | null {
    if (!(this.peek().kind === "ident" && TYPES.has(this.peek().value))) return null;
    if (this.peekAt(1).kind !== "ident") return null;
    const type = this.eatIdent()!;
    const name = this.eatIdent()!;
    let init: Expr | undefined;
    if (this.eatPunct("=")) init = this.parseExpr();
    return { k: "decl", type, name, init };
  }

  parseExpr(): Expr {
    this.guard();
    return this.parseOr();
  }

  parseOr(): Expr {
    let left = this.parseAnd();
    while (this.eatPunct("||")) left = { k: "binop", op: "||", a: left, b: this.parseAnd() };
    return left;
  }

  parseAnd(): Expr {
    let left = this.parseBitOr();
    while (this.eatPunct("&&")) left = { k: "binop", op: "&&", a: left, b: this.parseBitOr() };
    return left;
  }

  parseBitOr(): Expr {
    let left = this.parseBitXor();
    while (this.eatPunct("|")) left = { k: "binop", op: "|", a: left, b: this.parseBitXor() };
    return left;
  }

  parseBitXor(): Expr {
    let left = this.parseBitAnd();
    while (this.eatPunct("^")) left = { k: "binop", op: "^", a: left, b: this.parseBitAnd() };
    return left;
  }

  parseBitAnd(): Expr {
    let left = this.parseEq();
    while (this.eatPunct("&")) left = { k: "binop", op: "&", a: left, b: this.parseEq() };
    return left;
  }

  parseEq(): Expr {
    let left = this.parseRel();
    for (;;) {
      const op = this.eatPunct("==", "!=");
      if (!op) break;
      left = { k: "binop", op, a: left, b: this.parseRel() };
    }
    return left;
  }

  parseRel(): Expr {
    let left = this.parseShift();
    for (;;) {
      const op = this.eatPunct("<", ">", "<=", ">=");
      if (!op) break;
      left = { k: "binop", op, a: left, b: this.parseShift() };
    }
    return left;
  }

  parseShift(): Expr {
    let left = this.parseAdd();
    for (;;) {
      const op = this.eatPunct("<<", ">>");
      if (!op) break;
      left = { k: "binop", op, a: left, b: this.parseAdd() };
    }
    return left;
  }

  parseAdd(): Expr {
    let left = this.parseMul();
    for (;;) {
      const op = this.eatPunct("+", "-");
      if (!op) break;
      left = { k: "binop", op, a: left, b: this.parseMul() };
    }
    return left;
  }

  parseMul(): Expr {
    let left = this.parseUnary();
    for (;;) {
      const op = this.eatPunct("*", "/", "%");
      if (!op) break;
      left = { k: "binop", op, a: left, b: this.parseUnary() };
    }
    return left;
  }

  parseUnary(): Expr {
    if (this.eatPunct("!")) return { k: "unop", op: "!", a: this.parseUnary() };
    if (this.eatPunct("-")) return { k: "unop", op: "-", a: this.parseUnary() };
    if (this.eatPunct("+")) return this.parseUnary();
    return this.parsePostfix();
  }

  parsePostfix(): Expr {
    let e = this.parsePrimary();
    for (;;) {
      if (this.eatPunct(".")) {
        const comp = this.eatIdent() || "x";
        e = { k: "member", a: e, comp };
        continue;
      }
      break;
    }
    return e;
  }

  parsePrimary(): Expr {
    if (this.at("number")) {
      const raw = this.peek().value;
      this.i += 1;
      if (raw.includes(".") || raw.toLowerCase().includes("e")) {
        return { k: "float", n: Number(raw), raw };
      }
      const n = raw.toLowerCase().startsWith("0x") ? Number.parseInt(raw, 16) : Number(raw);
      return { k: "int", n: Number.isFinite(n) ? n : 0, raw };
    }
    if (this.at("string")) {
      const s = this.peek().value;
      this.i += 1;
      return { k: "str", s };
    }
    if (this.at("ident")) {
      const name = this.eatIdent()!;
      if (this.eatPunct("(")) {
        const args = this.parseArgList();
        return { k: "call", name, args };
      }
      return { k: "ident", name };
    }
    if (this.eatPunct("(")) {
      if (this.peek().kind === "ident" && TYPES.has(this.peek().value) && this.peekAt(1).kind === "punct" && this.peekAt(1).value === ")") {
        let type = this.eatIdent()!;
        if (type === "quaternion") type = "rotation";
        this.eatPunct(")");
        return { k: "cast", type, a: this.parseUnary() };
      }
      const inner = this.parseExpr();
      this.eatPunct(")");
      return { k: "paren", a: inner };
    }
    if (this.eatPunct("<")) {
      const items: Expr[] = [];
      if (!this.at("punct", ">")) {
        items.push(this.parseAdd());
        while (this.eatPunct(",")) items.push(this.parseAdd());
      }
      this.eatPunct(">");
      return { k: "vec", items };
    }
    if (this.eatPunct("[")) {
      const items: Expr[] = [];
      if (!this.at("punct", "]")) {
        items.push(this.parseExpr());
        while (this.eatPunct(",")) items.push(this.parseExpr());
      }
      this.eatPunct("]");
      return { k: "list", items };
    }
    this.warn(`expected expression, got '${this.peek().value}'`);
    const v = this.peek().value;
    if (!this.at("eof")) this.i += 1;
    return { k: "raw", code: v || "0" };
  }

  parseArgList(): Expr[] {
    const args: Expr[] = [];
    if (this.eatPunct(")")) return args;
    args.push(this.parseExpr());
    while (this.eatPunct(",")) args.push(this.parseExpr());
    this.eatPunct(")");
    return args;
  }
}

export function parseLsl(source: string): ScriptAst {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parseScript();
}

export function exprIsTrue(e: Expr): boolean {
  return e.k === "ident" && e.name === "TRUE";
}

export function exprIsIdent(e: Expr, name: string): boolean {
  return e.k === "ident" && e.name === name;
}

export function exprCallName(e: Expr): string | null {
  return e.k === "call" ? e.name : null;
}
