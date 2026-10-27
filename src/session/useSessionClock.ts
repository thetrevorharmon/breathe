import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { SessionConfig } from '../domain/types'
import { SessionClockCore } from './clockCore'
import type { SessionEvent } from './events'

export type { SessionEvent } from './events'

export type SessionClock = {
  t: number
  paused: boolean
  done: boolean
  /** Active seconds so far (pauses excluded, skips not counted). */
  activeElapsed: number
  startedAt: Date
  pause: () => void
  resume: () => void
  toggle: () => void
  skip: () => void
  restart: () => void
  /** Subscribe to cue events; returns an unsubscribe function. */
  subscribe: (listener: (e: SessionEvent) => void) => () => void
}

/**
 * Drives a session with requestAnimationFrame. `config` is read once (the session is
 * frozen at start); `opts` are dev affordances (`t=` and `paused=1` URL params).
 */
export function useSessionClock(
  config: SessionConfig,
  opts: { startT?: number; paused?: boolean } = {},
): SessionClock {
  const [core] = useState(() => new SessionClockCore(config, opts))
  const snap = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)

  useEffect(() => {
    let raf = 0
    const loop = (now: number) => {
      core.tick(now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onVis = () => {
      if (document.visibilityState === 'hidden') core.hide(performance.now())
      else core.show(performance.now())
    }
    document.addEventListener('visibilitychange', onVis)
    if (document.visibilityState === 'hidden') core.hide(performance.now())
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [core])

  const resume = useCallback(() => core.resume(performance.now()), [core])
  const toggle = useCallback(() => core.toggle(performance.now()), [core])
  const restart = useCallback(() => core.restart(performance.now()), [core])
  const pause = useCallback(() => core.pause(), [core])
  const skip = useCallback(() => core.skip(), [core])

  return {
    ...snap,
    startedAt: core.startedAt,
    pause,
    resume,
    toggle,
    skip,
    restart,
    subscribe: core.onEvent,
  }
}
