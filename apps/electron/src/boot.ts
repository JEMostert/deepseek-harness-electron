/**
 * Spawn `dsh web --no-open` and wait for its readiness URL.
 * @module @deepseek-ai/dsh-desktop/boot
 */

import { spawn, type SpawnOptions } from 'node:child_process'
import { assertLoopbackHttpUrl, createReadyUrlScanner } from './ready-url.ts'

/** Default wait for Loader settlement on a cold tree. */
export const DEFAULT_READY_TIMEOUT_MS = 120_000

/** SIGKILL escalation after SIGTERM, matching the CLI's bounded shutdown. */
const STOP_GRACE_MS = 5_000

/** Minimal child-process face the waiter needs; tests inject a fake. */
export interface HostChild {
  stdout: { on(event: 'data', listener: (chunk: Buffer | string) => void): void } | null
  stderr: { on(event: 'data', listener: (chunk: Buffer | string) => void): void } | null
  on(event: 'error', listener: (error: Error) => void): void
  on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): void
  kill(signal?: NodeJS.Signals): boolean
}

/** Spawn function used by {@link startWebHost}. */
export type SpawnHost = (command: string, args: readonly string[], options: SpawnOptions) => HostChild

/** A live `dsh web` child plus the URL it printed. */
export interface WebHost {
  /** Canonical loopback URL, resolved after Loader settlement. */
  readyUrl: Promise<string>
  /** SIGTERM the child, then SIGKILL after {@link STOP_GRACE_MS}. */
  stop(): Promise<void>
}

/**
 * Spawn the CLI and resolve once stdout contains a loopback readiness URL.
 * @param command - Node executable.
 * @param args - CLI argv including `web --no-open`.
 * @param options - cwd, env, timeout, and spawn implementation.
 * @returns the child handle and readiness promise.
 */
export function startWebHost(
  command: string,
  args: readonly string[],
  options: {
    cwd: string
    env: NodeJS.ProcessEnv
    timeoutMs?: number
    spawnImpl?: SpawnHost
  },
): WebHost {
  const timeoutMs = options.timeoutMs ?? DEFAULT_READY_TIMEOUT_MS
  const spawnImpl: SpawnHost = options.spawnImpl ?? spawn
  const child = spawnImpl(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return {
    readyUrl: waitForReadyUrl(child, timeoutMs),
    stop: () => stopChild(child),
  }
}

/**
 * Wait until the child prints a loopback readiness URL, or fail on exit/timeout.
 * @param child - spawned `dsh web`.
 * @param timeoutMs - fail if the URL has not arrived.
 * @returns the canonical loopback URL.
 */
export function waitForReadyUrl(child: HostChild, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const scanner = createReadyUrlScanner()
    let stderr = ''
    let settled = false

    const finish = (error: Error | undefined, url: string | undefined): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (error !== undefined) reject(error)
      else resolve(url as string)
    }

    const timeout = setTimeout(() => {
      finish(new Error(`desktop: dsh web did not become ready within ${String(timeoutMs)}ms\n${stderr}`), undefined)
    }, timeoutMs)

    child.stdout?.on('data', (chunk) => {
      process.stdout.write(chunk)
      const text = chunk.toString()
      const url = scanner.push(text)
      if (url === undefined) return
      try {
        assertLoopbackHttpUrl(url)
        finish(undefined, url)
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)), undefined)
      }
    })
    child.stderr?.on('data', (chunk) => {
      process.stderr.write(chunk)
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      finish(error, undefined)
    })
    child.on('exit', (code, signal) => {
      const reason = signal !== null
        ? `signal ${signal}`
        : `code ${String(code ?? 'null')}`
      finish(new Error(`desktop: dsh web exited (${reason}) before becoming ready\n${stderr}`), undefined)
    })
  })
}

function stopChild(child: HostChild): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = (): void => {
      if (done) return
      done = true
      resolve()
    }
    child.on('exit', () => { finish() })
    const killed = child.kill('SIGTERM')
    if (!killed) {
      finish()
      return
    }
    setTimeout(() => {
      child.kill('SIGKILL')
      finish()
    }, STOP_GRACE_MS)
  })
}
