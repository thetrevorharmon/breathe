import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import { formatTime } from './format'
import { totalSeconds } from './workout'

describe('totalSeconds', () => {
  it('defaults give 333 s (5:33)', () => {
    expect(totalSeconds(DEFAULT_SETTINGS)).toBe(333)
    expect(formatTime(totalSeconds(DEFAULT_SETTINGS))).toBe('5:33')
  })
  it('single set has no rest', () => {
    expect(totalSeconds({ ...DEFAULT_SETTINGS, sets: 1, reps: 1 })).toBe(10)
  })
})
