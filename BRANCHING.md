# Branch + release rule

- **dev** — every working revision. Editor, catalog, generator, docs.
- **main** — only when you say “promote this.”

I do not merge `dev` → `main` unless you ask.

No Windows zip for this one yet. It is a browser app:

```bat
npm install
npm run dev
```

Tests:

```bat
npm test
npm run typecheck
```
