import type { Settings } from '../domain/types'

type WorkoutShape = Pick<
  Settings,
  'sets' | 'reps' | 'inhale' | 'holdTop' | 'exhale' | 'holdBottom' | 'restSeconds'
>

/** Seconds for one breath cycle. */
export const cycleSeconds = (s: WorkoutShape) => s.inhale + s.holdTop + s.exhale + s.holdBottom

/** 3 s lead-in + all reps + rests between sets. */
export function totalSeconds(s: WorkoutShape): number {
  return 3 + s.sets * s.reps * cycleSeconds(s) + (s.sets - 1) * s.restSeconds
}
