import type { ResolvedMode } from '../theme/tokens'

/**
 * Dev/preview URL params, parsed in one place. Later tasks add their own
 * (e.g. `t` for session clock start, `seed`, `sheet`) by extending DevParams
 * and parseDevParams. These never persist anything.
 *
 *   ?screen=home|setup|session|complete|gallery   initial screen
 *   ?mode=light|dark                              force colour mode (not persisted)
 */
export const SCREENS = ['home', 'setup', 'session', 'complete'] as const
export type Screen = (typeof SCREENS)[number]

export type DevParams = {
  screen?: Screen | 'gallery'
  mode?: ResolvedMode
  /** `?seed=demo` replaces stored logs with fake history (dev only; see seedDemo.ts). */
  seed?: 'demo'
  /** Raw access for params owned by other features. */
  raw: URLSearchParams
}

export function parseDevParams(search: string): DevParams {
  const raw = new URLSearchParams(search)
  const screen = raw.get('screen')
  const mode = raw.get('mode')
  return {
    screen:
      screen === 'gallery'
        ? 'gallery'
        : (SCREENS as readonly string[]).includes(screen ?? '')
          ? (screen as Screen)
          : undefined,
    mode: mode === 'light' || mode === 'dark' ? mode : undefined,
    seed: raw.get('seed') === 'demo' ? 'demo' : undefined,
    raw,
  }
}

/** Number param helper, e.g. numberParam(p, 't'). */
export function numberParam(p: DevParams, name: string): number | undefined {
  const v = p.raw.get(name)
  if (v === null || v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}
