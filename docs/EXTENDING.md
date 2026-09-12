# Adding a brick

You should not have to touch `generator.ts` for a normal ll* call.

## New ll* function

1. Open `src/lib/lsl/functions.ts`.
2. Add a `fn(...)` row in the right category (`chat`, `looks`, `motion`, `sound`, `sensing`, `world`, `operator`, `list`).
3. English `message` uses `%1`, `%2`, … matching `args` **left to right as shown on the brick**.
4. If LSL's positional order is different, set `order: ["OFFICIAL_ARG", …]` using the `args[].name`s.
5. `returns` if it is a reporter (value socket). Omit it for a stack command (`llFoo(...);`).
6. Tooltip should start with the official signature, then the gotcha (range, delay, permission).
7. If the wiki lists a forced delay, add it to `FORCED_DELAYS` in `limits.ts`.
8. If it has an in-world cap we should warn on, add a case in `inspectCall`.
9. `npm run catalog` so `docs/CATALOG.md` matches.

Shadows (`ShadowSpec`) put a default literal on the socket so the brick is usable the moment it is dropped:

- `{ kind: "int", value: 0 }`
- `{ kind: "float", value: 1 }`
- `{ kind: "string", value: "Hello, Avatar!" }`
- `{ kind: "vector", x, y, z }`
- `{ kind: "const", block: "lsl_const_face", value: "ALL_SIDES" }`

`toolbox.ts` already pulls every `LSL_FUNCTIONS` row by category. No flyout edit unless you want a preset next to it (see sparkle particles).

## New event

`src/lib/lsl/events.ts` — `ev("name", "when … in state %1", params, tooltip)`.

`name` must be in `LSL_EVENTS` in `reserved.ts` (TypeScript will complain if not). `%1` is the state field. Params must match the wiki **names**, not just types — scripts people already have use `num_detected`, `start_param`, etc.

The generator wraps `statementToCode(DO)` in that signature. Do not add a `forBlock` unless the event is weird.

## New control / literal

That is `blocks.ts`. JSON def + `lslGenerator.forBlock.your_type = …`. Follow the existing if/while/repeat pattern: always emit braces, always 4-space indent via the generator.

## New constant dropdown

There is already a pile of `lsl_const_*` blocks at the bottom of `blocks.ts` (bool, faces, links, math, channels, status, changed, perms, sensor, inventory, controls, click action, agent data, trim, list stats, EOF). Add another there and a toolbox entry in the Constants category.

## Don't

- Don't emit `for (integer i = 0; …)`.
- Don't emit `void`.
- Don't put a new ll* emitter as a one-off in `generator.ts` — it will drift from the table.
- Don't add auth, a database, or cloud save unless that is the ask.
