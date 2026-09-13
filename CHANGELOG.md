# Changes

## Unreleased (dev)

Toolbar talks to GitHub on launch. If you're current it shows `v0.2.5`. If a newer tag is out, that slot becomes **New Version Available** and **Update now** (the installer for this OS). Click the version number to check again.

Color dialog actually loads — `llListen` is a statement now (LSL allows throwing away the handle). Notecard / counter examples no longer come in empty: a get-var brick whose variable isn't bound yet accepts every type during load, then tightens.

New examples, with a difficulty label:

- **Wired greeter** (intermediate) — two groups, cable `who`, noodle, compiles to `string cbl_who`
- **Wired sensor** (advanced) — same cable inside a `sensor` hat
- **Wired name + key** (expert) — two noodles, `who` (string) and `id` (key), `llRegionSayTo`

Tutorials start on an empty workspace and will not enable Next until the brick they asked for is actually there. Checklist of steps, toolbox opens to the right category.

## 0.2.5

Cables, presets, and tutorials that actually make you put the bricks down.

- **Cables** toolbox: `group`, `send along`, `along`. Matching names draw a noodle across the workspace. Compiles to a typed global (`string cbl_greeting = "";` and so on). Unused / unmatched names warn.
- **Presets** in the header. Saves the workspace, script name, and notecard in this browser (or the desktop app profile). Nothing goes to a server. Saving the same name overwrites.
- **Tutorials** start from empty (or a known example) and will not let you hit Next until the brick they asked for is actually there. They tell you why that field is what it is. Quitting puts your previous stack back.

No new ll* calls. Forced delays and snap rules are the same.
