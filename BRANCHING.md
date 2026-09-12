# Branching

Private repo, just me.

**dev** is the default branch and the one I actually work on. Editor, LSL catalog, generator, docs, screenshots — all of it.

**main** is a snapshot of “this compiled in a prim and I didn’t hate it.” There is no GitHub Release, no zip, no versioned download. Promoting is a merge:

```
git checkout main
git merge --ff-only dev
git push
git checkout dev
```

If it isn’t fast-forward, main got a direct commit. Don’t do that.

CI (`.github/workflows/test.yml`) runs `npm test` and `npm run typecheck` on both branches. Red CI means don’t merge.

## Why two branches

Same idea as the sorter repo. `dev` can be half-broken bricks and a catalog row I haven’t pasted yet. `main` should be something I could send someone without a disclaimer. Until I promote, a fresh clone of the default branch (`dev`) is the latest.

## Running it

Browser app. No installer.

```
npm install
npm run dev
```

http://127.0.0.1:5173

```
npm test
npm run typecheck
npm run catalog
```

`catalog` regenerates `docs/CATALOG.md` from `functions.ts` / `events.ts`. If those disagree, the TypeScript tables win.

## Persistence

The editor keeps workspace JSON in the browser:

- `primblocks.workspace.v1`
- `primblocks.scriptName.v1`
- `primblocks.notecard.v1`

Bumping the `v1` suffix is a schema break — old localStorage falls back to the greeter example. Don’t bump it unless the Blockly serialization actually changed.

## Don’t

- Don’t commit `node_modules` or `dist`.
- Don’t drop Linden Lab assets or in-world object exports in here.
- Don’t merge `dev` → `main` as a drive-by. That’s a “I reviewed the LSL” step.
