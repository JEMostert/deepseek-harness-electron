/**
 * Resolve a real Node.js executable for the spawned `dsh web` process.
 * Electron's `process.execPath` cannot load the harness native addons.
 * @module @deepseek-ai/dsh-desktop/node-executable
 */

import { execFileSync } from 'node:child_process'

/** Path fragment that identifies the Electron binary rather than Node. */
const ELECTRON_MARK = /electron/i

/**
 * Choose the Node binary that will boot `dsh web`.
 * @param env - process environment (`npm_node_execpath` from a package script).
 * @param execPath - `process.execPath` of this process.
 * @param exists - filesystem probe.
 * @param lookupOnPath - `which node` / `where node` result.
 * @returns an absolute Node executable path.
 * @throws when no Node executable is available.
 */
export function resolveNodeExecutable(
  env: NodeJS.ProcessEnv,
  execPath: string,
  exists: (path: string) => boolean,
  lookupOnPath: () => string | undefined,
): string {
  const npmNode = env.npm_node_execpath
  if (typeof npmNode === 'string' && npmNode !== '' && exists(npmNode) && !ELECTRON_MARK.test(npmNode)) {
    return npmNode
  }
  if (!ELECTRON_MARK.test(execPath) && exists(execPath)) return execPath
  const fromPath = lookupOnPath()
  if (fromPath !== undefined && fromPath !== '' && exists(fromPath)) return fromPath
  throw new Error(
    'desktop: cannot find a Node.js executable to boot dsh web; install Node 22+ and keep it on PATH',
  )
}

/**
 * Locate `node` on PATH (`which` on POSIX, `where` on Windows).
 * @returns the first matching absolute path, or `undefined` when none exists.
 */
export function lookupNodeOnPath(): string | undefined {
  const command = process.platform === 'win32' ? 'where' : 'which'
  try {
    const out = execFileSync(command, ['node'], { encoding: 'utf8' }).trim()
    const first = out.split(/\r?\n/)[0]
    return first === undefined || first === '' ? undefined : first
  } catch {
    return undefined
  }
}
