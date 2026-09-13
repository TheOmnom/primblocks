# Bundled examples

All of these live in `src/lib/lsl/examples.ts` as Blockly serialization. Loading one replaces the workspace (and the script name). The notecard greeter also seeds the Notecard panel.

Paste targets: a box prim is enough. Door wants a prim that can rotate; sensor wants an avatar in range.

## 1. Touch greeter

Classic hello. One hat.

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

If the owner-say line is missing, `scrub_` is not following `next`.

## 2. Notecard greeter

The one that is an actual in-world object. World → read-notecard hat + a `touch_start` that waits on the ready flag.

Expected output (trimmed):

- globals `string greeting`, `integer channel`, plus `nc_name_config` / `nc_line_config` / `nc_query_config` / `nc_ready_config`
- `nc_start_config()` checks `INVENTORY_NOTECARD`, then `llGetNotecardLine(..., 0)`
- `default` has `state_entry` (calls start), `dataserver` (NAK / EOF / parse `key = value`), `changed` (`CHANGED_INVENTORY`), `touch_start`
- **one** `state_entry` and **one** `dataserver` — the reader merges, it does not duplicate
- no `void`
- Notecard panel text named `config`: `greeting = Hello, Avatar!` and `channel = 0`

In-world: New Script (paste LSL) **and** New Note (paste the panel, name it `config`), both in the same prim.

## 3. Two-state door

`default` = closed. Touch → `state open` (90° yaw). Touch again → back. Hover text on each `state_entry`.

Things to check in the output:

- `default` is first, then `state open`
- rotation is `llEuler2Rot(<0.0, 0.0, 90.0> * DEG_TO_RAD)` (or equivalent vector brick), **not** a raw degree quaternion
- `state open;` / `state default;` as statements, not function calls
- no listens/timers, so the "cleared on state change" rule does not bite here

## 4. Timer counter

Typed global `integer count`. `state_entry` starts a 1.0 s timer. `timer` event increments and hover-texts the value with a `(string)` cast.

Check:

- global is `integer count = 0;` above `default`
- `count += 1;` (change-by brick), not `count = count + 1` unless you stacked it that way
- `(string)count` — LSL will not implicitly stringify for `llSetText`

## 5. Owner commands

`state_entry` sets an `llListen` on a negative channel, filtered to the owner key. `listen` branches on the message.

Check:

- listen handle is a global if you reuse it; this example may call `llListen` and ignore the handle (legal, just cannot `llListenRemove` later)
- filter key is `llGetOwner()`, not `NULL_KEY`, so strangers on that channel are ignored
- if you add a second state later, that listen is gone until `state_entry` runs again

## 6. Color dialog

Touch → `llDialog` to the toucher (`llDetectedKey(0)`) with Red / Green / Blue on channel −42. `state_entry` calls `llListen` on that channel (statement form — LSL lets you ignore the handle). `listen` sets prim color from the button.

```lsl
llListen(-42, "", NULL_KEY, "");
llDialog(llDetectedKey(0), "Pick a color", ["Red", "Green", "Blue"], -42);
```

If this example comes in empty, `llListen` was still a reporter and Blockly refused to snap it under the hat.

## 7. Nearby greeter

`llSensorRepeat` for `AGENT`, 8 m, `PI` arc, 5 s. `sensor` event `llSay`s hello.

Check:

- range 8 is under the 96 m cap
- `no_sensor` is optional; this example does not use it
- repeating sensor is cleared on state change — only one state here

## 8. Wired greeter

Two groups under `touch_start`. `detect` sends `llDetectedName(0)` along `who`. `greet` says `along who`. Expect:

```lsl
string cbl_who = "";
…
cbl_who = llDetectedName(0);
llSay(0, cbl_who);
```

A noodle is drawn between matching names.

## 9. Wired sensor

Same cable, in a `sensor` hat, armed with `llSensorRepeat`.

## 10. Wired name + key

Expert. Two noodles. `detect` sends `who` = `llDetectedName(0)` and `id` = `llDetectedKey(0)`. `greet` says the name and `llRegionSayTo`s the key.

```lsl
string cbl_who = "";
key cbl_id = NULL_KEY;
…
cbl_who = llDetectedName(0);
cbl_id = llDetectedKey(0);
llSay(0, cbl_who);
llRegionSayTo(cbl_id, 0, "private hello");
```

Reusing `who` for the key is the usual mistake — types fight, noodle lies.

## Adding an example

`examples.ts` is Blockly serialization by hand. Pattern:

```ts
ev("lsl_event_touch_start", x, y, say("Hello, Avatar!", 0, ownerSay("Touched.")))
```

`next` is nested, not an array. Shadows must match the socket names in `functions.ts` (`MSG`, `CHANNEL`, …). After you add one, load it from the Examples dialog and copy the LSL once before you trust it.
