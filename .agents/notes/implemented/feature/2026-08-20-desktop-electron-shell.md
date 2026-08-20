# Agent Note: Desktop app loads the Web UI in an Electron window

Status: implemented

English | [中文](2026-08-20-desktop-electron-shell.zh.md)

## Problem

`dsh web` delivers the GUI as a local website: it prints a loopback URL and, on a local launch, opens the operating-system browser. Users who want a desktop window get browser chrome, a URL bar, and a tab they did not ask to manage. Comments on `dsh-host-webserver` described a `file://` plus IPC Electron carrier that does not exist, so there was no shipped way to use the GUI without a browser.

## Decision

[`apps/electron`](../../../../apps/electron/README.md) (`@deepseek-ai/dsh-desktop`) is a native window over the existing web profile. The main process finds a real Node.js executable (never Electron's `process.execPath`, which cannot load harness native addons), spawns `dsh web --no-open` with an OS-assigned port unless the command line named one, waits for the `dsh web: http://127.0.0.1:…` readiness line, and loads that loopback URL in a `BrowserWindow`. `--open` forwarded after `--` is dropped so the OS browser cannot also launch.

The renderer has `contextIsolation`, no `nodeIntegration`, and `sandbox`. Privileged RPCs (`host.pickDirectory`, settings, credentials, agent-preset authoring) stay on the HTTP loopback trust fence. Off-origin `http:`/`https:`/`mailto:` targets open in the OS browser; `file:` and other schemes are refused.

`pnpm run desktop` is the launch command. The invoking directory (`INIT_CWD` when a package script changed cwd) is the default workspace, matching `dsh web`. A second instance focuses the existing window. Quit stops the host (SIGTERM, then SIGKILL after five seconds). Window bounds persist under Electron `userData`.

Unit tests pin URL parsing across chunks, loopback URL rejection, argv composition, Node executable selection, artifact resolution, navigation policy, splash escaping, window-state clamp/restore, and host ready/stop/timeout/failure. The Electron GUI itself is not in the coverage gate.

## Alternatives considered

**Replace the HTTP host with `file://` plus an IPC fetch/WebSocket bridge** — rejected for this change because unary RPC, both event downlinks, plugin bundles, HMR, and the static fallback would each need a new carrier, while the loopback host already has the trust fence and native directory picker. The comments that described that carrier as current were wrong and are updated to match what ships.

**`ELECTRON_RUN_AS_NODE` so the host runs inside the Electron binary** — rejected because native addons (`node-pty`, `koffi`, Landlock) are compiled for Node, not Electron's ABI.

**Open the OS browser from the desktop app as well** — rejected; that is the `dsh web` behavior this shell exists to avoid.

**A packaged `.app` / `.exe` with electron-builder** — deferred. The checkout launch (`pnpm run build` then `pnpm run desktop`) is the complete first product.

## Consequences

The GUI can be used as a desktop window without changing the web host, client connection, or `/api` trust fence. `dsh web` still opens a browser for users who want that. The desktop package is a dsh-family release member that depends on Electron; the CLI package does not. A `file://` plus IPC shell remains possible later and would replace this wrapper rather than sit beside it as a second transport.
