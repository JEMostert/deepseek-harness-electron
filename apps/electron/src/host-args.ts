/**
 * Compose the `dsh web` argv the desktop shell owns. The window is the UI, so
 * the OS browser handoff is always disabled and an unnamed port is OS-assigned
 * to avoid colliding with a separately launched `dsh web`.
 * @module @deepseek-ai/dsh-desktop/host-args
 */

/**
 * Flags after `--` on the Electron command line are forwarded to `dsh web`.
 * @param argv - `process.argv`.
 * @returns tokens after the first `--`, or an empty list.
 */
export function extraHostArgs(argv: readonly string[]): string[] {
  const separator = argv.indexOf('--')
  if (separator === -1) return []
  return argv.slice(separator + 1)
}

/**
 * Build the profile argv for the spawned CLI.
 * @param extra - tokens forwarded from the Electron command line.
 * @returns `web --no-open` plus `--port 0` when extra did not name a port.
 */
export function webHostArgs(extra: readonly string[]): string[] {
  const args = ['web', '--no-open']
  const namesPort = extra.some(token => token === '--port' || token.startsWith('--port='))
  if (!namesPort) args.push('--port', '0')
  for (const token of extra) {
    if (token === '--open') continue
    args.push(token)
  }
  return args
}
