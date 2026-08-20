import { describe, expect, it } from 'vitest'
import { isAppOrigin, shouldOpenExternally } from '../src/navigation.ts'

const APP = 'http://127.0.0.1:3080/'

describe('isAppOrigin', () => {
  it('matches the loaded origin and rejects malformed or foreign URLs', () => {
    expect(isAppOrigin(APP, 'http://127.0.0.1:3080/session/1')).toBe(true)
    expect(isAppOrigin(APP, 'http://127.0.0.1:3081/')).toBe(false)
    expect(isAppOrigin(APP, 'not a url')).toBe(false)
    expect(isAppOrigin('also bad', APP)).toBe(false)
  })
})

describe('shouldOpenExternally', () => {
  it('opens off-origin web and mailto URLs in the OS browser', () => {
    expect(shouldOpenExternally(APP, 'https://platform.deepseek.com/')).toBe(true)
    expect(shouldOpenExternally(APP, 'http://example.com/')).toBe(true)
    expect(shouldOpenExternally(APP, 'mailto:a@b.c')).toBe(true)
    expect(shouldOpenExternally(APP, 'http://127.0.0.1:3080/x')).toBe(false)
    expect(shouldOpenExternally(APP, 'file:///etc/passwd')).toBe(false)
    expect(shouldOpenExternally(APP, 'not a url')).toBe(false)
  })
})
