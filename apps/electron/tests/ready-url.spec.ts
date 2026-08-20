import { describe, expect, it } from 'vitest'
import { assertLoopbackHttpUrl, createReadyUrlScanner, parseReadyUrl } from '../src/ready-url.ts'

describe('parseReadyUrl', () => {
  it('captures the canonical URL and ignores a LAN suffix', () => {
    expect(parseReadyUrl('dsh web: http://127.0.0.1:3080\n')).toBe('http://127.0.0.1:3080')
    expect(parseReadyUrl('dsh web: http://127.0.0.1:4567 (LAN: http://192.168.1.5:4567)\n'))
      .toBe('http://127.0.0.1:4567')
    expect(parseReadyUrl('still booting\n')).toBeUndefined()
    expect(parseReadyUrl('dsh web: http://127.0.0.1:\n')).toBeUndefined()
  })
})

describe('createReadyUrlScanner', () => {
  it('joins chunks that split the readiness line', () => {
    const scanner = createReadyUrlScanner()
    expect(scanner.push('dsh web: http://127.0.0.1:')).toBeUndefined()
    expect(scanner.push('3080\n')).toBe('http://127.0.0.1:3080')
  })
})

describe('assertLoopbackHttpUrl', () => {
  it('accepts loopback HTTP and rejects everything else', () => {
    expect(assertLoopbackHttpUrl('http://127.0.0.1:3080').origin).toBe('http://127.0.0.1:3080')
    expect(assertLoopbackHttpUrl('http://localhost:9').hostname).toBe('localhost')
    expect(() => assertLoopbackHttpUrl('not a url')).toThrow(/not a valid URL/u)
    expect(() => assertLoopbackHttpUrl('https://127.0.0.1:3080')).toThrow(/must use http:/u)
    expect(() => assertLoopbackHttpUrl('http://example.com:3080')).toThrow(/must be loopback/u)
  })
})
