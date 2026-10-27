import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../domain/defaults'
import { SessionClockCore } from '../clockCore'
import { useWakeLock } from '../useWakeLock'

const log: string[] = []
const sessions: string[] = []
vi.mock('./audio', () => ({
  play: (c: string) => log.push(`play:${c}`),
  setAudioSession: (m: string) => sessions.push(m),
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
  sessions.length = 0
})

describe('cueFor', () => {
  it('maps events', () => {
    const phase = (p: string) => cueFor({ type: 'phase', at: 0, phase: p, set: 0, rep: 0 } as never)
    expect(phase('inhale')).toEqual({ clip: 'inhale' })
    expect(phase('holdTop')).toEqual({ clip: 'holdTop' })
    expect(phase('exhale')).toEqual({ clip: 'exhale' })
    expect(phase('holdBottom')).toEqual({ clip: 'holdBottom' })
    expect(cueFor({ type: 'restStart', at: 0, set: 0 })).toEqual({ clip: 'rest' })
    expect(cueFor({ type: 'countdownTick', at: 0, n: 3, set: 0 })).toEqual({ clip: 'tick' })
    expect(cueFor({ type: 'countdownTick', at: 0, n: 1, set: 0 })).toEqual({ clip: 'go' })
  })
})

describe('useCues over a full default session', () => {
  it('fires each cue exactly once', () => {
    const { core, state } = setup()
    run(core, state, 340)
    expect(count('play:inhale')).toBe(30)
    expect(count('play:exhale')).toBe(30)
    expect(count('play:holdTop')).toBe(30)
    expect(count('play:holdBottom')).toBe(30)
    expect(count('play:rest')).toBe(2)
    expect(count('play:tick')).toBe(6)
    expect(count('play:go')).toBe(3)
    expect(log.length).toBe(120 + 2 + 9)
  })

  it('lead-in ticks land at t=0,1,2 then Inhale at 3', () => {
    const { core, state } = setup()
    run(core, state, 3.2)
    expect(log).toEqual(['play:tick', 'play:tick', 'play:go', 'play:inhale'])
  })

  it('Skip during rest lands on the set start and fires Inhale once', () => {
    const { core, state } = setup()
    run(core, state, 74)
    expect(count('play:rest')).toBe(1)
    log.length = 0
    act(() => core.skip())
    run(core, state, 1)
    expect(count('play:rest')).toBe(0)
    expect(count('play:inhale')).toBe(1)
  })

  it('Skip in lead-in goes straight to the first phase', () => {
    const { core, state } = setup()
    run(core, state, 0.5)
    log.length = 0
    act(() => core.skip())
    run(core, state, 0.5)
    expect(log).toEqual(['play:inhale'])
  })

  it('Restart replays the lead-in once', () => {
    const { core, state } = setup()
    run(core, state, 20)
    log.length = 0
    act(() => core.restart(state.ms))
    run(core, state, 3.2)
    expect(log).toEqual(['play:tick', 'play:tick', 'play:go', 'play:inhale'])
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
    expect(count('play:inhale')).toBe(10)
    expect(count('play:rest')).toBe(0)
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
    expect(log).toEqual(['play:tick', 'play:tick', 'play:go', 'play:inhale'])
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

  it('sets the audio session from the setting and resets it on unmount', () => {
    const core = new SessionClockCore(cfg)
    const hook = renderHook(({ a }) => useCues({ subscribe: core.onEvent }, false, a), {
      initialProps: { a: 'duck' as 'duck' | 'mix' | 'pause' },
    })
    hook.rerender({ a: 'mix' })
    hook.unmount()
    expect(sessions).toEqual(['duck', 'mix', 'auto'])
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
      real.unlockAudio('duck')
      real.play('rest')
      real.play('inhale')
      real.setAudioSession('pause')
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

describe('setAudioSession', () => {
  afterEach(() => Reflect.deleteProperty(navigator, 'audioSession'))
  it('maps each mode to an iOS audio session type', async () => {
    const real = await vi.importActual<typeof audio>('./audio')
    const session = { type: 'auto' }
    Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true })
    real.setAudioSession('duck')
    expect(session.type).toBe('transient')
    real.setAudioSession('mix')
    expect(session.type).toBe('ambient')
    real.setAudioSession('pause')
    expect(session.type).toBe('playback')
    real.setAudioSession('auto')
    expect(session.type).toBe('auto')
  })
})
