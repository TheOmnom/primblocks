# Architecture

Browser app. React 19 + Vite + Tailwind 4 + Blockly 13 (Zelos renderer). No backend. Workspace JSON lives in `localStorage`.

## Pipeline

```
toolbox.ts  →  Blockly workspace  →  generator.ts  →  assemble.ts  →  .lsl text
     ↑                  ↑                  ↑
events.ts          checker.ts         blocks.ts forBlock
functions.ts       types.ts           functions.ts order[]
                   validate.ts
                   limits.ts
```

1. `registerBlocks()` builds Blockly JSON from the event/function tables, then installs `forBlock` emitters.
2. `mountWorkspace()` injects Zelos, the custom connection checker, and the Variables flyout callback.
3. On every non-UI change, `analyzeWorkspace()` runs `generateLsl()` + `validateWorkspace()`.
4. `generateLsl()` walks **top blocks only**:
   - typed variables → globals
   - `lsl_function` → functions
   - `lsl_event_*` → grouped by the STATE field
   - stray comments / raw bricks at the top level are ignored (note in the header)
5. `assembleScript()` prints the compilation unit. `default` is created empty if missing.

`scrub_` on the generator appends `next` blocks. Blockly's default scrub missed statement stacks; do not drop that override.

## Catalog-driven bricks

An ll* brick is one `fn(...)` row in `functions.ts`:

```ts
fn("llSay", "chat", "say %1 on channel %2", [msg(), ch(0)],
   "llSay(integer channel, string msg) — 20 m, 1024-byte cap.",
   { order: ["CHANNEL", "MSG"] })
```

That row feeds:

- Blockly message / sockets / color / tooltip / wiki help URL
- toolbox flyout (shadows from `ShadowSpec`)
- `wireFunctionGenerators()` so you do **not** write a `forBlock` by hand

`order` is how English brick labels map onto the official positional args. If you omit it, args go in `args` order.

Events are the same idea in `events.ts` — `hat` is the English C-hat, `params` become the LSL signature.

## Types vs Blockly checks

Blockly `check` strings are the *socket* names: `Integer`, `Number` (float), `String`, `Key`, `Vector`, `Rotation`, `List`, `Boolean`.

LSL's own type names (`integer`, `float`, …) are used for variables and casts. `types.ts` maps between them and decides promotions.

## Control bricks that are not ll*

In `blocks.ts`: if / if-else / while / do-while / repeat / forever / state change / return / comment / raw / user function / vars / lists / casts / arithmetic / particles preset / glow / fullbright / point light / named color / event-param reader.

Repeat is the only one that invents a local. The ident is derived from the block id so two repeats in one event do not collide.

## Persistence

```
primblocks.workspace.v1    Blockly serialization JSON
primblocks.scriptName.v1   filename for download
```

Clear site data if an old workspace schema starts throwing on load — `loadState` falls back to the greeter example.

## Tests

Node built-in test runner, TypeScript via `--experimental-strip-types`.

- `assemble.test.ts` — default-first, globals/functions/states order, no `void`, identifier sanitize, string escapes
- `types.test.ts` — promotions, illegal arithmetic, assignment checks, a couple of `inspectCall` delay/limit hits

There is no Blockly-in-jsdom test. Example LSL is reviewed by loading the example in the editor (or reading `examples.ts`).
