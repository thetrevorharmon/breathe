import type { CueAudio } from '../../domain/types'
import exhaleUrl from './sounds/exhale.mp3'
import goUrl from './sounds/go.mp3'
import holdBottomUrl from './sounds/hold-bottom.mp3'
import holdTopUrl from './sounds/hold-top.mp3'
import inhaleUrl from './sounds/inhale.mp3'
import restUrl from './sounds/rest.mp3'
import tickUrl from './sounds/tick.mp3'

/** Recorded voice cues (Trevor's voice) and generated beeps, embedded as files. */
export type Clip = 'inhale' | 'holdTop' | 'exhale' | 'holdBottom' | 'rest' | 'tick' | 'go'

const CLIP_URLS: Record<Clip, string> = {
  inhale: inhaleUrl,
  holdTop: holdTopUrl,
  exhale: exhaleUrl,
  holdBottom: holdBottomUrl,
  rest: restUrl,
  tick: tickUrl,
  go: goUrl,
}

/**
 * iOS audio session per setting. Web Audio defaults to "ambient", which the
 * silent switch mutes.
 * - duck: "transient" plays over other audio and lowers it while a cue plays.
 * - mix: "ambient" plays over music at full volume, but follows the silent switch.
 * - pause: "playback" is always audible but takes over (pauses) other audio.
 * Only Safari supports this API; elsewhere it's a no-op.
 */
const SESSION_TYPE: Record<CueAudio, string> = {
  duck: 'transient',
  mix: 'ambient',
  pause: 'playback',
}

let ctx: AudioContext | null = null
const buffers = new Map<Clip, AudioBuffer>()
let loading: Promise<void> | null = null
let voice: AudioBufferSourceNode | null = null

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  try {
    const w = globalThis as unknown as {
      AudioContext?: typeof AudioContext
      webkitAudioContext?: typeof AudioContext
    }
    const Ctor = w.AudioContext ?? w.webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  } catch {
    ctx = null
  }
  return ctx
}

export function setAudioSession(mode: CueAudio | 'auto'): void {
  try {
    const nav = navigator as unknown as { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = mode === 'auto' ? 'auto' : SESSION_TYPE[mode]
  } catch {
    /* unsupported */
  }
}

function loadClips(c: AudioContext): Promise<void> {
  if (loading) return loading
  loading = Promise.all(
    (Object.keys(CLIP_URLS) as Clip[]).map(async (clip) => {
      try {
        const res = await fetch(CLIP_URLS[clip])
        const data = await res.arrayBuffer()
        buffers.set(clip, await c.decodeAudioData(data))
      } catch {
        /* missing clip: that cue stays silent */
      }
    }),
  ).then(() => {})
  return loading
}

/** Fetch and decode every clip ahead of time (no gesture needed), e.g. when Setup opens. */
export function preloadCues(): void {
  try {
    const c = getCtx()
    if (c) void loadClips(c)
  } catch {
    /* unsupported */
  }
}

/**
 * Call synchronously inside a user gesture (the Start tap) so iOS allows audio,
 * then decode the clips in the background.
 */
export function unlockAudio(mode?: CueAudio): void {
  try {
    if (mode) setAudioSession(mode)
    const c = getCtx()
    if (!c) return
    if (c.state !== 'running') void c.resume().catch(() => {})
    // A silent one-sample buffer fully unlocks output on older iOS.
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination)
    src.start(0)
    void loadClips(c)
  } catch {
    /* unsupported: stay silent */
  }
}

const VOICE: ReadonlySet<Clip> = new Set(['inhale', 'holdTop', 'exhale', 'holdBottom'])

export function play(clip: Clip): void {
  try {
    const c = getCtx()
    if (!c) return
    if (c.state === 'suspended') void c.resume().catch(() => {})
    const buf = buffers.get(clip)
    if (!buf) {
      void loadClips(c)
      return
    }
    // A new spoken word cuts off the previous one; beeps can overlap.
    if (VOICE.has(clip)) stopVoice()
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start()
    if (VOICE.has(clip)) {
      voice = src
      src.onended = () => {
        if (voice === src) voice = null
      }
    }
  } catch {
    /* ignore */
  }
}

function stopVoice(): void {
  try {
    voice?.stop()
  } catch {
    /* already stopped */
  }
  voice = null
}

/** Stop the word in flight (e.g. when muting or leaving the session). */
export function silence(): void {
  stopVoice()
}
