import type { SessionConfig } from '../domain/types'
import { buildTimeline, phaseOffsets, type PhaseName } from './timeline'

/**
 * Events the cues layer (T7) reacts to. All carry the timeline time `at` at which they occur.
 *  - phase:         a breathing phase begins (zero-length holds are skipped)
 *  - restStart:     a set ended and rest begins (`set` = the set just finished, 0-based)
 *  - countdownTick: 3, 2, 1 seconds before a set starts (lead-in and every rest)
 */
export type SessionEvent =
  | { type: 'phase'; at: number; phase: PhaseName; set: number; rep: number }
  | { type: 'restStart'; at: number; set: number }
  | { type: 'countdownTick'; at: number; n: 1 | 2 | 3; set: number }

/**
 * Events with `from <= at < to`, sorted by time. Half-open, so consecutive windows
 * [a,b) [b,c) never repeat or drop an event. After a discontinuity (skip, restart,
 * returning from background) the clock "seeks": the next window starts at the new t.
 */
export function eventsBetween(
  config: Partial<SessionConfig>,
  from: number,
  to: number,
): SessionEvent[] {
  if (!(to > from)) return []
  const tl = buildTimeline(config)
  const out: SessionEvent[] = []
  const inWin = (at: number) => at >= from && at < to
  const offsets = phaseOffsets(tl.cfg)

  for (const seg of tl.segments) {
    if (seg.kind === 'breathe') {
      if (seg.end <= from || seg.start >= to) continue
      for (let rep = 0; rep < tl.cfg.reps; rep++) {
        const base = seg.start + rep * tl.cycle
        for (const o of offsets) {
          if (o.dur <= 0) continue
          const at = base + o.start
          if (inWin(at)) out.push({ type: 'phase', at, phase: o.phase, set: seg.set, rep })
        }
      }
    } else {
      if (seg.kind === 'rest' && inWin(seg.start)) {
        out.push({ type: 'restStart', at: seg.start, set: seg.set - 1 })
      }
      for (const n of [3, 2, 1] as const) {
        const at = seg.end - n
        if (at >= seg.start && inWin(at)) out.push({ type: 'countdownTick', at, n, set: seg.set })
      }
    }
  }
  return out.sort((x, y) => x.at - y.at)
}
