# Changes

Written the way I talk about the app, not the way a ticket tracker talks about it. Newest first.

## 0.2.12

Examples still had a little "Wired …" club, as if noodles were a special mode. They are not.

Those three are just **Detect then greet**, **Sensor then greet**, and **Name and key**. **group** is orange now, same as the rest of Control.

Hats were sitting on top of each other because I had guessed the y and the bricks are taller than that. After Examples / Import they get spaced so one stack is never covering another. Open still keeps where you put things.

## 0.2.11

I used to make you pick send/along out of a Cables list so a noodle would show up. That's backwards. The noodle is just "this value is written here and read there."

So: set a variable in one group, get it in another, and the line draws itself. Same picture as **Examples → Name and key**. Tip jar `total` does it too. There is no Cables list anymore. **group** moved under Control, because it was only ever a frame.

Old projects that still have send/along bricks compile. Import of `cbl_who = …` becomes ordinary set/get of `who`.

## 0.2.10

The tutorial card sat on the bricks it was talking about and you could not move it. Drag the title bar (the grip on the left). It stays put for the rest of that walkthrough.

## 0.2.9

I got tired of Reset wiping a stack with no way to get a file back.

Click the yellow brick next to **PrimBlocks**. That's File: **New**, **Open**, **Save**, **Save As**, **Import LSL**. Save writes a `.primblocks` project (bricks, the script name, the notecard). Open reads it back. The **Download** on the right is still the compiled `.lsl` you paste in a prim.

Import takes a `.lsl` or `.txt` and rebuilds bricks. A call I don't have a brick for lands in a raw LSL brick so nothing is thrown away. **New** is empty — the greeter lives under Examples. Reset is gone.

Noodles sit on top of bricks and go around a stack that is in the way, not through it. Open keeps the bricks where you left them.

Tutorials finally name the left-list category and the brick as it is printed, so you are not hunting for `touch_start` when the hat says **when touched**.

Ctrl+N / O / S. Ctrl+Shift+S is Save As, Ctrl+Shift+O is Import. On a Mac that is ⌘.

## 0.2.8

I wanted walkthroughs for the stuff people actually rez: a tip jar, something you wear, something you drop on land, and the ones that do both.

Six more: **Drop it on land** (basic), **A tip jar** and **Wear this HUD** (intermediate), **Worn and placed** (advanced), **Tip jar that travels** and **Split the tips** (expert). Next still waits on the brick. **Done — keep this** leaves the stack as the open project. The X still puts the parked one back.

**Tips** in the header. Drop a brick, get a bubble. Receiving a tip does **not** need `PERMISSION_DEBIT`. `llGiveMoney` does. Constants → `PAY_DEFAULT` / `PAY_HIDE`. `llSetPayPrice` shadows `PAY_DEFAULT`.

The flyout scrollbar (Events, Control, the long lists) used to stay painted on the grid after the menu closed. It's gone when the menu is gone.

Still not every ll* on the wiki. Forced delays still warn. Mouse wheel still zooms.

## 0.2.7

Hats I had skipped because they felt niche, until someone actually needed them in a prim.

Yellow hats now cover the wiki event set: Combat 2.0 `on_damage` / `final_damage` / `on_death`, and `game_control` (gamepad). `llDamage`, `llAdjustDamage`, `llDetectedDamage`, `llDetectedRezzer`, `llGetHealth`, `llDetectedOwner`, `llDetectedGroup` are in the flyout. `PERMISSION_GAME_CONTROL`, `DAMAGEABLE`, and `DAMAGE_TYPE_*` sit in Constants.

Calls that return a value but people fire as a statement (`llSetRegionPos`, `llGiveMoney`, HTTP-in URL request, linkset data write/delete) snap under a hat. LSL allows throwing the return away. For the rest (HTTP request, notecard line) there is Control → **run (discard return)**.

Group bricks no longer extra-indent their body. `llSay` tooltip matches the 1023-byte cap. `event` is reserved, same as the compiler.

No change to how you paste.

## 0.2.6

Mouse wheel on the brick grid zooms. It used to pan, which made the canvas keep growing and left a gray scrollbar hanging in the middle of the workspace. Drag empty space to pan. The + / − in the corner still work. Flyout lists still scroll if a category is long.

Also in this one (was sitting on `dev`):

- Toolbar talks to GitHub on launch. Newer tag → **New Version Available**.
- Color dialog actually loads — `llListen` is a statement now (LSL lets you throw away the handle).
- Notecard / counter examples no longer come in empty.
- Wired greeter / wired sensor / wired name + key examples.
- Tutorials start empty and will not enable Next until the brick is actually there.

No new ll* calls. Forced delays and snap rules are the same.

## 0.2.5

This is when it stopped being "a Blockly demo with LSL on the side."

Cables were a toolbox: `group`, `send along`, `along`. Matching names drew a noodle. Compiled to `string cbl_greeting = "";` and so on. That list is gone as of 0.2.11 — the noodle is automatic now — but this is where the picture started.

**Presets** in the header. Saves the workspace, script name, and notecard in this browser (or the desktop app profile). Nothing goes to a server. Saving the same name overwrites.

**Tutorials** start from empty (or a known example) and will not let you hit Next until the brick they asked for is actually there. They tell you why that field is what it is. Quitting puts your previous stack back.

## 0.2.0

First public cut. Snap LSL together from puzzle bricks, paste the right-hand panel into a New Script, Save in a prim.

Yellow hats are events. Colored bricks stack under them. `default` is first because the compiler requires it. Types snap the way LSL snaps — integer into a float socket, not the other way around. The catalog is the ll* you actually use for greeters, doors, listens, dialogs, sensors, particles. Raw LSL bricks cover the rest.

Notecard panel (`key = value`, `#` comments, 255-byte lines) plus a read-notecard hat that emits the real dataserver / EOF / NAK / inventory-check / CHANGED_INVENTORY pattern. Workspace survives a refresh in this browser. Nothing is uploaded.

Windows / Mac / Linux builds sit on Releases so you do not need Node. I have not pasted every example into a live sim yet. Hover a brick for the wiki signature. Forced delays warn; they still compile because the simulator is what actually sleeps.
