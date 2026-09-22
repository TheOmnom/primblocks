# Review notes

Working `0.2.12`. Wiki was the spec; I have not pasted every example into a live sim yet. Do that before you trust a brick.

Screenshots of the current chrome: [SCREENSHOTS.md](SCREENSHOTS.md).

## Where to start

1. **Does it boot?** `npm install && npm run dev`. Examples → Touch greeter. Right panel should be:

   ```lsl
   default
   {
       touch_start(integer num_detected)
       {
           llSay(0, "Hello, Avatar!");
           llOwnerSay("Touched.");
       }
   }
   ```

   If `llOwnerSay` is missing, the next-block chain (`scrub_`) is broken again.

2. **Paste the examples into a prim.** Expected output is in [EXAMPLES.md](EXAMPLES.md). Notecard greeter needs a matching note named `config` in the same prim. Door is the one that usually bites: two states, `llEuler2Rot(... * DEG_TO_RAD)`, hover text on `state_entry`, listens/timers must be re-armed after a state change (door doesn't use those). Tip jar should `money(key id, integer amount)` — not `llDetected*`. Wearable should `llOwnerSay`, not Nearby. Split tips need `PERMISSION_DEBIT` **and** a real partner key; leave partner as `NULL_KEY` and the give is skipped.

3. **Generator rules that are easy to get wrong** — list below. Most of the "is this legal LSL?" questions land in `assemble.ts` + `blocks.ts`.

4. **Catalog vs wiki.** [CATALOG.md](CATALOG.md) is generated from `functions.ts` / `events.ts`. If a signature is wrong, fix the table, not a one-off in the generator.

5. **What is not bricked.** Known gaps at the bottom. Raw LSL statement / expression bricks are the escape hatch.

## Generator rules that are easy to get wrong

| Rule | Where |
|---|---|
| `default` exists and is **first**, even if you only built `state open` | `assemble.ts` |
| No `void` keyword. Events have no return type | `assemble.test.ts` asserts this |
| `for (integer i = 0; …)` is **illegal**. Repeat brick emits `integer _i_…; for (_i_ = 0; …)` | `blocks.ts` `lsl_repeat` |
| Brick label order ≠ call order. `llSay` brick is "say MSG on channel CHANNEL" but emits `llSay(CHANNEL, MSG)` | `FnDef.order` in `functions.ts` |
| Duplicate event in the same state is dropped (LSL allows one handler) | `generator.ts` `seenEvent` |
| Notecard reader merges into `state_entry` / `dataserver` / `changed` instead of emitting a fake event | `notecard-gen.ts` `applyReadersToStates` |
| Float literals always have a `.0` so they stay floats (`1` vs `1.0`) | `lsl_float` |
| Euler brick is degrees in, `llEuler2Rot(v * DEG_TO_RAD)` out | `lsl_euler_rot` |
| Listens, sensors, timers die on state change. Editor warns. It does **not** auto-insert a `state_entry` re-arm | `validate.ts` / Guide |
| User functions cannot `state foo;` — LSL compiler rejects it. The brick still lets you snap one; that is a hole | `lsl_function` |
| Colors are `vector` 0.0–1.0, not 0–255 | Looks bricks, `limits.ts` |
| `llSleep` freezes **this** script. Forever-loop brick injects a sleep so you cannot lock the sim by accident | `lsl_forever` |
| Scripts do not hear their own `llMessageLinked` | tooltip only |
| `llRegionSay` channel 0 is illegal | tooltip / limits |

## Type snaps

`src/lib/lsl/types.ts` + `checker.ts`. Tests in `types.test.ts`.

- Integer → float socket: yes. Float → integer: no (use the cast brick).
- String and key are interchangeable at the socket (LSL is like that).
- Boolean sockets take integer / TRUE / FALSE.
- `%` is integer or vector, not float.
- Vector * vector is a dot product (float). Vector % vector is cross.
- You cannot compare lists with `==`.
- List + anything concatenates (list out).
- `if` conditions are integer, not float.

If a snap feels wrong, that file is the spec, not Blockly's default checker.

## Code map (short)

```
src/lib/lsl/functions.ts   ll* table — source of truth for bricks
src/lib/lsl/events.ts      event hats + official signatures
src/lib/lsl/generator.ts   walk workspace, group by state, wire ll* emitters
src/lib/lsl/assemble.ts    emit the .lsl text
src/lib/lsl/blocks.ts      Blockly JSON + forBlock (control, literals, vars)
src/lib/lsl/validate.ts    warnings on the workspace / code panel
src/lib/lsl/limits.ts      forced delays + in-world caps
src/lib/lsl/types.ts       snap legality
src/lib/lsl/checker.ts     connection checker (refuses illegal snaps)
src/lib/lsl/toolbox.ts     flyout categories
src/lib/lsl/notecard.ts    notecard format, 255-byte inspect, presets
src/lib/lsl/notecard-gen.ts  start fn + dataserver merge
src/lib/lsl/examples.ts    bundled scripts (greeter through split tips)
src/lib/lsl/tutorials.ts   brick-by-brick walkthroughs
src/lib/lsl/help.ts        Tips bubbles — catalog parse + handwritten extras
src/lib/lsl/engine.ts      inject Blockly, persist hooks, BLOCK_CREATE for Tips
src/components/block-editor.tsx   chrome (examples / tutorials / tips / notecard / guide / copy)
src/components/help-bubble.tsx    the bubble Tips draws next to a dropped brick
src/components/notecard-editor.tsx  inventory notecard builder
src/components/code-panel.tsx     highlighted LSL + copy/download
```

## Known gaps / TODOs

Not pretending these are done:

- **Not every ll\*.** No vehicles, no KFM, no full PRIM_TYPE sculpt/mesh surface, no pathfinding character API (the `path_update` *event* exists), thin experience support (two permission events only), no `llJson*`, no `llHMAC*` / `llSHA256*`, no `llCastRay` extras, no `llGetEnv` / `llGetEnvironment`. Combat 2.0 hats and `llDamage` / `llAdjustDamage` / `llDetectedDamage` / `llGetHealth` are in. `game_control` is in. Catalog is still a working subset, not the whole wiki.
- **List brick is 4 slots.** Longer lists: empty list + `llListInsertList`, or a raw expression brick.
- **No jump / label bricks.** LSL has `jump` / `@label`. Use raw LSL.
- **State change inside a user function** is not blocked at snap time.
- **Particle brick is one explode preset**, plus an off brick. Full PSYS editor is not here — dump a list into `llParticleSystem`.
- **No cloud save.** localStorage only (`primblocks.workspace.v1`, `primblocks.notecard.v1`, `primblocks.helpMode.v1`).
- **No in-world compile.** Copy/paste is the loop. Notecard greeter is the one I actually structured like a real object (script + note in the same prim).
- **`llSetLinkPrimitiveParamsFast` is a list dump**, not a PRIM_* builder UI.

If you want those, file it on `dev`. Don't try to finish the wiki in one pass — the table is already large.

## How to verify a change

```
npm test
npm run typecheck
npm run catalog
```

Then load each example, copy, paste into a script in-world. If the editor says it is legal and Mono disagrees, the wiki row in `functions.ts` / `events.ts` is wrong — fix the table.
