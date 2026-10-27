import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import type { SessionConfig } from '../domain/types'
import { SessionClockCore } from './clockCore'
import { eventsBetween, type SessionEvent } from './events'
import { frameAt } from './frame'
import { buildTimeline } from './timeline'

const cfg = (over: Partial<SessionConfig> = {}): SessionConfig => ({
  ...DEFAULT_SETTINGS,
  ...over,
})

// Defaults: lead [0,3) set0 [3,73) rest [73,133) set1 [133,203) rest [203,263) set2 [263,333)

describe('timeline', () => {
  it('defaults: 333 s total and C = 7.0 s', () => {
    const tl = buildTimeline(cfg())
    expect(tl.total).toBe(333)
    expect(tl.cycle).toBe(7)
    expect(tl.segments.map((s) => s.kind)).toEqual([
      'lead',
      'breathe',
      'rest',
      'breathe',
      'rest',
      'breathe',
    ])
  })
  it('sets = 1 has no rest', () => {
    const tl = buildTimeline(cfg({ sets: 1 }))
    expect(tl.segments.map((s) => s.kind)).toEqual(['lead', 'breathe'])
    expect(tl.total).toBe(73)
  })
})

describe('frameAt', () => {
  const c = cfg()
  it('lead-in: GET READY countdown, set 1 up next, indicator crosses first gap', () => {
    const f = frameAt(c, 1.5)
    expect(f.kind).toBe('lead')
    expect(f.countTitle).toBe('GET READY')
    expect(f.countNum).toBe(2)
    expect(f.statusMain).toBe('Set 1 of 3')
    expect(f.statusSub).toBe('Up next')
    expect(f.inner.fraction).toBeCloseTo(0.5)
    expect(f.inner.scale).toBe(0.8)
    expect(f.indicatorDeg).toBeCloseTo(-5 + 0.5 * 10)
    expect(f.canSkip).toBe(true)
    expect(f.phaseDots).toBeDefined()
  })
  it('phase boundaries (inhale 2.5, hold 1, exhale 2.5, hold 1)', () => {
    const at = (p: number) => frameAt(c, 3 + p)
    expect(at(0).phase).toBe('inhale')
    expect(at(2.49).phase).toBe('inhale')
    expect(at(2.5).phase).toBe('holdTop')
    expect(at(3.49).phase).toBe('holdTop')
    expect(at(3.5).phase).toBe('exhale')
    expect(at(5.99).phase).toBe('exhale')
    expect(at(6).phase).toBe('holdBottom')
    expect(at(6.99).phase).toBe('holdBottom')
    expect(at(7).phase).toBe('inhale')
    expect(at(7).rep).toBe(1)
    expect(at(2.5).inner.scale).toBeCloseTo(1)
    expect(at(0).inner.scale).toBeCloseTo(0.8)
    expect(at(6).inner.scale).toBeCloseTo(0.8)
    expect(at(0.1).labelOpacity).toBeCloseTo(0.5)
    expect(at(1).labelOpacity).toBe(1)
  })
  it('breath ring sweep and phase dots', () => {
    const f = frameAt(c, 3 + 3.5) // p = 3.5 of 7 -> half way
    expect(f.inner.fraction).toBeCloseTo(0.5)
    expect(f.phaseDots.map((d) => d.lit)).toEqual([true, true, true, false])
    expect(f.phaseDots[1].angle).toBeCloseTo((2.5 / 7) * 360)
    expect(f.statusSub).toBe('Rep 1 of 10')
  })
  it('ring does not breathe when ringBreathes is off', () => {
    expect(frameAt(cfg({ ringBreathes: false }), 3).inner.scale).toBe(1)
  })
  it('set / rest crossovers', () => {
    const end0 = frameAt(c, 72.99)
    expect(end0.kind).toBe('breathe')
    expect(end0.indicatorDeg).toBeCloseTo(115, 0) // k·A + A − 5, A = 120 -> 115
    const rest = frameAt(c, 73)
    expect(rest.kind).toBe('rest')
    expect(rest.countTitle).toBe('REST')
    expect(rest.statusMain).toBe('Set 2 of 3')
    expect(rest.indicatorDeg).toBeCloseTo(120 - 5)
    expect(rest.inner.fraction).toBe(0)
    const mid = frameAt(c, 103)
    expect(mid.indicatorDeg).toBeCloseTo(120)
    expect(mid.countNum).toBe(30)
    const set1 = frameAt(c, 133)
    expect(set1.kind).toBe('breathe')
    expect(set1.set).toBe(1)
    expect(set1.indicatorDeg).toBeCloseTo(125)
    expect(set1.arcs[0].fill).toBeCloseTo(110) // first arc complete
    expect(set1.arcs[1].fill).toBe(0)
  })
  it('first arc straddles 12 o clock: arcs start at 5 deg and span 110', () => {
    const f = frameAt(c, 0)
    expect(f.arcs.map((a) => [a.start, a.len])).toEqual([
      [5, 110],
      [125, 110],
      [245, 110],
    ])
    expect(f.ticks).toHaveLength(27)
  })
  it('done state at t = total', () => {
    const f = frameAt(c, 333)
    expect(f.done).toBe(true)
    expect(f.kind).toBe('done')
    expect(f.statusMain).toBe('Set 3 of 3')
    expect(f.statusSub).toBe('Complete')
    expect(f.doneSub).toBe('3 sets · 30 reps')
    expect(f.inner).toMatchObject({ fraction: 1, scale: 1, mode: 'done' })
    expect(f.indicatorDeg).toBeCloseTo(355)
    expect(f.ticks.every((t) => t.on)).toBe(true)
    expect(f.canSkip).toBe(false)
    expect(frameAt(c, 999).t).toBe(333)
  })
  it('sets = 1: one arc of 350 degrees, no rest', () => {
    const one = cfg({ sets: 1 })
    const f = frameAt(one, 3)
    expect(f.arcs).toHaveLength(1)
    expect(f.arcs[0].len).toBe(350)
    expect(f.statusMain).toBe('Set 1 of 1')
    expect(frameAt(one, 73).done).toBe(true)
  })
  it('holds = 0: cycle shortens and hold phases never appear', () => {
    const h = cfg({ holdTop: 0, holdBottom: 0 })
    expect(buildTimeline(h).cycle).toBe(5)
    const phases = new Set<string | null>()
    for (let p = 0; p < 5; p += 0.05) phases.add(frameAt(h, 3 + p).phase)
    expect([...phases].sort()).toEqual(['exhale', 'inhale'])
    // phase dots for inhale/holdTop/exhale boundaries collapse but stay finite
    expect(frameAt(h, 4).phaseDots.every((d) => Number.isFinite(d.angle))).toBe(true)
  })
})

describe('eventsBetween', () => {
  const c = cfg()
  const kinds = (e: SessionEvent[]) => e.map((x) => `${x.type}@${x.at}`)
  it('lead-in countdown ticks at 0, 1, 2 then inhale at 3', () => {
    const e = eventsBetween(c, 0, 3.0001)
    expect(kinds(e)).toEqual(['countdownTick@0', 'countdownTick@1', 'countdownTick@2', 'phase@3'])
    expect(e.filter((x) => x.type === 'countdownTick').map((x) => (x as { n: number }).n)).toEqual([
      3, 2, 1,
    ])
  })
  it('phase events for one cycle', () => {
    const e = eventsBetween(c, 3, 10)
    expect(e.map((x) => (x as { phase: string }).phase)).toEqual([
      'inhale',
      'holdTop',
      'exhale',
      'holdBottom',
    ])
    expect(e.map((x) => x.at)).toEqual([3, 5.5, 6.5, 9])
  })
  it('zero-length holds emit no phase', () => {
    const h = cfg({ holdTop: 0, holdBottom: 0 })
    const e = eventsBetween(h, 3, 8)
    expect(e.map((x) => (x as { phase: string }).phase)).toEqual(['inhale', 'exhale'])
  })
  it('set end: restStart once, then ticks at rest end', () => {
    expect(kinds(eventsBetween(c, 72.5, 74))).toEqual(['restStart@73'])
    expect(kinds(eventsBetween(c, 129, 133.5))).toEqual([
      'countdownTick@130',
      'countdownTick@131',
      'countdownTick@132',
      'phase@133',
    ])
    const rs = eventsBetween(c, 73, 74)[0]
    expect(rs).toMatchObject({ type: 'restStart', set: 0 })
  })
  it('no restStart after the last set', () => {
    expect(eventsBetween(c, 332.5, 340)).toEqual([])
  })
  it('consecutive windows never duplicate or drop events', () => {
    const all = eventsBetween(c, 0, 333)
    const stitched: SessionEvent[] = []
    let t = 0
    while (t < 333) {
      const n = Math.min(333, t + 0.0371)
      stitched.push(...eventsBetween(c, t, n))
      t = n
    }
    expect(stitched).toEqual(all)
    // 3 countdowns x 3 ticks, 2 restStarts, 3*10*4 phases
    expect(all.filter((e) => e.type === 'countdownTick')).toHaveLength(9)
    expect(all.filter((e) => e.type === 'restStart')).toHaveLength(2)
    expect(all.filter((e) => e.type === 'phase')).toHaveLength(120)
  })
})

describe('SessionClockCore', () => {
  const run = (core: SessionClockCore, fromMs: number, toMs: number, stepMs = 16) => {
    for (let ms = fromMs; ms <= toMs; ms += stepMs) core.tick(ms)
  }

  it('advances in real time and counts active time', () => {
    const core = new SessionClockCore(cfg())
    run(core, 0, 2000)
    const s = core.getSnapshot()
    expect(s.t).toBeGreaterThan(1.9)
    expect(s.t).toBeLessThan(2.01)
    expect(s.activeElapsed).toBeCloseTo(s.t)
  })

  it('clamps a long frame gap to 0.1 s while visible', () => {
    const core = new SessionClockCore(cfg())
    core.tick(0)
    core.tick(5000)
    expect(core.getSnapshot().t).toBeCloseTo(0.1)
  })

  it('pause freezes t and active time; resume continues without a jump', () => {
    const core = new SessionClockCore(cfg())
    run(core, 0, 1000)
    const t1 = core.getSnapshot().t
    core.pause()
    run(core, 1016, 5000)
    expect(core.getSnapshot().t).toBe(t1)
    core.resume(5000)
    core.tick(5016)
    expect(core.getSnapshot().t).toBeCloseTo(t1 + 0.016)
    expect(core.getSnapshot().activeElapsed).toBeCloseTo(t1 + 0.016)
  })

  it('skip jumps to the end of a countdown but not during breathing; active time unchanged', () => {
    const core = new SessionClockCore(cfg())
    run(core, 0, 500)
    const active = core.getSnapshot().activeElapsed
    core.skip()
    expect(core.getSnapshot().t).toBe(3)
    expect(core.getSnapshot().activeElapsed).toBe(active)
    core.skip() // breathing: ignored
    expect(core.getSnapshot().t).toBe(3)
  })

  it('restart resets t and active time', () => {
    const core = new SessionClockCore(cfg(), { startT: 100 })
    core.pause()
    core.restart(0)
    expect(core.getSnapshot()).toMatchObject({ t: 0, paused: false, activeElapsed: 0 })
  })

  it('reaches done and stops at total', () => {
    const core = new SessionClockCore(cfg({ sets: 1, reps: 1 }), { startT: 9.95 })
    run(core, 0, 400)
    expect(core.getSnapshot()).toMatchObject({ t: 10, done: true })
  })

  it('emits events exactly once, including across skip', () => {
    const core = new SessionClockCore(cfg())
    const seen: string[] = []
    core.onEvent((e) => seen.push(`${e.type}@${e.at}`))
    run(core, 0, 1100)
    core.skip() // t = 3: inhale at 3 must still fire, ticks 2/1 skipped
    run(core, 1100, 1300)
    expect(seen.filter((s) => s === 'countdownTick@0')).toHaveLength(1)
    expect(seen.filter((s) => s === 'countdownTick@1')).toHaveLength(1)
    expect(seen).not.toContain('countdownTick@2')
    expect(seen.filter((s) => s === 'phase@3')).toHaveLength(1)
  })

  describe('background rules', () => {
    it('hidden while breathing: pauses immediately and stays paused on return', () => {
      const core = new SessionClockCore(cfg(), { startT: 20 })
      core.tick(0)
      core.hide(100)
      expect(core.getSnapshot().paused).toBe(true)
      core.show(60_000)
      core.tick(60_016)
      expect(core.getSnapshot()).toMatchObject({ t: 20, paused: true })
    })

    it('hidden in the lead-in: pauses', () => {
      const core = new SessionClockCore(cfg(), { startT: 1 })
      core.hide(0)
      expect(core.getSnapshot().paused).toBe(true)
    })

    it('hidden mid-rest, back before it ends: keeps counting on wall-clock time', () => {
      const core = new SessionClockCore(cfg(), { startT: 80 }) // rest [73,133)
      core.tick(1000)
      core.hide(1000)
      expect(core.getSnapshot().paused).toBe(false)
      core.tick(9000) // rAF would not fire in the background; even if it does, it is ignored
      expect(core.getSnapshot().t).toBe(80)
      core.show(21_000) // 20 s hidden
      const s = core.getSnapshot()
      expect(s.t).toBeCloseTo(100)
      expect(s.paused).toBe(false)
      expect(s.activeElapsed).toBeCloseTo(20)
      // the 0.1 s clamp is back for visible frames
      core.tick(60_000)
      expect(core.getSnapshot().t).toBeCloseTo(100.1)
    })

    it('rest elapses while hidden: holds 3 s before the set, paused', () => {
      const core = new SessionClockCore(cfg(), { startT: 80 })
      core.tick(0)
      core.hide(0)
      core.show(120_000) // 120 s >> 53 s remaining
      const s = core.getSnapshot()
      expect(s.t).toBe(130) // 133 - 3
      expect(s.paused).toBe(true)
      expect(s.done).toBe(false)
      expect(frameAt(cfg(), s.t)).toMatchObject({ kind: 'rest', countNum: 3, set: 1 })
    })

    it('resuming from the hold plays the 3-2-1 countdown into the set', () => {
      const core = new SessionClockCore(cfg(), { startT: 80 })
      const seen: string[] = []
      core.onEvent((e) => seen.push(`${e.type}@${e.at}`))
      core.hide(0)
      core.show(120_000)
      expect(seen).toEqual([])
      core.resume(120_000)
      run(core, 120_000, 123_400)
      expect(seen).toEqual([
        'countdownTick@130',
        'countdownTick@131',
        'countdownTick@132',
        'phase@133',
      ])
    })

    it('exactly-on-the-boundary return also holds rather than auto-starting', () => {
      const core = new SessionClockCore(cfg(), { startT: 73 })
      core.hide(0)
      core.show(60_000)
      expect(core.getSnapshot()).toMatchObject({ t: 130, paused: true })
    })
  })
})
