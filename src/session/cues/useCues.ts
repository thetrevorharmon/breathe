import { useEffect, useRef } from 'react'
import type { SessionEvent } from '../events'
import { beep, say, silence, type BeepKind } from './audio'

export type Cue = { kind: 'say'; text: string } | { kind: 'beep'; beep: BeepKind }

const PHASE_WORDS: Record<string, string> = {
  inhale: 'Inhale',
  holdTop: 'Hold',
  exhale: 'Exhale',
  holdBottom: 'Hold',
}

/** Pure mapping from a clock event to the cue it should trigger (null = silent). */
export function cueFor(e: SessionEvent): Cue | null {
  switch (e.type) {
    case 'phase': {
      const text = PHASE_WORDS[e.phase]
      return text ? { kind: 'say', text } : null
    }
    case 'restStart':
      return { kind: 'beep', beep: 'rest' }
    case 'countdownTick':
      return { kind: 'beep', beep: e.n === 1 ? 'go' : 'tick' }
  }
}

type Clock = { subscribe: (l: (e: SessionEvent) => void) => () => void }

/** Plays cues for clock events. Mute is read live; muting also cuts speech in flight. */
export function useCues(clock: Clock, muted: boolean): void {
  const mutedRef = useRef(muted)
  useEffect(() => {
    mutedRef.current = muted
    if (muted) silence()
  }, [muted])

  const { subscribe } = clock
  useEffect(() => {
    const off = subscribe((e) => {
      if (mutedRef.current) return
      const cue = cueFor(e)
      if (!cue) return
      if (cue.kind === 'say') say(cue.text)
      else beep(cue.beep)
    })
    return () => {
      off()
      silence()
    }
  }, [subscribe])
}
