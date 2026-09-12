# Shipping PrimBlocks

The thing a non-programmer downloads is a GitHub Release off `main`.
`dev` still builds the same files so I can click through them; it does
not publish.

## What ends up on the Release

| File | Who it's for |
| --- | --- |
| `PrimBlocks-Setup.exe` | Windows, next-next-finish, desktop icon |
| `PrimBlocks-windows.zip` | Windows, unzip and double-click the exe |
| `PrimBlocks-mac.dmg` | Mac (Intel + Apple Silicon, unsigned) |
| `PrimBlocks-linux.AppImage` | Linux, chmod +x and run |
| Source code (zip / tar.gz) | GitHub sticks these on every tag. Programmers. |

Names stay unversioned on purpose so GETTING_STARTED can say the same
filename next month.

## How it builds

`.github/workflows/desktop.yml` — Tauri 2 wrapping the Vite app.

- Windows: NSIS current-user installer + a zip of the raw exe
- Mac: universal dmg
- Linux: AppImage (no root)

Bump `version` in `package.json`, `src-tauri/tauri.conf.json`, and
`src-tauri/Cargo.toml` together before promoting.

## Icons

`packaging/app-icon.png` is the 1024² master. `npx tauri icon packaging/app-icon.png --output src-tauri/icons` rebuilds the ico/icns/png set.

## Local desktop window

```
npm install
npm run desktop
```

Needs the Rust toolchain (`rustup`) on that machine. CI is what actually
produces the files people download.
