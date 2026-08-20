# `@deepseek-ai/dsh-desktop`

[English](README.md) | 中文

DeepSeek Harness 的原生桌面窗口。该 shell 启动与 `dsh web` 相同的 `web` profile，传入 `--no-open` 以免再打开操作系统浏览器，并把打印出的 loopback URL 加载到 Electron `BrowserWindow` 中。

HTTP 宿主、`/api` 信任围栏、插件 bundle 和前端 dist 仍属于 Web 技术栈。本包负责进程生命周期、原生窗口，以及离开宿主 origin 的导航。

## 运行

在仓库 checkout 中，先执行 `pnpm install` 和 `pnpm run build`，然后：

```sh
pnpm run desktop
```

启动时所在的目录是默认 workspace，与 `dsh web` 相同。写在 `--` 之后的 flag 会转发给 Web 应用（`pnpm run desktop -- --port 8080`）。`--open` 会被忽略，因为窗口本身就是 UI。未指定 `--port` 时，宿主会绑定操作系统分配的空闲端口，以免挤掉另行运行的 `dsh web`。

退出应用即停止宿主。第二次启动会聚焦已有窗口。

产品 UI 行为见 [Web UI 指南](../../docs/user/guide/index.md)。Web 命令本身见 [CLI 参考](../cli/reference/README.md#web-alias)。

## 已知限制与延期工作

- **从 checkout 启动** — 该 shell 会在本包旁边定位 `apps/cli` 与 `apps/web/dist`；它还不是独立打包的 `.app` / `.exe`。
- **file:// + IPC 载体** — 尚未交付。一元 RPC、两条事件下行以及插件 bundle 仍走 loopback HTTP 宿主。
