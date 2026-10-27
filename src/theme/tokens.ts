/**
 * Every colour a component may use. Components never compute colours: derived
 * values (ring tracks, ticks, glow...) are part of the theme data.
 * Keys map to CSS variables via `tokenVarName` (bgTop -> --bg-top).
 */
export type Tokens = {
  /** Page gradient, top and bottom stops. */
  bgTop: string
  bgBottom: string
  text: string
  muted: string
  faint: string
  /** Primary accent. */
  breath: string
  /** Text/icons drawn on a breath-coloured fill. */
  onBreath: string
  /** Countdown / rest accent (fills, rings). */
  rest: string
  /** Rest accent used for text (may be darker for contrast). */
  restText: string
  /** Session progress and "too much" zone. */
  progress: string
  /** Text drawn on a filled zone colour. */
  onZone: string
  surface: string
  border: string
  /** Subtle button background. */
  subtle: string
  /** Streak band behind calendar circles. */
  band: string
  // Derived values
  /** box-shadow for the outer-ring indicator dot. */
  glow: string
  /** Outer ring track. */
  trackOuter: string
  /** Rep tick not yet passed / passed. */
  tickOff: string
  tickOn: string
  /** Inner ring track while breathing / counting down. */
  breathTrack: string
  restTrack: string
  /** Phase dot not yet passed. */
  phaseDotOff: string
}

export type TokenKey = keyof Tokens

export type Theme = {
  id: string
  name: string
  light: Tokens
  dark: Tokens
}

export type ColorMode = 'system' | 'light' | 'dark'
export type ResolvedMode = 'light' | 'dark'

/** bgTop -> bg-top */
export const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

export const tokenVarName = (key: TokenKey) => `--${kebab(key)}`

/** '#FF5533' + 0.24 -> 'rgba(255,85,51,0.24)'. Used by theme data files only. */
export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
