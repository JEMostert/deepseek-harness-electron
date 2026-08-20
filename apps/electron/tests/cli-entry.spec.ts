import { describe, expect, it } from 'vitest'
import { hostProcessArgs, missingWebArtifacts, resolveCliLaunch } from '../src/cli-entry.ts'

describe('resolveCliLaunch', () => {
  it('prefers the built bin, then source, and fails when both are absent', () => {
    const present = new Set(['/repo/apps/cli/lib/bin.js'])
    expect(resolveCliLaunch('/repo', path => present.has(path))).toEqual({
      kind: 'built',
      entry: '/repo/apps/cli/lib/bin.js',
    })
    expect(resolveCliLaunch('/repo', path => path.endsWith('src/bin.ts'))).toEqual({
      kind: 'source',
      entry: '/repo/apps/cli/src/bin.ts',
    })
    expect(() => resolveCliLaunch('/repo', () => false)).toThrow(/dsh CLI is missing/u)
  })
})

describe('missingWebArtifacts', () => {
  it('names the frontend dist when the index is absent', () => {
    expect(missingWebArtifacts('/repo', () => true)).toEqual([])
    expect(missingWebArtifacts('/repo', () => false)).toEqual(['apps/web/dist (run pnpm run build)'])
  })
})

describe('hostProcessArgs', () => {
  it('places tsx only on the source launch path', () => {
    expect(hostProcessArgs({ kind: 'built', entry: '/bin.js' }, [])).toEqual([
      '/bin.js', 'web', '--no-open', '--port', '0',
    ])
    expect(hostProcessArgs({ kind: 'source', entry: '/bin.ts' }, ['--port', '9'])).toEqual([
      '--import', 'tsx/esm', '/bin.ts', 'web', '--no-open', '--port', '9',
    ])
  })
})
