import type { ColorMode } from '../theme/tokens'

export type Settings = {
  dialIn: number // 1–6
  dialOut: number // 1–5
  sets: number
  reps: number
  inhale: number // s
  holdTop: number // s
  exhale: number // s
  holdBottom: number // s
  restSeconds: number
  ringBreathes: boolean
  themeId: string
  colorMode: ColorMode
  /** Silences spoken and tone cues during a session. */
  cuesMuted: boolean
}

export type WorkoutLog = {
  id: string
  date: string // local YYYY-MM-DD
  startedAt: string // ISO
  durationSec: number
  sets: number
  reps: number
  inhale: number
  holdTop: number
  exhale: number
  holdBottom: number
  restSeconds: number
  dialInStart: number
  dialOutStart: number
  dialInEnd: number
  dialOutEnd: number
  effort: number // 1–10, required
}
