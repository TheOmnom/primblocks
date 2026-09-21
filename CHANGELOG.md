# Changes

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
