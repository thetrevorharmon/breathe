import { describe, expect, it } from 'vitest'
import { addDaysToKey } from './dates'
import { bestStreak, computeStreaks, currentStreak, streakIncludingToday } from './streak'

const L = (...dates: string[]) => dates.map((date) => ({ date }))
const runOf = (start: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDaysToKey(start, i))

describe('streaks', () => {
  const today = new Date(2026, 9, 27)

  it('empty', () => {
    expect(computeStreaks([], today)).toEqual({
      current: 0,
      best: 0,
      includingToday: 1,
      doneToday: false,
    })
  })
  it('counts through today when logged', () => {
    const s = computeStreaks(L('2026-10-25', '2026-10-26', '2026-10-27'), today)
    expect(s).toMatchObject({ current: 3, best: 3, includingToday: 3, doneToday: true })
  })
  it('today not logged: counts from yesterday', () => {
    const s = computeStreaks(L('2026-10-25', '2026-10-26'), today)
    expect(s).toMatchObject({ current: 2, includingToday: 3, doneToday: false })
  })
  it('streak broken when yesterday missing', () => {
    const s = computeStreaks(L('2026-10-20', '2026-10-21', '2026-10-25'), today)
    expect(s.current).toBe(0)
    expect(s.best).toBe(2)
    expect(s.includingToday).toBe(1)
  })
  it('several logs on one day count once', () => {
    const s = computeStreaks(L('2026-10-26', '2026-10-26', '2026-10-27', '2026-10-27'), today)
    expect(s.current).toBe(2)
    expect(s.best).toBe(2)
  })
  it('crosses month and year boundaries', () => {
    const t = new Date(2027, 0, 2)
    expect(
      computeStreaks(L('2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'), t).current,
    ).toBe(4)
    expect(currentStreak(L('2026-02-27', '2026-02-28', '2026-03-01'), new Date(2026, 2, 1))).toBe(3)
  })
  it('leap day', () => {
    expect(currentStreak(L('2028-02-28', '2028-02-29', '2028-03-01'), new Date(2028, 2, 1))).toBe(3)
  })
  it('best may be an older run', () => {
    const logs = L(...runOf('2026-08-01', 10), '2026-10-27')
    expect(bestStreak(logs, today)).toBe(10)
    expect(currentStreak(logs, today)).toBe(1)
  })
  it('ignores future logs', () => {
    const s = computeStreaks(L('2026-10-27', '2026-10-28', '2026-10-29'), today)
    expect(s.current).toBe(1)
    expect(s.best).toBe(1)
  })
  it('DST transitions do not break runs', () => {
    // US spring forward 2026-03-08, fall back 2026-11-01
    expect(currentStreak(L(...runOf('2026-03-06', 5)), new Date(2026, 2, 10))).toBe(5)
    expect(bestStreak(L(...runOf('2026-10-30', 5)), new Date(2026, 10, 3))).toBe(5)
  })
  it('streakIncludingToday', () => {
    expect(streakIncludingToday(L('2026-10-26'), today)).toBe(2)
    expect(streakIncludingToday(L('2026-10-26', '2026-10-27'), today)).toBe(2)
    expect(streakIncludingToday([], today)).toBe(1)
  })
})
