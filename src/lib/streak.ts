import type { WorkoutLog } from '../domain/types'
import { addDaysToKey, dateKey } from './dates'

type Dated = Pick<WorkoutLog, 'date'>

/** Distinct logged date keys (several logs on one day count once). */
export function loggedDays(logs: readonly Dated[]): Set<string> {
  return new Set(logs.map((l) => l.date))
}

function run(days: ReadonlySet<string>, startKey: string, step: 1 | -1): number {
  let n = 0
  let k = startKey
  while (days.has(k)) {
    n++
    k = addDaysToKey(k, step)
  }
  return n
}

export type Streaks = {
  /** Counts back from today if logged, otherwise from yesterday. */
  current: number
  /** Longest run of consecutive logged days up to today. */
  best: number
  /** Streak if a workout were logged today: yesterday's run + 1 (or `current` if today is logged). */
  includingToday: number
  doneToday: boolean
}

/** Pure; `today` is the local calendar day. Future-dated logs are ignored. */
export function computeStreaks(logs: readonly Dated[], today: Date): Streaks {
  const todayKey = dateKey(today)
  const days = new Set([...loggedDays(logs)].filter((k) => k <= todayKey))
  const doneToday = days.has(todayKey)
  const fromYesterday = run(days, addDaysToKey(todayKey, -1), -1)
  const current = doneToday ? run(days, todayKey, -1) : fromYesterday
  const includingToday = doneToday ? current : fromYesterday + 1

  let best = 0
  for (const k of days) {
    if (days.has(addDaysToKey(k, -1))) continue // not the start of a run
    best = Math.max(best, run(days, k, 1))
  }
  return { current, best, includingToday, doneToday }
}

export const currentStreak = (logs: readonly Dated[], today: Date) =>
  computeStreaks(logs, today).current
export const bestStreak = (logs: readonly Dated[], today: Date) => computeStreaks(logs, today).best
export const streakIncludingToday = (logs: readonly Dated[], today: Date) =>
  computeStreaks(logs, today).includingToday
