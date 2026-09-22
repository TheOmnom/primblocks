# PrimBlocks

Snap LSL together from puzzle bricks, then paste a real Second Life script into a prim.

**Version:** `0.2.13`

Yellow hats are events. Colored bricks stack under them. The panel on the right is the compiled `.lsl` — not a sketch.

Second Life / LSL are Linden Lab trademarks. This is not affiliated with Linden Lab.

## Not a programmer?

You do not install Node. You download **one file** from
[Releases](https://github.com/TheOmnom/primblocks/releases).

| I use… | Download this |
| --- | --- |
| Windows, just make it work | **PrimBlocks-Setup.exe** |
| Windows, no installer | PrimBlocks-windows.zip |
| Mac | PrimBlocks-mac.dmg |
| Linux | PrimBlocks-linux.AppImage |
| I want the code | Source code (zip) — skip this unless you are building it |

Then:

1. Run that file. Windows: if it says *Windows protected your PC* → **More info** → **Run anyway**. Mac: right-click → **Open**.
2. **Tutorials** (start at Basic) or **Examples** → **Touch greeter** → **Copy**.
3. In Second Life: right-click a prim → **Build** → **Content** → **New Script** → paste → **Save**.

Full walkthrough: [packaging/GETTING_STARTED.txt](packaging/GETTING_STARTED.txt).

## What it is

Not a full LSL IDE. The catalog is the events + the ll* calls you actually use for greeters, doors, listens, dialogs, sensors, particles, and the usual sensing/world helpers. Raw LSL bricks cover the rest.

- **File** — yellow brick next to the title. New, Open, Save, Save As (`.primblocks` project), Import LSL (rebuilds bricks from a `.lsl` / `.txt`), Quit
- **Puzzle bricks** — Blockly 13, colored C-hats, toolbox categories
- **Noodles** — set a variable in one place, get it in another, and the line draws itself. Goes around a stack that is in the way
- **Presets** — save the current workspace in this browser / the desktop profile. Nothing is uploaded
- **Tutorials** — basic / intermediate / advanced / expert. Empty workspace, one brick at a time, Next stays off until that brick is there. Done keeps the stack. X puts the parked one back. Tip jar, wearable, land-drop, and worn+placed are in there.
- **Tips** — header switch. Drop a brick, get a bubble. Off by default.
- **Legal compilation units** — `default` always first, typed globals, no `void`, `for` index declared outside the `for`
- **Official event signatures** — `touch_start(integer num_detected)`, `listen(integer channel, string name, key id, string message)`, etc.
- **ll* catalog** — chat, looks, motion, sound, sensing, world, lists, math. Wiki link on every brick tooltip
- **Type snaps** — integer will plug into a float socket, not the other way around. String + number needs a cast brick
- **Warnings** — sensor range, chat bytes, timer faster than a sim frame, forced delays (IM 2s, dialog 1s, `llSetPos` 0.2s)
- **Examples** — greeter, notecard greeter, two-state door, timer counter, owner commands, color dialog, nearby sensor, three wired ones, plus land-drop, tip jar, wearable HUD, worn-or-placed, traveling tip jar, split tips
- **Notecards** — builder panel (`key = value`, `#` comments, 255-byte lines) + a read-notecard hat that emits the real dataserver / EOF / NAK / inventory-check / CHANGED_INVENTORY pattern
- **localStorage** — workspace + script name + notecard survive a refresh. Nothing is uploaded

## Screenshots

Editor (desktop):

| Greeter | Door | Timer |
| --- | --- | --- |
| ![Greeter](docs/screenshots/editor-greeter.png) | ![Door](docs/screenshots/editor-door.png) | ![Counter](docs/screenshots/editor-counter.png) |

Toolbox (Events / Chat / Looks):

| Events | Chat | Looks |
| --- | --- | --- |
| ![Events](docs/screenshots/flyout-events.png) | ![Chat](docs/screenshots/flyout-chat.png) | ![Looks](docs/screenshots/flyout-looks.png) |

Warnings + phone:

| Timer too fast | Dialog delay | Phone LSL sheet |
| --- | --- | --- |
| ![Timer warn](docs/screenshots/warn-timer.png) | ![Dialog warn](docs/screenshots/warn-dialog.png) | ![Mobile LSL](docs/screenshots/mobile-lsl.png) |

Full set (every flyout, every example, guide, variable dialog): [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md).

## From source

```
npm install
npm run dev
```

Opens on port 5173. Same Copy → New Script → Save loop.

Desktop window (needs [Rust](https://rustup.rs)):

```
npm run desktop
```

```
npm test
npm run typecheck
```

## How it compiles

1. Yellow hats are top-level. Each hat has a **state** field (`default` unless you are doing a door / vendor / etc).
2. Commands under a hat become the event body.
3. Variables become typed globals (`integer count = 0;`, `key id = NULL_KEY;`, …).
4. User-function bricks emit above states. LSL will not let a function change state — don't put a state brick in one.
5. `assembleScript()` writes: comments → globals → functions → `default` → other states alphabetically.

Details: [docs/LSL.md](docs/LSL.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/REVIEW.md](docs/REVIEW.md).

## Docs

| File | What |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | What changed in 0.2.13 |
| [packaging/GETTING_STARTED.txt](packaging/GETTING_STARTED.txt) | Which file to download, then what to click |
| [packaging/README.md](packaging/README.md) | How the Release is built |
| [docs/REVIEW.md](docs/REVIEW.md) | Where to start, easy-to-break generator rules, known gaps |
| [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) | Full screenshot gallery |
| [docs/LSL.md](docs/LSL.md) | LSL rules this editor actually encodes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Files, generator pipeline, adding a brick |
| [docs/CATALOG.md](docs/CATALOG.md) | Event + ll* table generated from source (`npm run catalog`) |
| [docs/EXAMPLES.md](docs/EXAMPLES.md) | The bundled scripts and what they should emit |
| [docs/EXTENDING.md](docs/EXTENDING.md) | How to add an ll* brick without touching the generator by hand |

## Branching

- **`dev`** — working branch. Editor, catalog, docs.
- **`main`** — GitHub default. The Windows/Mac/Linux Release is built from here.

See [BRANCHING.md](BRANCHING.md).

## License / notes

Personal / local use. `0.2.13` — catalog is not every ll* on the wiki. Hover a brick for the wiki signature. Forced delays and in-world caps warn; they still compile because the simulator is what actually sleeps / clamps.
