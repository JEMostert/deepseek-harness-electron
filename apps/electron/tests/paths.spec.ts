import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PACKAGE_ROOT, REPO_ROOT, resolveLaunchCwd } from '../src/paths.ts'

describe('resolveLaunchCwd', () => {
  it('prefers INIT_CWD from a package script and falls back to cwd', () => {
    expect(resolveLaunchCwd({ INIT_CWD: '/Users/me/project' }, '/tmp')).toBe('/Users/me/project')
    expect(resolveLaunchCwd({ INIT_CWD: '' }, '/tmp')).toBe('/tmp')
    expect(resolveLaunchCwd({}, '/tmp')).toBe('/tmp')
  })
})

describe('PACKAGE_ROOT / REPO_ROOT', () => {
  it('anchors the package and repository from src or lib at the same depth', () => {
    expect(basename(PACKAGE_ROOT)).toBe('electron')
    expect(existsSync(join(PACKAGE_ROOT, 'package.json'))).toBe(true)
    expect(existsSync(join(REPO_ROOT, 'pnpm-workspace.yaml'))).toBe(true)
    expect(existsSync(join(REPO_ROOT, 'apps/cli/package.json'))).toBe(true)
  })
})
