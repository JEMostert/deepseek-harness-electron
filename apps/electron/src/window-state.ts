/**
 * Persist and restore the desktop window's bounds. A corrupt or off-screen
 * record is ignored so a bad file cannot hide the window.
 * @module @deepseek-ai/dsh-desktop/window-state
 */

import { readFileSync, writeFileSync } from 'node:fs'

/** Pixel bounds plus maximized flag as stored on disk. */
export interface WindowState {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}

/** Display work area used to reject off-screen bounds. */
export interface DisplayWorkArea {
  x: number
  y: number
  width: number
  height: number
}

/** First-launch size when no stored state exists. */
export const DEFAULT_WINDOW_SIZE = { width: 1280, height: 800 } as const

const MIN_WIDTH = 800
const MIN_HEIGHT = 600

/**
 * Read stored bounds, returning `undefined` for a missing or invalid file.
 * @param file - JSON path under Electron `userData`.
 * @returns a complete state, or `undefined` to use the default size.
 */
export function readWindowState(file: string): WindowState | undefined {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  return asWindowState(parsed)
}

/**
 * Write bounds. Failure is swallowed: losing the next restore is preferable to
 * crashing on quit.
 * @param file - JSON path under Electron `userData`.
 * @param state - last bounds to persist.
 */
export function writeWindowState(file: string, state: WindowState): void {
  try {
    writeFileSync(file, `${JSON.stringify(state)}\n`, 'utf8')
  } catch {
    // The next launch uses DEFAULT_WINDOW_SIZE.
  }
}

/**
 * Keep stored bounds intersecting the current work area so a disconnected
 * display cannot place the window off-screen.
 * @param state - candidate bounds.
 * @param workArea - the display the window should remain on.
 * @returns clamped bounds, or `undefined` when the record is unusable.
 */
export function clampToDisplay(state: WindowState, workArea: DisplayWorkArea): WindowState | undefined {
  if (workArea.width < MIN_WIDTH || workArea.height < MIN_HEIGHT) return undefined
  const width = Math.min(Math.max(state.width, MIN_WIDTH), workArea.width)
  const height = Math.min(Math.max(state.height, MIN_HEIGHT), workArea.height)
  const maxX = workArea.x + workArea.width - width
  const maxY = workArea.y + workArea.height - height
  if (maxX < workArea.x || maxY < workArea.y) return undefined
  const x = Math.min(Math.max(state.x, workArea.x), maxX)
  const y = Math.min(Math.max(state.y, workArea.y), maxY)
  return { x, y, width, height, isMaximized: state.isMaximized }
}

function asWindowState(value: unknown): WindowState | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (!isFiniteNumber(record.x) || !isFiniteNumber(record.y)) return undefined
  if (!isFiniteNumber(record.width) || !isFiniteNumber(record.height)) return undefined
  if (typeof record.isMaximized !== 'boolean') return undefined
  if (record.width < MIN_WIDTH || record.height < MIN_HEIGHT) return undefined
  return {
    x: record.x,
    y: record.y,
    width: record.width,
    height: record.height,
    isMaximized: record.isMaximized,
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
