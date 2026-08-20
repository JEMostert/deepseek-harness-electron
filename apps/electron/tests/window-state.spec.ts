import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { clampToDisplay, readWindowState, writeWindowState } from '../src/window-state.ts'

const tempRoots: string[] = []

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function tempFile(name: string): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-desktop-window-'))
  tempRoots.push(root)
  return join(root, name)
}

const workArea = { x: 0, y: 0, width: 1440, height: 900 }

describe('readWindowState / writeWindowState', () => {
  it('round-trips a valid record and ignores missing or corrupt files', () => {
    const file = tempFile('state.json')
    const root = dirname(file)
    expect(readWindowState(file)).toBeUndefined()
    const state = { x: 10, y: 20, width: 1000, height: 700, isMaximized: false }
    writeWindowState(file, state)
    expect(readWindowState(file)).toEqual(state)
    expect(readFileSync(file, 'utf8').endsWith('\n')).toBe(true)
    writeFileSync(file, '{', 'utf8')
    expect(readWindowState(file)).toBeUndefined()
    writeFileSync(file, '{"width":1000}', 'utf8')
    expect(readWindowState(file)).toBeUndefined()
    writeFileSync(file, JSON.stringify({ x: 0, y: 0, width: 100, height: 100, isMaximized: false }), 'utf8')
    expect(readWindowState(file)).toBeUndefined()
    expect(() => { writeWindowState(root, state) }).not.toThrow()
  })
})

describe('clampToDisplay', () => {
  it('keeps intersecting bounds and rejects a display too small to host the window', () => {
    const stored = { x: -40, y: 20, width: 1000, height: 700, isMaximized: true }
    expect(clampToDisplay(stored, workArea)).toEqual({
      x: 0,
      y: 20,
      width: 1000,
      height: 700,
      isMaximized: true,
    })
    expect(clampToDisplay(stored, { x: 0, y: 0, width: 100, height: 100 })).toBeUndefined()
    expect(clampToDisplay(
      { x: 0, y: 0, width: 2000, height: 2000, isMaximized: false },
      workArea,
    )).toEqual({ x: 0, y: 0, width: 1440, height: 900, isMaximized: false })
  })
})
