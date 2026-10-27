import { describe, expect, it } from 'vitest'
import { themes, getTheme } from './index'
import type { Tokens } from '../tokens'

// Compile-time exhaustive list of token keys: adding a key to Tokens breaks this until updated.
const REQUIRED: Record<keyof Tokens, true> = {
  bgTop: true,
  bgBottom: true,
  text: true,
  muted: true,
  faint: true,
  breath: true,
  onBreath: true,
  rest: true,
  restText: true,
  progress: true,
  onZone: true,
  surface: true,
  border: true,
  subtle: true,
  band: true,
  glow: true,
  trackOuter: true,
  tickOff: true,
  tickOn: true,
  breathTrack: true,
  restTrack: true,
  phaseDotOff: true,
}

describe('theme registry', () => {
  it('has unique ids and the heat theme', () => {
    const ids = themes.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('heat')
  })

  for (const theme of themes) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${theme.id}/${mode} defines every token with a non-empty string`, () => {
        const tokens = theme[mode] as Record<string, unknown>
        for (const key of Object.keys(REQUIRED)) {
          expect(typeof tokens[key], `${theme.id}.${mode}.${key}`).toBe('string')
          expect((tokens[key] as string).length, `${theme.id}.${mode}.${key}`).toBeGreaterThan(0)
        }
        expect(Object.keys(tokens).sort()).toEqual(Object.keys(REQUIRED).sort())
      })
    }
  }

  it('falls back to the default theme for unknown ids', () => {
    expect(getTheme('nope').id).toBe('heat')
  })
})
