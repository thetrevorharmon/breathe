export type BeepKind = 'rest' | 'tick' | 'go'

let ctx: AudioContext | null = null

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

function synth(): SpeechSynthesis | null {
  try {
    return typeof speechSynthesis !== 'undefined' ? speechSynthesis : null
  } catch {
    return null
  }
}

/** Call synchronously inside a user gesture (the Start tap) so iOS allows audio later. */
export function unlockAudio(): void {
  try {
    const c = getCtx()
    if (c && c.state !== 'running') void c.resume().catch(() => {})
    const s = synth()
    if (s && typeof SpeechSynthesisUtterance !== 'undefined') {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      s.speak(u)
    }
  } catch {
    /* unsupported: stay silent */
  }
}

const BEEPS: Record<BeepKind, { freq: number; dur: number; type: OscillatorType; gain: number }> = {
  rest: { freq: 523.25, dur: 0.45, type: 'sine', gain: 0.22 },
  tick: { freq: 659.25, dur: 0.14, type: 'triangle', gain: 0.18 },
  go: { freq: 987.77, dur: 0.4, type: 'sine', gain: 0.22 },
}

export function beep(kind: BeepKind): void {
  try {
    const c = getCtx()
    if (!c) return
    if (c.state === 'suspended') void c.resume().catch(() => {})
    const { freq, dur, type, gain } = BEEPS[kind]
    const now = c.currentTime
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(gain, now + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    osc.connect(g)
    g.connect(c.destination)
    osc.start(now)
    osc.stop(now + dur + 0.02)
  } catch {
    /* ignore */
  }
}

export function say(text: string): void {
  try {
    const s = synth()
    if (!s || typeof SpeechSynthesisUtterance === 'undefined') return
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1
    u.lang = 'en-US'
    const voice = s.getVoices?.().find((v) => v.lang?.toLowerCase().startsWith('en'))
    if (voice) u.voice = voice
    s.speak(u)
  } catch {
    /* ignore */
  }
}

/** Stop any queued speech (e.g. when muting or leaving the session). */
export function silence(): void {
  try {
    synth()?.cancel()
  } catch {
    /* ignore */
  }
}
