/**
 * Window navigation policy: the desktop shell stays on the host origin and
 * hands every other http(s)/mailto URL to the operating-system browser.
 * @module @deepseek-ai/dsh-desktop/navigation
 */

/**
 * Whether `candidate` shares the loaded app origin.
 * @param appUrl - the ready loopback URL the window loaded.
 * @param candidate - navigation or window-open target.
 * @returns `true` when both parse and their origins match.
 */
export function isAppOrigin(appUrl: string, candidate: string): boolean {
  try {
    return new URL(appUrl).origin === new URL(candidate).origin
  } catch {
    return false
  }
}

/**
 * Whether a URL the page asked to open should leave the app.
 * @param appUrl - the ready loopback URL the window loaded.
 * @param candidate - navigation or window-open target.
 * @returns `true` for off-origin `http:`, `https:`, or `mailto:`.
 */
export function shouldOpenExternally(appUrl: string, candidate: string): boolean {
  if (isAppOrigin(appUrl, candidate)) return false
  try {
    const protocol = new URL(candidate).protocol
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:'
  } catch {
    return false
  }
}
