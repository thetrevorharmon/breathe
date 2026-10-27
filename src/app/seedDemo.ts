import type { WorkoutLog } from '../domain/types'
import { dateKey } from '../lib/dates'
import { setLogs } from '../storage/storage'

/** Days-ago offsets matching the design reference: many days over ~2 months, never today. */
const OFFSETS = [
  1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15, 17, 18, 19, 21, 22, 24, 25, 26, 28, 29, 31, 32, 33, 35,
  36, 38, 40, 41, 43, 44, 45, 47, 49, 50, 52, 53, 54, 56,
]

export function demoLogs(now = new Date()): WorkoutLog[] {
  return OFFSETS.map((off) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - off, 7, 30)
    return {
      id: `demo-${off}`,
      date: dateKey(d),
      startedAt: d.toISOString(),
      durationSec: 330,
      sets: 3,
      reps: 10,
      inhale: 2.5,
      holdTop: 1,
      exhale: 2.5,
      holdBottom: 1,
      restSeconds: 60,
      dialInStart: 4,
      dialOutStart: 3,
      dialInEnd: 4,
      dialOutEnd: 3,
      effort: 6,
    }
  })
}

/** Dev only: `?seed=demo` replaces stored logs with fake history. */
export function applyDevSeed(seed: string | undefined) {
  if (seed === 'demo') setLogs(demoLogs())
}
