/**
 * Parse the `dsh web` readiness line. The desktop shell must not load a window
 * until that line appears: the HTTP server can bind before `/api` and the
 * static fallback finish mounting.
 * @module @deepseek-ai/dsh-desktop/ready-url
 */

/** Captures a complete `http://host:port` from the web-app readiness line. */
export const READY_URL_PATTERN = /dsh web: (http:\/\/[^\s:]+:\d+)/u

/**
 * Return the canonical local URL printed by a ready `dsh web` process.
 * @param text - accumulated stdout.
 * @returns the captured URL, or `undefined` when the line has not appeared.
 */
export function parseReadyUrl(text: string): string | undefined {
  return READY_URL_PATTERN.exec(text)?.[1]
}

/**
 * Incremental scanner so a readiness line split across stdout chunks is still
 * recognized.
 * @returns a pusher that returns the URL once the line is complete.
 */
export function createReadyUrlScanner(): { push(chunk: string): string | undefined } {
  let buffer = ''
  return {
    push(chunk: string): string | undefined {
      buffer += chunk
      return parseReadyUrl(buffer)
    },
  }
}

/**
 * Confirm a readiness URL is loopback HTTP so the window cannot be pointed at
 * an arbitrary origin a compromised or miscomposed host printed.
 * @param url - candidate from stdout.
 * @returns the parsed URL.
 * @throws when the value is not `http://127.0.0.1` or `http://localhost`.
 */
export function assertLoopbackHttpUrl(url: string): URL {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`desktop: ready URL is not a valid URL: ${url}`)
  }
  if (parsed.protocol !== 'http:') {
    throw new Error(`desktop: ready URL must use http: (${url})`)
  }
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    throw new Error(`desktop: ready URL must be loopback (${url})`)
  }
  return parsed
}
