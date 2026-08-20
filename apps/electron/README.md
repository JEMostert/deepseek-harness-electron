# `@deepseek-ai/dsh-desktop`

English | [中文](README.zh.md)

Native desktop window for DeepSeek Harness. The shell starts the same `web` profile as `dsh web`, passes `--no-open` so the operating-system browser is not launched, and loads the printed loopback URL in an Electron `BrowserWindow`.

The HTTP host, `/api` trust fence, plugin bundles, and frontend dist stay the web stack. This package owns process lifetime, the native window, and navigation away from the host origin.

## Run

From a repository checkout, after `pnpm install` and `pnpm run build`:

```sh
pnpm run desktop
```

The invoking directory is the default workspace, matching `dsh web`. Flags after `--` are forwarded to the web app (`pnpm run desktop -- --port 8080`). `--open` is ignored because the window is the UI. When `--port` is omitted the host binds an OS-assigned free port so a separately running `dsh web` is not displaced.

Quit the app to stop the host. A second launch focuses the existing window.

Product UI behavior is the [Web UI guide](../../docs/user/guide/index.md). The web command itself is documented in the [CLI reference](../cli/reference/README.md#web-alias).

## Known Limitations and Deferred Work

- **Checkout launch** — the shell locates `apps/cli` and `apps/web/dist` next to this package; it is not a standalone bundled `.app` / `.exe`.
- **file:// + IPC carrier** — not shipped. Unary RPC, both event downlinks, and plugin bundles continue to ride the loopback HTTP host.
