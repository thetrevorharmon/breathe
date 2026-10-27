import type { SessionConfig } from '../domain/types'
import { eventsBetween, type SessionEvent } from './events'
import { buildTimeline, HOLD_BEFORE_SET, segmentAt } from './timeline'

export const MAX_DT = 0.1

export type ClockSnapshot = {
  t: number
  paused: boolean
  done: boolean
  /** Seconds of active time: pauses excluded, skips not counted. */
  activeElapsed: number
}

/**
 * Framework-free session clock. All time comes in through `nowMs` arguments
 * (performance.now() style), so it is deterministic under a fake clock.
 *
 * Background rules (PLAN §4):
 *  - hidden while breathing / lead-in: pause immediately
 *  - hidden during rest: keep counting on wall-clock time; on return add the hidden duration
 *  - rest elapsed while hidden: hold at 3 s before the set, paused (never auto-start a set)
 */
export class SessionClockCore {
  private t: number
  private paused: boolean
  private active = 0
  private lastMs: number | null = null
  private hiddenSince: number | null = null
  private snap: ClockSnapshot
  private listeners = new Set<() => void>()
  private eventListeners = new Set<(e: SessionEvent) => void>()
  startedAt: Date

  constructor(
    private readonly config: SessionConfig,
    opts: { startT?: number; paused?: boolean; startedAt?: Date } = {},
  ) {
    const total = buildTimeline(config).total
    this.t = Math.min(Math.max(opts.startT ?? 0, 0), total)
    this.paused = opts.paused ?? false
    this.startedAt = opts.startedAt ?? new Date()
    this.snap = this.makeSnap()
  }

  private get total() {
    return buildTimeline(this.config).total
  }

  private makeSnap(): ClockSnapshot {
    return {
      t: this.t,
      paused: this.paused,
      done: this.t >= this.total,
      activeElapsed: this.active,
    }
  }

  private commit() {
    const s = this.makeSnap()
    const p = this.snap
    if (
      s.t === p.t &&
      s.paused === p.paused &&
      s.done === p.done &&
      s.activeElapsed === p.activeElapsed
    )
      return
    this.snap = s
    this.listeners.forEach((l) => l())
  }

  getSnapshot = (): ClockSnapshot => this.snap

  subscribe = (l: () => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  /** Subscribe to cue events (phase / restStart / countdownTick). */
  onEvent = (l: (e: SessionEvent) => void) => {
    this.eventListeners.add(l)
    return () => this.eventListeners.delete(l)
  }

  get isHidden() {
    return this.hiddenSince !== null
  }

  /** Call once per animation frame. */
  tick(nowMs: number) {
    const last = this.lastMs
    this.lastMs = nowMs
    if (last === null || this.paused || this.hiddenSince !== null || this.t >= this.total) return
    const dt = Math.min(Math.max((nowMs - last) / 1000, 0), MAX_DT)
    this.advance(dt)
  }

  /** Move forward by dt seconds of active time, emitting events. */
  private advance(dt: number) {
    const to = Math.min(this.t + dt, this.total)
    const from = this.t
    this.t = to
    this.active += to - from
    this.emit(from, to)
    this.commit()
  }

  private emit(from: number, to: number) {
    if (this.eventListeners.size === 0) return
    for (const e of eventsBetween(this.config, from, to)) this.eventListeners.forEach((l) => l(e))
  }

  pause() {
    if (this.paused || this.t >= this.total) return
    this.paused = true
    this.commit()
  }

  /** `nowMs` re-bases the frame timer so the pause is not counted. */
  resume(nowMs?: number) {
    if (!this.paused || this.t >= this.total) return
    this.paused = false
    if (nowMs !== undefined) this.lastMs = nowMs
    this.commit()
  }

  toggle(nowMs?: number) {
    if (this.paused) this.resume(nowMs)
    else this.pause()
  }

  /** Jump to the end of the current lead-in / rest. Does not add to active time. */
  skip() {
    const seg = segmentAt(buildTimeline(this.config), this.t)
    if (!seg || seg.kind === 'breathe') return
    this.t = seg.end
    this.commit()
  }

  restart(nowMs?: number) {
    this.t = 0
    this.active = 0
    this.paused = false
    this.hiddenSince = null
    this.startedAt = new Date()
    if (nowMs !== undefined) this.lastMs = nowMs
    this.commit()
  }

  /** The page was hidden. */
  hide(nowMs: number) {
    if (this.hiddenSince !== null) return
    if (this.paused || this.t >= this.total) return
    const seg = segmentAt(buildTimeline(this.config), this.t)
    if (seg?.kind === 'rest') {
      this.hiddenSince = nowMs
    } else {
      this.pause()
    }
  }

  /** The page is visible again. */
  show(nowMs: number) {
    const since = this.hiddenSince
    this.lastMs = nowMs
    if (since === null) return
    this.hiddenSince = null
    const gap = Math.max(0, (nowMs - since) / 1000)
    const seg = segmentAt(buildTimeline(this.config), this.t)
    if (!seg || seg.kind !== 'rest') return
    if (this.t + gap >= seg.end) {
      // Rest ran out in the background: hold 3 s before the set, paused.
      const hold = Math.max(this.t, seg.end - HOLD_BEFORE_SET)
      this.active += hold - this.t
      this.t = hold
      this.paused = true
      this.commit()
    } else {
      // Still resting: seek forward (no events for the skipped stretch).
      this.t += gap
      this.active += gap
      this.commit()
    }
  }
}
