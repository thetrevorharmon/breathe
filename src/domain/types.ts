import type { ColorMode } from '../theme/tokens'

/** How cues share audio with music on iOS (see session/cues/audio.ts). */
export type CueAudio = 'duck' | 'mix' | 'pause'

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
  /** What happens to other audio (music, podcasts) while cues play. */
  cueAudio: CueAudio
}

/** The part of Settings a session needs. Frozen when the session starts. */
export type SessionConfig = Pick<
  Settings,
  | 'dialIn'
  | 'dialOut'
  | 'sets'
  | 'reps'
  | 'inhale'
  | 'holdTop'
  | 'exhale'
  | 'holdBottom'
  | 'restSeconds'
  | 'ringBreathes'
>

/** Handed from the Session to the Complete screen. */
export type SessionResult = {
  config: SessionConfig
  startedAt: string // ISO
  /** Active time in whole seconds: pauses excluded, skips shorten it. */
  durationSec: number
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
