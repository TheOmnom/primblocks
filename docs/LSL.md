# LSL rules PrimBlocks encodes

This is not a full language spec. It is the subset the editor refuses to get wrong, because these are the things that make a script fail to save in-world.

Spec reference: [LSL Portal](https://wiki.secondlife.com/wiki/LSL_Portal), [LSL Events](https://wiki.secondlife.com/wiki/Category:LSL_Events), [LSL Functions](https://wiki.secondlife.com/wiki/Category:LSL_Functions), [LSL Delay](https://wiki.secondlife.com/wiki/LSL_Delay).

## Compilation unit

```
// comments
typed globals
user functions          // no `state` changes in here
default { events }      // required, must be first
state other { events }  // optional
```

- There is no `void`.
- There is no `switch`.
- Identifiers: `[A-Za-z_][A-Za-z0-9_]*`. Keywords (`state`, `default`, `if`, `integer`, …) get a `_` suffix if you type them as a name.
- One handler per event per state. A second `touch_start` in `default` is dropped and noted in the header comments.

## Types

`integer` `float` `string` `key` `vector` `rotation` `list`

Globals are initialized to the LSL zero for that type:

| Type | Default |
|---|---|
| integer | `0` |
| float | `0.0` |
| string | `""` |
| key | `NULL_KEY` |
| vector | `ZERO_VECTOR` |
| rotation | `ZERO_ROTATION` |
| list | `[]` |

Casts are `(type)expr`. String + number does not coerce — use `(string)n`.

`TRUE` / `FALSE` are integers 1 / 0.

Colors are vectors of 0.0–1.0 per channel, **not** 0–255.

## Events

Hats emit the official signature, including parameter names the wiki uses (`num_detected`, not `num`). Sensing → "event value" brick reads those names. `llDetected*` is only valid inside touch / collision / sensor.

`state_entry` runs on script start, reset, and every time that state is entered. It is first in the queue.

## State change

`state open;` leaves the current state (`state_exit`), **clears the event queue**, and clears listens / sensors / timers. Re-arm them in the new state's `state_entry`.

`llResetScript()` jumps back to `default` and resets globals.

## Control

```lsl
if (cond)
{
    ...
}

integer i;
for (i = 0; i < n; ++i)
{
    ...
}
```

Conditions are integer. `while (TRUE)` forever-brick injects `llSleep` so a snapped infinite loop does not freeze the sim with no yield.

## Chat / listen

| Call | Range | Notes |
|---|---|---|
| `llWhisper` | 10 m | |
| `llSay` | 20 m | 1023-byte cap, channel 0 + DEBUG_CHANNEL throttled |
| `llShout` | 100 m | |
| `llRegionSay` | region | channel 0 **not** allowed |
| `llRegionSayTo` | one target in-region | |
| `llOwnerSay` | owner, in-region | |

`llListen` returns a handle. Empty name / `NULL_KEY` / empty message = wildcard. Max 64 listens. Removed on state change. `llListenControl` mutes without removing.

`llDialog` — 1–12 buttons, each ≤ 24 bytes. Reply arrives as `listen` on that channel.

## Motion / physics

`llSetPos` on an unattached root steps ~10 m per call and has a 0.2 s delay. `llSetRegionPos` warps in-region with no that delay, returns TRUE/FALSE.

`llSetRot` / `llSetPos` / texture calls still use the old delayed functions because they match what people type. Prefer `llSetLinkPrimitiveParamsFast` for bulk PRIM_* (no forced delay).

## Timer / sleep

`llSetTimerEvent(sec)` — `0.0` stops. Cleared on state change. Useful minimum is about one sim frame (~0.022 s), subject to dilation.

`llSleep` freezes **this** script. Events queue (max 64) but do not run. Prefer a timer for anything the user can touch during.

## Sensor

One sweep or repeat. Max 16 hits, nearest first, 96 m. Arc `PI` is a full sphere. Type is `AGENT` / `ACTIVE` / `PASSIVE` / `SCRIPTED` bitfield.

## HTTP / dataserver

`llHTTPRequest` → `http_response`. About 1 request / 0.5 s / owner, body capped (2048, or 16384 with `HTTP_BODY_MAXLENGTH`).

Notecard lines are 0-based. `data == EOF` at end (`EOF` constant brick).

## Money / permissions

`PERMISSION_DEBIT` is owner-only. `llGiveMoney` needs it. Animations / controls / attach need the matching `PERMISSION_*` from the seated or wearing avatar. Result lands in `run_time_permissions`.

## What LSL will still reject even if we emit it

- `state` inside a function
- `llRegionSay(0, …)`
- A list nested inside a list
- Using `llDetected*` outside a detect event
- Changing state from `state_exit` in some edge cases (don't)
- Mono vs LSO memory — we do not model bytecode size

The raw LSL brick will happily emit garbage. That is the point of it.
