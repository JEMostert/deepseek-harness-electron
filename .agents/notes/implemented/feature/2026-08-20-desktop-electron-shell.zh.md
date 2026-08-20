# Agent Note: 桌面应用在 Electron 窗口中加载 Web UI

Status: implemented

[English](2026-08-20-desktop-electron-shell.md) | 中文

## Problem

`dsh web` 把 GUI 作为本地网站交付：它打印 loopback URL，并在本机启动时打开操作系统浏览器。想要桌面窗口的用户会得到浏览器装饰、URL 栏，以及一个他们并不想管理的标签页。`dsh-host-webserver` 上的注释描述了一个并不存在的 `file://` 加 IPC 的 Electron 载体，因此当时没有不经过浏览器就能使用 GUI 的已交付途径。

## Decision

[`apps/electron`](../../../../apps/electron/README.md)（`@deepseek-ai/dsh-desktop`）是覆盖在现有 web profile 之上的原生窗口。主进程会找到真正的 Node.js 可执行文件（绝不用 Electron 的 `process.execPath`，因为它无法加载 harness 原生 addon），spawn `dsh web --no-open`，除非命令行已经指定端口，否则使用操作系统分配的端口，等待 `dsh web: http://127.0.0.1:…` 就绪行，并把该 loopback URL 加载到 `BrowserWindow` 中。写在 `--` 之后被转发的 `--open` 会被丢弃，以免操作系统浏览器一并启动。

渲染进程启用 `contextIsolation`、关闭 `nodeIntegration`，并使用 `sandbox`。特权 RPC（`host.pickDirectory`、settings、credentials、agent-preset 编写）仍走 HTTP loopback 信任围栏。离开 origin 的 `http:`／`https:`／`mailto:` 目标在操作系统浏览器中打开；`file:` 与其他 scheme 会被拒绝。

启动命令是 `pnpm run desktop`。启动时所在的目录（当 package script 改变了 cwd 时为 `INIT_CWD`）是默认 workspace，与 `dsh web` 相同。第二次启动会聚焦已有窗口。退出应用即停止宿主（先 SIGTERM，五秒后 SIGKILL）。窗口尺寸位置持久化在 Electron `userData` 下。

单元测试钉住跨 chunk 的 URL 解析、非 loopback URL 拒绝、argv 组合、Node 可执行文件选择、产物解析、导航策略、splash 转义、窗口状态夹取／恢复，以及宿主就绪／停止／超时／失败。Electron GUI 本身不在覆盖率门禁内。

## Alternatives considered

**用 `file://` 加 IPC 的 fetch／WebSocket 桥接替换 HTTP 宿主** — 不作为本次变更，因为一元 RPC、两条事件下行、插件 bundle、HMR 和静态回退各自都需要新载体，而 loopback 宿主已经拥有信任围栏和原生目录选择器。把该载体写成当前事实的注释是错误的，现已改为与已交付行为一致。

**使用 `ELECTRON_RUN_AS_NODE` 让宿主跑在 Electron 二进制内** — 否决，因为原生 addon（`node-pty`、`koffi`、Landlock）是针对 Node 而不是 Electron ABI 编译的。

**让桌面应用同时打开操作系统浏览器** — 否决；那正是本 shell 要避免的 `dsh web` 行为。

**用 electron-builder 打包 `.app`／`.exe`** — 延期。从 checkout 启动（`pnpm run build` 然后 `pnpm run desktop`）就是完整的第一版产品。

## Consequences

GUI 可以作为桌面窗口使用，而不必改动 web 宿主、客户端 connection 或 `/api` 信任围栏。仍想用浏览器的用户可以继续运行 `dsh web`。桌面包是依赖 Electron 的 dsh 系列 release member；CLI 包不依赖它。以后仍可以做 `file://` 加 IPC 的 shell，那会替换本包装器，而不是作为第二种传输并存。
