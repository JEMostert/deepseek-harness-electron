import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { startWebHost, waitForReadyUrl, type HostChild } from '../src/boot.ts'

class FakeChild extends EventEmitter implements HostChild {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  killed: NodeJS.Signals | undefined

  kill(signal?: NodeJS.Signals): boolean {
    this.killed = signal ?? 'SIGTERM'
    queueMicrotask(() => { this.emit('exit', 0, null) })
    return true
  }
}

describe('waitForReadyUrl', () => {
  it('resolves the loopback URL and ignores a later exit', async () => {
    const child = new FakeChild()
    const ready = waitForReadyUrl(child, 1_000)
    child.stdout.emit('data', Buffer.from('dsh web: http://127.0.0.1:3080\n'))
    await expect(ready).resolves.toBe('http://127.0.0.1:3080')
    child.emit('exit', 0, null)
    await expect(ready).resolves.toBe('http://127.0.0.1:3080')
  })

  it('fails when the process exits first, times out, or prints a non-loopback URL', async () => {
    const exited = new FakeChild()
    const exitReady = waitForReadyUrl(exited, 1_000)
    exited.stderr.emit('data', 'boom')
    exited.emit('exit', 1, null)
    await expect(exitReady).rejects.toThrow(/exited \(code 1\)[\s\S]*boom/u)

    const signaled = new FakeChild()
    const signalReady = waitForReadyUrl(signaled, 1_000)
    signaled.emit('exit', null, 'SIGTERM')
    await expect(signalReady).rejects.toThrow(/signal SIGTERM/u)

    vi.useFakeTimers()
    const hanging = new FakeChild()
    const timeoutReady = waitForReadyUrl(hanging, 50)
    const expectation = expect(timeoutReady).rejects.toThrow(/did not become ready within 50ms/u)
    await vi.advanceTimersByTimeAsync(50)
    await expectation
    vi.useRealTimers()

    const bad = new FakeChild()
    const badReady = waitForReadyUrl(bad, 1_000)
    bad.stdout.emit('data', 'dsh web: http://8.8.8.8:80\n')
    await expect(badReady).rejects.toThrow(/must be loopback/u)

    const spawnErr = new FakeChild()
    const spawnReady = waitForReadyUrl(spawnErr, 1_000)
    spawnErr.emit('error', new Error('ENOENT'))
    await expect(spawnReady).rejects.toThrow('ENOENT')
  })
})

describe('startWebHost', () => {
  it('spawns with piped stdio and stops the child', async () => {
    const child = new FakeChild()
    const spawned: unknown[] = []
    const host = startWebHost('/usr/bin/node', ['web', '--no-open'], {
      cwd: '/repo',
      env: { A: '1' },
      spawnImpl: (command, args, options) => {
        spawned.push({ command, args: [...args], options })
        return child
      },
    })
    child.stdout.emit('data', 'dsh web: http://127.0.0.1:9\n')
    await expect(host.readyUrl).resolves.toBe('http://127.0.0.1:9')
    expect(spawned).toEqual([{
      command: '/usr/bin/node',
      args: ['web', '--no-open'],
      options: { cwd: '/repo', env: { A: '1' }, stdio: ['ignore', 'pipe', 'pipe'] },
    }])
    await host.stop()
    expect(child.killed).toBe('SIGTERM')
  })

  it('escalates to SIGKILL when SIGTERM does not end the child', async () => {
    class StubbornChild extends EventEmitter implements HostChild {
      stdout = new EventEmitter()
      stderr = new EventEmitter()
      signals: NodeJS.Signals[] = []
      kill(signal?: NodeJS.Signals): boolean {
        this.signals.push(signal ?? 'SIGTERM')
        return true
      }
    }
    const child = new StubbornChild()
    const host = startWebHost('/usr/bin/node', ['web'], {
      cwd: '/repo',
      env: {},
      spawnImpl: () => child,
    })
    child.stdout.emit('data', 'dsh web: http://127.0.0.1:1\n')
    await host.readyUrl
    vi.useFakeTimers()
    const stopped = host.stop()
    await vi.advanceTimersByTimeAsync(5_000)
    await stopped
    vi.useRealTimers()
    expect(child.signals).toEqual(['SIGTERM', 'SIGKILL'])
  })

  it('resolves stop immediately when kill cannot signal the child', async () => {
    class DeadChild extends EventEmitter implements HostChild {
      stdout = new EventEmitter()
      stderr = new EventEmitter()
      kill(): boolean { return false }
    }
    const child = new DeadChild()
    const host = startWebHost('/usr/bin/node', ['web'], {
      cwd: '/repo',
      env: {},
      spawnImpl: () => child,
    })
    child.stdout.emit('data', 'dsh web: http://127.0.0.1:1\n')
    await host.readyUrl
    await host.stop()
  })
})
