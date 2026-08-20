import { describe, expect, it } from 'vitest'
import { splashDataUrl, splashHtml } from '../src/splash.ts'

describe('splashHtml', () => {
  it('escapes status text and encodes a data URL', () => {
    const html = splashHtml('wait <b>now</b> & go')
    expect(html).toContain('wait &lt;b&gt;now&lt;/b&gt; &amp; go')
    expect(html).not.toContain('<b>now</b>')
    const url = splashDataUrl('Starting DeepSeek Harness…')
    expect(url.startsWith('data:text/html;charset=utf-8,')).toBe(true)
    expect(decodeURIComponent(url.slice('data:text/html;charset=utf-8,'.length))).toContain('Starting DeepSeek Harness…')
  })
})
