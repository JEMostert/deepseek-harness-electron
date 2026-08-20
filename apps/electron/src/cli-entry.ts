/**
 * Locate the `dsh` CLI entry the desktop shell spawns.
 * @module @deepseek-ai/dsh-desktop/cli-entry
 */

import { join } from 'node:path'
import { webHostArgs } from './host-args.ts'

/** How the CLI will be launched. */
export type CliLaunch =
  | { kind: 'built'; entry: string }
  | { kind: 'source'; entry: string }

/**
 * Prefer the built bin; fall back to the TypeScript entry for source launches.
 * @param repoRoot - repository root.
 * @param exists - filesystem probe.
 * @returns the CLI launch plan.
 * @throws when neither entry exists.
 */
export function resolveCliLaunch(repoRoot: string, exists: (path: string) => boolean): CliLaunch {
  const built = join(repoRoot, 'apps/cli/lib/bin.js')
  if (exists(built)) return { kind: 'built', entry: built }
  const source = join(repoRoot, 'apps/cli/src/bin.ts')
  if (exists(source)) return { kind: 'source', entry: source }
  throw new Error('desktop: dsh CLI is missing; run pnpm run build from the repository root')
}

/**
 * Missing production artifacts that would boot an incomplete GUI.
 * @param repoRoot - repository root.
 * @param exists - filesystem probe.
 * @returns human-readable missing-path descriptions.
 */
export function missingWebArtifacts(repoRoot: string, exists: (path: string) => boolean): string[] {
  const missing: string[] = []
  if (!exists(join(repoRoot, 'apps/web/dist/index.html'))) {
    missing.push('apps/web/dist (run pnpm run build)')
  }
  return missing
}

/**
 * Node argv that executes the CLI with the desktop-owned web flags.
 * @param launch - built or source CLI entry.
 * @param extra - tokens forwarded from the Electron command line.
 * @returns argv after the Node executable.
 */
export function hostProcessArgs(launch: CliLaunch, extra: readonly string[]): string[] {
  const web = webHostArgs(extra)
  if (launch.kind === 'built') return [launch.entry, ...web]
  return ['--import', 'tsx/esm', launch.entry, ...web]
}
