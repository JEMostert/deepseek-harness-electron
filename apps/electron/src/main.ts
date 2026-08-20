/**
 * Electron main process: boot `dsh web --no-open` and load its loopback URL in
 * a native window. The renderer has no Node integration; privileged RPCs stay
 * on the HTTP loopback trust fence the web host already owns.
 * @module @deepseek-ai/dsh-desktop
 */

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow, Menu, dialog, nativeImage, screen, shell } from 'electron'
import { startWebHost, type WebHost } from './boot.ts'
import { hostProcessArgs, missingWebArtifacts, resolveCliLaunch } from './cli-entry.ts'
import { extraHostArgs } from './host-args.ts'
import { isAppOrigin, shouldOpenExternally } from './navigation.ts'
import { lookupNodeOnPath, resolveNodeExecutable } from './node-executable.ts'
import { APP_ICON, REPO_ROOT, resolveLaunchCwd } from './paths.ts'
import { splashDataUrl } from './splash.ts'
import {
  clampToDisplay,
  DEFAULT_WINDOW_SIZE,
  readWindowState,
  writeWindowState,
  type WindowState,
} from './window-state.ts'

const STATE_FILE_NAME = 'window-state.json'
const PRODUCT_NAME = 'DeepSeek Harness'

app.setName(PRODUCT_NAME)
if (process.platform === 'win32') app.setAppUserModelId('ai.deepseek.dsh-desktop')

let host: WebHost | undefined
let mainWindow: BrowserWindow | undefined
let appUrl: string | undefined

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const existing = mainWindow
    if (existing === undefined) return
    if (existing.isMinimized()) existing.restore()
    existing.focus()
  })
  void app.whenReady().then(() => {
    installMenu()
    return bootApp()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && appUrl !== undefined) {
      openWindow(appUrl)
    }
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('before-quit', () => {
    persistWindowState()
    const running = host
    host = undefined
    if (running !== undefined) void running.stop()
  })
}

/**
 * Start the web host and open the window once it is ready.
 * @returns a promise that settles after the window is scheduled to load.
 */
async function bootApp(): Promise<void> {
  const window = openWindow()
  const missing = missingWebArtifacts(REPO_ROOT, existsSync)
  if (missing.length > 0) {
    const detail = `Missing: ${missing.join(', ')}`
    await dialog.showMessageBox(window, {
      type: 'error',
      title: PRODUCT_NAME,
      message: 'Build artifacts are missing. Run `pnpm run build` from the repository root.',
      detail,
    })
    app.quit()
    return
  }

  try {
    const node = resolveNodeExecutable(process.env, process.execPath, existsSync, lookupNodeOnPath)
    const launch = resolveCliLaunch(REPO_ROOT, existsSync)
    const extra = extraHostArgs(process.argv)
    host = startWebHost(node, hostProcessArgs(launch, extra), {
      cwd: resolveLaunchCwd(process.env, process.cwd()),
      env: process.env,
    })
    const url = await host.readyUrl
    appUrl = url
    attachNavigation(window, url)
    await window.loadURL(url)
    window.show()
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    await dialog.showMessageBox(window, {
      type: 'error',
      title: PRODUCT_NAME,
      message: 'Could not start the DeepSeek Harness host.',
      detail,
    })
    app.quit()
  }
}

/**
 * Create the main window, restoring bounds when they still fit a display.
 * @param url - optional URL to load immediately (macOS dock re-open).
 * @returns the created window.
 */
function openWindow(url?: string): BrowserWindow {
  const statePath = join(app.getPath('userData'), STATE_FILE_NAME)
  const stored = readWindowState(statePath)
  const workArea = screen.getPrimaryDisplay().workArea
  const bounds = stored === undefined ? undefined : clampToDisplay(stored, workArea)
  const icon = nativeImage.createFromPath(APP_ICON)
  const window = new BrowserWindow({
    width: bounds?.width ?? DEFAULT_WINDOW_SIZE.width,
    height: bounds?.height ?? DEFAULT_WINDOW_SIZE.height,
    ...bounds !== undefined ? { x: bounds.x, y: bounds.y } : {},
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: PRODUCT_NAME,
    autoHideMenuBar: true,
    ...icon.isEmpty() ? {} : { icon },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  if (bounds?.isMaximized === true) window.maximize()
  if (process.platform === 'darwin' && !icon.isEmpty()) app.dock?.setIcon(icon)
  window.on('close', () => { persistWindowState() })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
  })
  mainWindow = window
  if (url !== undefined) {
    attachNavigation(window, url)
    void window.loadURL(url).then(() => { window.show() })
  } else {
    void window.loadURL(splashDataUrl('Starting DeepSeek Harness…'))
    window.show()
  }
  return window
}

/**
 * Keep in-app navigations on the host origin; open other web URLs outside.
 * @param window - the product window.
 * @param url - the ready loopback URL.
 */
function attachNavigation(window: BrowserWindow, url: string): void {
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (shouldOpenExternally(url, target)) void shell.openExternal(target)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, target) => {
    if (isAppOrigin(url, target)) return
    event.preventDefault()
    if (shouldOpenExternally(url, target)) void shell.openExternal(target)
  })
}

function persistWindowState(): void {
  const window = mainWindow
  if (window === undefined || window.isDestroyed()) return
  const bounds = window.getBounds()
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized: window.isMaximized(),
  }
  writeWindowState(join(app.getPath('userData'), STATE_FILE_NAME), state)
}

function installMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Open workspace folder',
          click: () => {
            void shell.openPath(resolveLaunchCwd(process.env, homedir()))
          },
        },
      ],
    },
  ]))
}
