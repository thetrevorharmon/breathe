import { describe, expect, it } from 'vitest'
import { addDays, addDaysToKey, dateKey, diffDays, parseKey, startOfWeek } from './dates'
import { formatTime } from './format'

describe('dates', () => {
  it('zero-pads keys using local fields', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(dateKey(new Date(2026, 9, 27, 0, 0))).toBe('2026-10-27')
  })

  it('round-trips parseKey', () => {
    const d = parseKey('2026-03-08')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 8, 0])
    expect(dateKey(d)).toBe('2026-03-08')
    expect(() => parseKey('2026-3-8')).toThrow()
  })

  it('adds days across month and year boundaries', () => {
    expect(addDaysToKey('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDaysToKey('2028-02-28', 1)).toBe('2028-02-29')
  })

  // US spring-forward is 2026-03-08, fall-back 2026-11-01. These hold in any TZ:
  // addDays works on calendar fields so a 23h/25h day never skips or repeats a key.
  it('is stable across DST changes', () => {
    const keys: string[] = []
    let d = parseKey('2026-03-06')
    for (let i = 0; i < 6; i++) {
      keys.push(dateKey(d))
      d = addDays(d, 1)
    }
    expect(keys).toEqual([
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
    ])
    expect(addDaysToKey('2026-10-31', 2)).toBe('2026-11-02')
    expect(addDaysToKey('2026-11-02', -2)).toBe('2026-10-31')
    expect(diffDays(parseKey('2026-03-07'), parseKey('2026-03-09'))).toBe(2)
    expect(diffDays(parseKey('2026-10-31'), parseKey('2026-11-02'))).toBe(2)
  })

  it('startOfWeek returns the Sunday', () => {
    expect(dateKey(startOfWeek(parseKey('2026-10-27')))).toBe('2026-10-25') // Tue
    expect(dateKey(startOfWeek(parseKey('2026-10-25')))).toBe('2026-10-25') // Sun
    expect(dateKey(startOfWeek(parseKey('2026-03-10')))).toBe('2026-03-08') // across DST day
    expect(dateKey(startOfWeek(parseKey('2026-01-01')))).toBe('2025-12-28')
  })
})

describe('formatTime', () => {
  it('formats m:ss', () => {
    expect(formatTime(333)).toBe('5:33')
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(59.6)).toBe('1:00')
    expect(formatTime(-3)).toBe('0:00')
  })
})
