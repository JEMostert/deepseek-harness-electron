import { describe, expect, it } from 'vitest'
import { extraHostArgs, webHostArgs } from '../src/host-args.ts'

describe('extraHostArgs', () => {
  it('forwards only tokens after --', () => {
    expect(extraHostArgs(['electron', '.', '--port', '8'])).toEqual([])
    expect(extraHostArgs(['electron', '.', '--', '--port', '8'])).toEqual(['--port', '8'])
  })
})

describe('webHostArgs', () => {
  it('disables the browser handoff and assigns a free port by default', () => {
    expect(webHostArgs([])).toEqual(['web', '--no-open', '--port', '0'])
  })

  it('keeps an explicit port and drops --open so the window stays the UI', () => {
    expect(webHostArgs(['--port', '8080', '--open', '--trusted-host', 'app.local']))
      .toEqual(['web', '--no-open', '--port', '8080', '--trusted-host', 'app.local'])
    expect(webHostArgs(['--port=9'])).toEqual(['web', '--no-open', '--port=9'])
  })
})
