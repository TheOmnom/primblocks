# Changes

## 0.2.9

File menu on the yellow brick.

- Click the yellow brick next to **PrimBlocks** for **New**, **Open**, **Save**, **Save As**, and **Import LSL**.
- Save writes a `.primblocks` project (bricks, script name, notecard). Open reads it back. The right-hand **Download** is still the compiled `.lsl`.
- **Import LSL** takes a `.lsl` or `.txt` and rebuilds bricks from the script. Calls we do not have a brick for land in a raw LSL brick so nothing is thrown away.
- **New** is an empty stack. The greeter lives under Examples. The old Reset button is gone.
- Cables sit on top of bricks. Move a stack onto a noodle and the cable goes around it, not through. Open keeps the bricks where you left them.

Shortcuts: Ctrl+N / O / S. Ctrl+Shift+S is Save As, Ctrl+Shift+O is Import. On a Mac that is ⌘.

## 0.2.8

Tip jars, wearables, and a Tips switch.

- Six more walkthroughs: **Drop it on land** (basic), **A tip jar** and **Wear this HUD** (intermediate), **Worn and placed** (advanced), **Tip jar that travels** and **Split the tips** (expert). Next still waits on the brick. **Done — keep this** leaves the stack as the open project. The X still puts the parked stack back.
- **Tips** in the header. Drop a brick, get a bubble. Receiving a tip does **not** need `PERMISSION_DEBIT`. `llGiveMoney` does.
- Constants → `PAY_DEFAULT` / `PAY_HIDE`. `llSetPayPrice` shadows `PAY_DEFAULT`. `CLICK_ACTION_PAY` was already in the click constants.
- Matching examples: land drop greeter, tip jar, wearable HUD, worn-or-placed, traveling tip jar, split tips.
- Flyout scrollbar (Events, Control, the long lists) used to stay painted on the grid after the menu closed. It's gone when the menu is gone. Wheel zoom is unchanged.

Still not every ll* on the wiki. Forced delays still warn. Mouse wheel still zooms.

## 0.2.7

LSL that actually saves in a prim, plus the wiki events that were missing.

- Yellow hats now cover the wiki event set: Combat 2.0 `on_damage` / `final_damage` / `on_death`, and `game_control` (gamepad). `llDamage`, `llAdjustDamage`, `llDetectedDamage`, `llDetectedRezzer`, `llGetHealth`, `llDetectedOwner`, `llDetectedGroup` are in the flyout. `PERMISSION_GAME_CONTROL`, `DAMAGEABLE`, and `DAMAGE_TYPE_*` sit in Constants.
- Calls that return a value but people fire as a statement (`llSetRegionPos`, `llGiveMoney`, HTTP-in URL request, linkset data write/delete) snap under a hat. LSL allows throwing the return away. For the rest (HTTP request, notecard line) there is Control → **run (discard return)**.
- Group bricks no longer extra-indent their body. `llSay` tooltip matches the 1023-byte cap. `event` is reserved, same as the compiler.
- Tutorials still start empty and wait on the brick. The expert raw-LSL walkthrough points at the new hats instead of pretending combat isn't there.

No change to how you paste. Forced delays still warn.

## 0.2.6

Mouse wheel on the brick grid zooms. It used to pan, which made the canvas keep growing and left a gray scrollbar hanging in the middle of the workspace. Drag empty space to pan. The + / − in the corner still work. Flyout lists still scroll if a category is long.

Also in this one (was sitting on `dev`):

- Toolbar talks to GitHub on launch. Current build shows `v0.2.6`. Newer tag → **New Version Available**.
- Color dialog actually loads — `llListen` is a statement now (LSL lets you throw away the handle).
- Notecard / counter examples no longer come in empty.
- Wired greeter / wired sensor / wired name + key examples.
- Tutorials start empty and will not enable Next until the brick is actually there.

No new ll* calls. Forced delays and snap rules are the same.

## 0.2.5

Cables, presets, and tutorials that actually make you put the bricks down.

- **Cables** toolbox: `group`, `send along`, `along`. Matching names draw a noodle across the workspace. Compiles to a typed global (`string cbl_greeting = "";` and so on). Unused / unmatched names warn.
- **Presets** in the header. Saves the workspace, script name, and notecard in this browser (or the desktop app profile). Nothing goes to a server. Saving the same name overwrites.
- **Tutorials** start from empty (or a known example) and will not let you hit Next until the brick they asked for is actually there. They tell you why that field is what it is. Quitting puts your previous stack back.

No new ll* calls. Forced delays and snap rules are the same.
