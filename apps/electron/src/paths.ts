/**
 * Filesystem anchors for the desktop shell. Source (`src/`) and the bundled
 * entry (`lib/`) both sit one directory under `apps/electron`, so one relative
 * hop reaches the package and three hops reach the repository root.
 * @module @deepseek-ai/dsh-desktop/paths
 */

import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Absolute directory of this package (`apps/electron`).
 * `src/` and the bundled `lib/` entry both sit one directory under the package.
 */
export const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url))

/**
 * Absolute repository root that contains `apps/cli` and `apps/web`.
 * From `src/` or `lib/` that is three hops: file directory, package, `apps/`.
 */
export const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))

/** Built CLI entry the desktop shell prefers. */
export const BUILT_CLI_BIN = join(REPO_ROOT, 'apps/cli/lib/bin.js')

/** TypeScript CLI entry used only when the built bin is absent. */
export const SOURCE_CLI_BIN = join(REPO_ROOT, 'apps/cli/src/bin.ts')

/** Built Web index the host serves; its absence means `pnpm run build` has not run. */
export const WEB_DIST_INDEX = join(REPO_ROOT, 'apps/web/dist/index.html')

/** Dock and window icon; PNG so every Electron platform can decode it. */
export const APP_ICON = join(PACKAGE_ROOT, 'resources/icon.png')

/**
 * Default workspace directory for the spawned `dsh web` process.
 * `INIT_CWD` is the directory the user invoked from when a package script
 * changed `process.cwd()` to this package.
 * @param env - process environment.
 * @param cwd - `process.cwd()` fallback.
 * @returns the directory `dsh web` should treat as the default workspace.
 */
export function resolveLaunchCwd(env: NodeJS.ProcessEnv, cwd: string): string {
  const initCwd = env.INIT_CWD
  if (typeof initCwd === 'string' && initCwd !== '') return initCwd
  return cwd
}
