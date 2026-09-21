# Architecture

Browser app. React 19 + Vite + Tailwind 4 + Blockly 13 (Zelos renderer). No backend. Workspace JSON lives in `localStorage`.

## Pipeline

```
toolbox.ts  →  Blockly workspace  →  generator.ts  →  assemble.ts  →  .lsl text
     ↑                  ↑                  ↑                              │
events.ts          checker.ts         blocks.ts forBlock                 │
functions.ts       types.ts           functions.ts order[]                ▼
                   validate.ts        import-lsl.ts  ←  .lsl / .txt  (File → Import)
                   limits.ts
```

1. `registerBlocks()` builds Blockly JSON from the event/function tables, then installs `forBlock` emitters.
2. `mountWorkspace()` injects Zelos, the custom connection checker, and the Variables flyout callback.
3. On every non-UI change, `analyzeWorkspace()` runs `generateLsl()` + `validateWorkspace()`.
4. `generateLsl()` walks **top blocks only**:
   - typed variables → globals (empty-type Blockly leftovers are skipped)
   - `lsl_function` → functions
   - `lsl_notecard_read` → not an LSL event. Collects reader specs, emits `nc_start_*()` + globals, then `applyReadersToStates()` **prepends** into existing `state_entry` / `dataserver` / `changed` (LSL allows one handler per event)
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

In `blocks.ts`: if / if-else / while / do-while / repeat / forever / state change / return / comment / raw / user function / vars / lists / casts / arithmetic / particles preset / glow / fullbright / point light / named color / event-param reader / notecard reader + line/key/value/ready bricks.

Repeat is the only one that invents a local. The ident is derived from the block id so two repeats in one event do not collide.

Notecard format + LSL merge live in `notecard.ts` / `notecard-gen.ts`. The hat is a composite. Do not add a second `dataserver` brick for the same card — the generator already emits that handler.

## Persistence

```
primblocks.workspace.v1    Blockly serialization JSON
primblocks.scriptName.v1   filename for download
primblocks.notecard.v1     Notecard panel document (name + rows)
```

Clear site data if an old workspace schema starts throwing on load — `loadState` falls back to the greeter example.

## Tests

Node built-in test runner, TypeScript via `--experimental-strip-types`.

- `assemble.test.ts` — default-first, globals/functions/states order, no `void`, identifier sanitize, string escapes
- `notecard.test.ts` — format round-trip, 255-byte cap, NAK/EOF start function, merge does not duplicate `state_entry`
- `tutorials.test.ts` — every walkthrough starts empty, waits on a brick, four difficulty bands, tip-jar / wearable ids
- `help.test.ts` — every event hat and ll* brick has a bubble; extras are handwritten

There is no Blockly-in-jsdom test. Example LSL is reviewed by `npm run smoke:examples` (loads each example into a headless workspace) and by reading `examples.ts`.
