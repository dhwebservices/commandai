# Building the CommandAI desktop app

Tauri wraps the web-console UI in a native window — no browser, no dev
server needed once built. This needs to run on your Mac (or wherever you
have network + a Rust toolchain), not in Claude's sandbox — that sandbox
can't install packages or compile binaries.

## One-time setup

1. Install Rust (skip if already installed — check with `rustc --version`):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
2. Install Xcode Command Line Tools (skip if already installed):
   ```bash
   xcode-select --install
   ```
3. From the repo root:
   ```bash
   pnpm install
   ```
4. Generate real app icons from the placeholder (Claude generated a
   simple placeholder PNG since it can't produce a macOS .icns file
   directly — this command builds the full icon set, including .icns,
   from it):
   ```bash
   cd apps/web-console
   pnpm desktop:icon
   ```
   Swap `src-tauri/icons/icon-512.png` for your real logo first if you
   have one, then re-run this command.

## Build the real, downloadable app

```bash
cd apps/web-console
pnpm desktop:build
```

This produces a real `.app` and `.dmg` under
`apps/web-console/src-tauri/target/release/bundle/macos/` — double-click
either to run it like any other Mac app. First build compiles Rust +
Tauri from scratch, so it'll take a few minutes; subsequent builds are fast.

## Or just preview it without building an installer

```bash
cd apps/web-console
pnpm desktop:dev
```

Opens a native window pointed at the live dev server — good for quickly
checking UI changes without a full build each time. Needs `pnpm dev`
running in another terminal first (see apps/web-console/README.md), same
as the browser-based preview.

## Note on the backend

The desktop app is still just a window around the same UI — it talks to
api-gateway over HTTP exactly like the browser version does. `api-gateway`
needs to be running (locally, or deployed) for login/signup to actually
work; the desktop shell doesn't bundle the backend.
