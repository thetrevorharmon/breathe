import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../domain/defaults'
import { SessionClockCore } from '../clockCore'
import { useWakeLock } from '../useWakeLock'

const log: string[] = []
vi.mock('./audio', () => ({
  beep: (k: string) => log.push(`beep:${k}`),
  say: (t: string) => log.push(`say:${t}`),
  silence: () => {},
  unlockAudio: () => {},
}))

import type * as audio from './audio'
import { cueFor, useCues } from './useCues'

const cfg = { ...DEFAULT_SETTINGS }
const count = (s: string) => log.filter((l) => l === s).length

/** Advances the core in 50 ms frames for `seconds` of wall time. */
function run(core: SessionClockCore, state: { ms: number }, seconds: number) {
  const end = state.ms + seconds * 1000
  while (state.ms < end) {
    state.ms += 50
    core.tick(state.ms)
  }
}

function setup(muted = false) {
  const core = new SessionClockCore(cfg)
  const state = { ms: 1000 }
  core.tick(state.ms)
  const hook = renderHook(({ m }) => useCues({ subscribe: core.onEvent }, m), {
    initialProps: { m: muted },
  })
  return { core, state, hook }
}

beforeEach(() => {
  log.length = 0
})

describe('cueFor', () => {
  it('maps events', () => {
    expect(cueFor({ type: 'phase', at: 0, phase: 'inhale', set: 0, rep: 0 })).toEqual({
      kind: 'say',
      text: 'Inhale',
    })
    expect(cueFor({ type: 'phase', at: 0, phase: 'holdTop', set: 0, rep: 0 })).toEqual({
      kind: 'say',
      text: 'Hold',
    })
    expect(cueFor({ type: 'restStart', at: 0, set: 0 })).toEqual({ kind: 'beep', beep: 'rest' })
    expect(cueFor({ type: 'countdownTick', at: 0, n: 3, set: 0 })).toEqual({
      kind: 'beep',
      beep: 'tick',
    })
    expect(cueFor({ type: 'countdownTick', at: 0, n: 1, set: 0 })).toEqual({
      kind: 'beep',
      beep: 'go',
    })
  })
})

describe('useCues over a full default session', () => {
  it('fires each cue exactly once', () => {
    const { core, state } = setup()
    run(core, state, 340)
    expect(count('say:Inhale')).toBe(30)
    expect(count('say:Exhale')).toBe(30)
    expect(count('say:Hold')).toBe(60)
    expect(count('beep:rest')).toBe(2)
    expect(count('beep:tick')).toBe(6)
    expect(count('beep:go')).toBe(3)
    expect(log.length).toBe(120 + 2 + 9)
  })

  it('lead-in ticks land at t=0,1,2 then Inhale at 3', () => {
    const { core, state } = setup()
    run(core, state, 3.2)
    expect(log).toEqual(['beep:tick', 'beep:tick', 'beep:go', 'say:Inhale'])
  })

  it('Skip during rest lands on the set start and fires Inhale once', () => {
    const { core, state } = setup()
    run(core, state, 74)
    expect(count('beep:rest')).toBe(1)
    log.length = 0
    act(() => core.skip())
    run(core, state, 1)
    expect(count('beep:rest')).toBe(0)
    expect(count('say:Inhale')).toBe(1)
  })

  it('Skip in lead-in goes straight to the first phase', () => {
    const { core, state } = setup()
    run(core, state, 0.5)
    log.length = 0
    act(() => core.skip())
    run(core, state, 0.5)
    expect(log).toEqual(['say:Inhale'])
  })

  it('Restart replays the lead-in once', () => {
    const { core, state } = setup()
    run(core, state, 20)
    log.length = 0
    act(() => core.restart(state.ms))
    run(core, state, 3.2)
    expect(log).toEqual(['beep:tick', 'beep:tick', 'beep:go', 'say:Inhale'])
  })

  it('Pause/Resume does not repeat or drop cues', () => {
    const { core, state } = setup()
    run(core, state, 10.5)
    const before = log.length
    act(() => core.pause())
    run(core, state, 30)
    expect(log.length).toBe(before)
    act(() => core.resume(state.ms))
    run(core, state, 70 - 10.5)
    expect(count('say:Inhale')).toBe(10)
    expect(count('beep:rest')).toBe(0)
  })

  it('background hold resume replays ticks 3,2,1', () => {
    const { core, state } = setup()
    run(core, state, 80)
    log.length = 0
    core.hide(state.ms)
    state.ms += 200_000
    core.show(state.ms)
    act(() => core.resume(state.ms))
    run(core, state, 3.2)
    expect(log).toEqual(['beep:tick', 'beep:tick', 'beep:go', 'say:Inhale'])
  })

  it('mute silences everything, live', () => {
    const { core, state, hook } = setup(true)
    run(core, state, 10)
    expect(log).toEqual([])
    hook.rerender({ m: false })
    run(core, state, 7)
    expect(log.length).toBeGreaterThan(0)
    const n = log.length
    hook.rerender({ m: true })
    run(core, state, 20)
    expect(log.length).toBe(n)
  })

  it('unsubscribes on unmount', () => {
    const { core, state, hook } = setup()
    hook.unmount()
    run(core, state, 10)
    expect(log).toEqual([])
  })
})

describe('real audio module without browser support', () => {
  it('does not throw', async () => {
    const real = await vi.importActual<typeof audio>('./audio')
    expect(() => {
      real.unlockAudio()
      real.beep('rest')
      real.say('Inhale')
      real.silence()
    }).not.toThrow()
  })
})

describe('useWakeLock', () => {
  const release = vi.fn(() => Promise.resolve())
  const request = vi.fn(() => Promise.resolve({ release }))
  afterEach(() => {
    request.mockClear()
    release.mockClear()
    Reflect.deleteProperty(navigator, 'wakeLock')
  })

  it('requests on start, re-requests on visible, releases on unmount', async () => {
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    const { unmount } = renderHook(() => useWakeLock())
    await act(async () => {})
    expect(request).toHaveBeenCalledTimes(1)
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(request).toHaveBeenCalledTimes(2)
    unmount()
    expect(release).toHaveBeenCalled()
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('releases when deactivated (done)', async () => {
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    const { rerender } = renderHook(({ a }) => useWakeLock(a), { initialProps: { a: true } })
    await act(async () => {})
    rerender({ a: false })
    expect(release).toHaveBeenCalled()
  })

  it('no wakeLock or rejecting request does not throw', async () => {
    expect(() => renderHook(() => useWakeLock()).unmount()).not.toThrow()
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: () => Promise.reject(new Error('denied')) },
      configurable: true,
    })
    const { unmount } = renderHook(() => useWakeLock())
    await act(async () => {})
    expect(() => unmount()).not.toThrow()
  })
})
