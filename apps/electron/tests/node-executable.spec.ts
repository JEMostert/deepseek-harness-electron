import { describe, expect, it } from 'vitest'
import { resolveNodeExecutable } from '../src/node-executable.ts'

const exists = (allowed: readonly string[]) => (path: string) => allowed.includes(path)

describe('resolveNodeExecutable', () => {
  it('uses npm_node_execpath when it is a real Node binary', () => {
    expect(resolveNodeExecutable(
      { npm_node_execpath: '/usr/local/bin/node' },
      '/Electron',
      exists(['/usr/local/bin/node']),
      () => undefined,
    )).toBe('/usr/local/bin/node')
  })

  it('ignores an Electron-named npm_node_execpath', () => {
    expect(resolveNodeExecutable(
      { npm_node_execpath: '/opt/Electron' },
      '/Electron',
      exists(['/opt/Electron', '/usr/bin/node']),
      () => '/usr/bin/node',
    )).toBe('/usr/bin/node')
  })

  it('skips Electron execPath and falls through to PATH', () => {
    expect(resolveNodeExecutable(
      {},
      '/Applications/Electron.app/Contents/MacOS/Electron',
      exists(['/opt/homebrew/bin/node']),
      () => '/opt/homebrew/bin/node',
    )).toBe('/opt/homebrew/bin/node')
  })

  it('accepts a non-Electron process.execPath', () => {
    expect(resolveNodeExecutable(
      {},
      '/usr/bin/node',
      exists(['/usr/bin/node']),
      () => undefined,
    )).toBe('/usr/bin/node')
  })

  it('fails loud when nothing usable remains', () => {
    expect(() => resolveNodeExecutable({}, '/Electron', () => false, () => undefined))
      .toThrow(/cannot find a Node.js executable/u)
  })
})
