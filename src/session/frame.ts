import type { SessionConfig } from '../domain/types'
import { buildTimeline, PHASE_LABEL, segmentAt, type PhaseName, type SegmentKind } from './timeline'

/** Gap between outer-ring arcs, degrees. */
export const GAP_DEG = 10

export type ArcFrame = {
  /** Degrees clockwise from 12 o'clock. */
  start: number
  len: number
  /** Filled degrees within the arc (0..len). */
  fill: number
}

export type Frame = {
  t: number
  total: number
  done: boolean
  kind: SegmentKind | 'done'
  /** 0-based set (the last set when done). */
  set: number
  sets: number
  reps: number
  /** 0-based rep while breathing, else 0. */
  rep: number
  phase: PhaseName | null
  /** Segment end time (skip target). */
  segEnd: number
  canSkip: boolean
  arcs: ArcFrame[]
  ticks: { angle: number; on: boolean }[]
  /** Outer indicator angle, degrees clockwise from 12 o'clock. */
  indicatorDeg: number
  inner: {
    /** 0..1 fraction of the inner ring filled. */
    fraction: number
    mode: 'breathe' | 'count' | 'done'
    scale: number
  }
  phaseDots: { angle: number; lit: boolean }[]
  label: string
  labelOpacity: number
  countTitle: string
  countNum: number
  statusMain: string
  statusSub: string
  doneSub: string
}

/** Pure port of renderVals() from the prototype: (config, t) -> everything the ring needs. */
export function frameAt(config: Partial<SessionConfig>, tRaw: number): Frame {
  const tl = buildTimeline(config)
  const { cfg, cycle, total } = tl
  const { sets, reps, inhale: inh, holdTop: h1, exhale: exh } = cfg

  const t = Math.min(Math.max(tRaw, 0), total)
  const seg = segmentAt(tl, t)
  const el = seg ? t - seg.start : 0
  const isDone = !seg
  const isBreathe = seg?.kind === 'breathe'
  const isCount = seg?.kind === 'lead' || seg?.kind === 'rest'
  const f = seg ? el / seg.dur : 1

  // Outer ring
  const A = 360 / sets
  const g = GAP_DEG
  let a: number
  if (!seg) a = sets * A - g / 2
  else if (seg.kind === 'breathe') a = seg.set * A + g / 2 + f * (A - g)
  else a = seg.set * A - g / 2 + f * g

  const arcs: ArcFrame[] = []
  const ticks: { angle: number; on: boolean }[] = []
  for (let j = 0; j < sets; j++) {
    const start = j * A + g / 2
    const len = A - g
    arcs.push({ start, len, fill: Math.min(Math.max(a - start, 0), len) })
    for (let r = 1; r < reps; r++) {
      const angle = start + (r / reps) * len
      ticks.push({ angle, on: a >= angle })
    }
  }

  // Inner ring
  let label = ''
  let labelOpacity = 1
  let level = 0
  let sweep = 0
  let rep = 0
  let phase: PhaseName | null = null
  if (isBreathe) {
    rep = Math.min(reps - 1, Math.floor(el / cycle))
    const p = el - rep * cycle
    let ps: number
    if (p < inh) {
      level = p / inh
      phase = 'inhale'
      ps = 0
    } else if (p < inh + h1) {
      level = 1
      phase = 'holdTop'
      ps = inh
    } else if (p < inh + h1 + exh) {
      level = 1 - (p - inh - h1) / exh
      phase = 'exhale'
      ps = inh + h1
    } else {
      level = 0
      phase = 'holdBottom'
      ps = inh + h1 + exh
    }
    label = PHASE_LABEL[phase]
    labelOpacity = Math.min(1, (p - ps) / 0.2)
    sweep = (p / cycle) * 360
  }
  const fraction = isBreathe ? sweep / 360 : isCount ? f : 1
  const scale = cfg.ringBreathes ? (isDone ? 1 : isBreathe ? 0.8 + 0.2 * level : 0.8) : 1

  const phaseDots = [0, inh, inh + h1, inh + h1 + exh].map((b) => {
    const angle = (b / cycle) * 360
    return { angle, lit: angle === 0 || sweep >= angle }
  })

  const countNum = seg ? Math.max(1, Math.ceil(seg.dur - el - 1e-6)) : 0
  let countTitle = ''
  let statusMain: string
  let statusSub: string
  if (seg?.kind === 'lead') {
    countTitle = 'GET READY'
    statusMain = `Set 1 of ${sets}`
    statusSub = 'Up next'
  } else if (seg?.kind === 'rest') {
    countTitle = 'REST'
    statusMain = `Set ${seg.set + 1} of ${sets}`
    statusSub = 'Up next'
  } else if (seg) {
    statusMain = `Set ${seg.set + 1} of ${sets}`
    statusSub = `Rep ${rep + 1} of ${reps}`
  } else {
    statusMain = `Set ${sets} of ${sets}`
    statusSub = 'Complete'
  }

  return {
    t,
    total,
    done: isDone,
    kind: seg ? seg.kind : 'done',
    set: seg ? seg.set : sets - 1,
    sets,
    reps,
    rep,
    phase,
    segEnd: seg ? seg.end : total,
    canSkip: isCount,
    arcs,
    ticks,
    indicatorDeg: a,
    inner: { fraction, mode: isBreathe ? 'breathe' : isCount ? 'count' : 'done', scale },
    phaseDots,
    label,
    labelOpacity,
    countTitle,
    countNum,
    statusMain,
    statusSub,
    doneSub: `${sets} sets · ${sets * reps} reps`,
  }
}
