import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import type { WorkoutLog } from '../domain/types'
import {
  KEYS,
  addLog,
  getLogs,
  getSettings,
  setBackend,
  updateSettings,
  type Backend,
} from './storage'

function memBackend(
  initial: Record<string, string> = {},
): Backend & { data: Record<string, string> } {
  const data = { ...initial }
  return { data, get: (k) => data[k] ?? null, set: (k, v) => void (data[k] = v) }
}

const log: WorkoutLog = {
  id: 'a',
  date: '2026-10-27',
  startedAt: '2026-10-27T12:00:00.000Z',
  durationSec: 333,
  sets: 3,
  reps: 10,
  inhale: 2.5,
  holdTop: 1,
  exhale: 2.5,
  holdBottom: 1,
  restSeconds: 60,
  dialInStart: 4,
  dialOutStart: 3,
  dialInEnd: 4,
  dialOutEnd: 3,
  effort: 7,
}

describe('storage', () => {
  beforeEach(() => setBackend(memBackend()))

  it('returns defaults when empty', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(getLogs()).toEqual([])
  })

  it('round-trips settings and logs', () => {
    updateSettings({ sets: 5, colorMode: 'dark', cuesMuted: true })
    addLog(log)
    expect(getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      sets: 5,
      colorMode: 'dark',
      cuesMuted: true,
    })
    expect(getLogs()).toEqual([log])
  })

  it('writes versioned keys', () => {
    const b = memBackend()
    setBackend(b)
    updateSettings({ reps: 12 })
    addLog(log)
    expect(Object.keys(b.data).sort()).toEqual([KEYS.logs, KEYS.settings].sort())
    expect(KEYS.settings).toContain(':v1:')
  })

  it('falls back to defaults on corrupt JSON', () => {
    setBackend(memBackend({ [KEYS.settings]: '{nope', [KEYS.logs]: '[[[' }))
    expect(getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(getLogs()).toEqual([])
  })

  it('falls back on wrong shapes and drops bad logs', () => {
    setBackend(
      memBackend({ [KEYS.settings]: '"str"', [KEYS.logs]: JSON.stringify([log, { id: 1 }, null]) }),
    )
    expect(getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(getLogs()).toEqual([log])
  })

  it('merges missing settings keys with defaults and ignores wrong types', () => {
    setBackend(
      memBackend({ [KEYS.settings]: JSON.stringify({ sets: 4, reps: 'x', colorMode: 'neon' }) }),
    )
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, sets: 4 })
  })

  it('returns a stable snapshot between reads', () => {
    updateSettings({ sets: 2 })
    expect(getSettings()).toBe(getSettings())
  })
})
