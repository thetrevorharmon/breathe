import { useEffect, useRef } from 'react'
import type { CueAudio } from '../../domain/types'
import type { SessionEvent } from '../events'
import { play, setAudioSession, silence, type Clip } from './audio'

export type Cue = { clip: Clip }

const PHASE_CLIPS: Record<string, Clip> = {
  inhale: 'inhale',
  holdTop: 'holdTop',
  exhale: 'exhale',
  holdBottom: 'holdBottom',
}

/** Pure mapping from a clock event to the cue it should trigger (null = silent). */
export function cueFor(e: SessionEvent): Cue | null {
  switch (e.type) {
    case 'phase': {
      const clip = PHASE_CLIPS[e.phase]
      return clip ? { clip } : null
    }
    case 'restStart':
      return { clip: 'rest' }
    case 'countdownTick':
      return { clip: e.n === 1 ? 'go' : 'tick' }
  }
}

type Clock = { subscribe: (l: (e: SessionEvent) => void) => () => void }

/**
 * Plays cues for clock events. Mute is read live; muting also cuts the word in
 * flight. `cueAudio` sets how cues share audio with music while the session is open.
 */
export function useCues(clock: Clock, muted: boolean, cueAudio: CueAudio = 'duck'): void {
  const mutedRef = useRef(muted)
  useEffect(() => {
    mutedRef.current = muted
    if (muted) silence()
  }, [muted])

  useEffect(() => {
    setAudioSession(cueAudio)
  }, [cueAudio])
  useEffect(() => () => setAudioSession('auto'), [])

  const { subscribe } = clock
  useEffect(() => {
    const off = subscribe((e) => {
      if (mutedRef.current) return
      const cue = cueFor(e)
      if (cue) play(cue.clip)
    })
    return () => {
      off()
      silence()
    }
  }, [subscribe])
}
