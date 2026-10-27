import type { SessionConfig } from '../domain/types'

export const LEAD_SECONDS = 3
/** Seconds before a set at which a background-elapsed rest is held. */
export const HOLD_BEFORE_SET = 3

export type SegmentKind = 'lead' | 'breathe' | 'rest'

export type Segment = {
  kind: SegmentKind
  /** Set this segment belongs to (0-based). For lead/rest: the set that comes next. */
  set: number
  start: number
  end: number
  dur: number
}

export type NormalizedConfig = {
  inhale: number
  holdTop: number
  exhale: number
  holdBottom: number
  sets: number
  reps: number
  restSeconds: number
  ringBreathes: boolean
}

export type Timeline = {
  cfg: NormalizedConfig
  /** One breath cycle, seconds. */
  cycle: number
  segments: Segment[]
  total: number
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** Same clamping as the prototype, so odd values can never break the maths. */
export function normalize(c: Partial<SessionConfig>): NormalizedConfig {
  return {
    inhale: Math.max(0.5, num(c.inhale, 2.5)),
    holdTop: Math.max(0, num(c.holdTop, 1)),
    exhale: Math.max(0.5, num(c.exhale, 2.5)),
    holdBottom: Math.max(0, num(c.holdBottom, 1)),
    sets: Math.max(1, Math.round(num(c.sets, 3))),
    reps: Math.max(1, Math.round(num(c.reps, 10))),
    restSeconds: Math.max(1, num(c.restSeconds, 60)),
    ringBreathes: c.ringBreathes !== false,
  }
}

const cache = new WeakMap<object, Timeline>()

/** lead(3) -> set -> rest -> ... -> set (no rest after the last set). Memoised per config object. */
export function buildTimeline(config: Partial<SessionConfig>): Timeline {
  const hit = cache.get(config)
  if (hit) return hit
  const cfg = normalize(config)
  const cycle = cfg.inhale + cfg.holdTop + cfg.exhale + cfg.holdBottom
  const segments: Segment[] = []
  let at = 0
  const push = (kind: SegmentKind, set: number, dur: number) => {
    segments.push({ kind, set, start: at, end: at + dur, dur })
    at += dur
  }
  push('lead', 0, LEAD_SECONDS)
  for (let k = 0; k < cfg.sets; k++) {
    push('breathe', k, cfg.reps * cycle)
    if (k < cfg.sets - 1) push('rest', k + 1, cfg.restSeconds)
  }
  const tl = { cfg, cycle, segments, total: at }
  cache.set(config, tl)
  return tl
}

/** Segment containing t, or null once t >= total (done). */
export function segmentAt(tl: Timeline, t: number): Segment | null {
  for (const s of tl.segments) if (t < s.end) return s
  return null
}

export type PhaseName = 'inhale' | 'holdTop' | 'exhale' | 'holdBottom'

export const PHASE_LABEL: Record<PhaseName, string> = {
  inhale: 'INHALE',
  holdTop: 'HOLD',
  exhale: 'EXHALE',
  holdBottom: 'HOLD',
}

/** Phases with their start offsets inside one cycle (zero-length holds are kept; callers skip them). */
export function phaseOffsets(
  cfg: NormalizedConfig,
): { phase: PhaseName; start: number; dur: number }[] {
  return [
    { phase: 'inhale', start: 0, dur: cfg.inhale },
    { phase: 'holdTop', start: cfg.inhale, dur: cfg.holdTop },
    { phase: 'exhale', start: cfg.inhale + cfg.holdTop, dur: cfg.exhale },
    { phase: 'holdBottom', start: cfg.inhale + cfg.holdTop + cfg.exhale, dur: cfg.holdBottom },
  ]
}
