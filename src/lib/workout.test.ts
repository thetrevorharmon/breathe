import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import { formatTime } from './format'
import { totalSeconds } from './workout'

describe('totalSeconds', () => {
  it('defaults give 334 s (5:34)', () => {
    expect(totalSeconds(DEFAULT_SETTINGS)).toBe(334)
    expect(formatTime(totalSeconds(DEFAULT_SETTINGS))).toBe('5:34')
  })
  it('single set has no rest', () => {
    expect(totalSeconds({ ...DEFAULT_SETTINGS, sets: 1, reps: 1 })).toBe(11)
  })
})
