# Branching

**dev** is the branch I actually work on. Editor, LSL catalog, generator, docs, screenshots — all of it. Desktop CI still *builds* the Windows/Mac/Linux files on `dev` so I can download the artifacts and click through them. It does not publish a Release.

**main** is the GitHub default and the snapshot of “this compiled in a prim and I didn’t hate it.” Pushing `main` tags `v0.2.0` (or whatever is in `package.json`) and uploads:

- `PrimBlocks-Setup.exe`
- `PrimBlocks-windows.zip`
- `PrimBlocks-mac.dmg`
- `PrimBlocks-linux.AppImage`

GitHub also glues Source code (zip) and Source code (tar.gz) onto that tag. Those are for programmers.

Promote:

```
git checkout main
git merge --ff-only dev
git push
git checkout dev
```

If it isn’t fast-forward, main got a direct commit. Don’t do that.

Bump `version` in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` together *before* promoting, or the tag will collide with the last Release.

CI:

- `.github/workflows/test.yml` — `npm test` + typecheck, both branches. Red means don’t merge.
- `.github/workflows/desktop.yml` — Tauri installers. Artifacts on `dev`, GitHub Release on `main`.

## Why two branches

Same idea as the sorter repo. `dev` can be half-broken bricks and a catalog row I haven’t pasted yet. `main` should be something I could send someone without a disclaimer. Until I promote, a fresh clone of `dev` is the latest working tree. Clone of `main` (GitHub default) is the last Release.

## Running it

Not a programmer: [packaging/GETTING_STARTED.txt](packaging/GETTING_STARTED.txt).

From source:

```
npm install
npm run dev
```

http://127.0.0.1:5173

Desktop window (needs Rust):

```
npm run desktop
```

```
npm test
npm run typecheck
npm run catalog
```

`catalog` regenerates `docs/CATALOG.md` from `functions.ts` / `events.ts`. If those disagree, the TypeScript tables win.

## Persistence

The editor keeps workspace JSON in the browser / WebView profile, not next to the exe:

- `primblocks.workspace.v1`
- `primblocks.scriptName.v1`
- `primblocks.notecard.v1`

Bumping the `v1` suffix is a schema break — old localStorage falls back to the greeter example. Don’t bump it unless the Blockly serialization actually changed.

Replacing the Setup / zip / dmg / AppImage does not wipe bricks.

## Don’t

- Don’t commit `node_modules`, `dist`, or `src-tauri/target`.
- Don’t drop Linden Lab assets or in-world object exports in here.
- Don’t merge `dev` → `main` as a drive-by. That’s a “I reviewed the LSL” step.
