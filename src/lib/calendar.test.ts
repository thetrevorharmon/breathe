import { describe, expect, it } from 'vitest'
import { monthCount, monthGrid, weekGrid } from './calendar'

const today = new Date(2026, 9, 27) // Tue Oct 27 2026
const keys = (...k: string[]) => new Set(k)

describe('monthGrid', () => {
  it('is Sunday-start, padded with nulls to whole weeks', () => {
    const g = monthGrid(2026, 9, keys(), today) // Oct 1 2026 is a Thursday
    expect(g.length % 7).toBe(0)
    expect(g.slice(0, 4).every((c) => c === null)).toBe(true)
    expect(g[4]?.day).toBe(1)
    expect(g.filter(Boolean)).toHaveLength(31)
  })
  it('handles a month starting on Sunday and ending on Saturday', () => {
    const g = monthGrid(2026, 1, keys(), today) // Feb 2026
    expect(g).toHaveLength(28)
    expect(g.every(Boolean)).toBe(true)
  })
  it('assigns states', () => {
    const g = monthGrid(2026, 9, keys('2026-10-26'), today)
    const by = (d: number) => g.find((c) => c?.day === d)!
    expect(by(26).state).toBe('done')
    expect(by(27).state).toBe('today')
    expect(by(27).isToday).toBe(true)
    expect(by(28).state).toBe('future')
    expect(by(10).state).toBe('past')
  })
  it('done and today', () => {
    const c = monthGrid(2026, 9, keys('2026-10-27'), today).find((x) => x?.day === 27)!
    expect(c.state).toBe('done')
    expect(c.isToday).toBe(true)
  })
  it('joins bands only within a week row', () => {
    // Sat Oct 3 and Sun Oct 4 are adjacent days but in different rows.
    const g = monthGrid(2026, 9, keys('2026-10-03', '2026-10-04', '2026-10-05'), today)
    const by = (d: number) => g.find((c) => c?.day === d)!
    expect(by(3)).toMatchObject({ bandLeft: false, bandRight: false })
    expect(by(4)).toMatchObject({ bandLeft: false, bandRight: true })
    expect(by(5)).toMatchObject({ bandLeft: true, bandRight: false })
  })
  it('does not band to padding or undone days', () => {
    const g = monthGrid(2026, 9, keys('2026-10-01', '2026-10-02'), today)
    const by = (d: number) => g.find((c) => c?.day === d)!
    expect(by(1)).toMatchObject({ bandLeft: false, bandRight: true })
    expect(by(2)).toMatchObject({ bandLeft: true, bandRight: false })
  })
  it('ignores future logs as done', () => {
    const c = monthGrid(2026, 9, keys('2026-10-29'), today).find((x) => x?.day === 29)!
    expect(c.state).toBe('future')
  })
  it('works across a DST change month', () => {
    const g = monthGrid(2026, 10, keys(), new Date(2026, 10, 15)) // Nov 2026
    expect(g.filter(Boolean)).toHaveLength(30)
    expect(g.find((c) => c?.day === 1)!.date.getDay()).toBe(0)
  })
})

describe('weekGrid / monthCount', () => {
  it('returns Sun-Sat containing today, across month and year boundaries', () => {
    expect(weekGrid(keys(), new Date(2026, 10, 3)).map((c) => c.day)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(weekGrid(keys(), new Date(2026, 11, 31)).map((c) => c.day)).toEqual([
      27, 28, 29, 30, 31, 1, 2,
    ])
  })
  it('done keys give bands in the week', () => {
    const w = weekGrid(keys('2026-10-26', '2026-10-27'), today)
    expect(w[1]).toMatchObject({ state: 'done', bandRight: true })
    expect(w[2]).toMatchObject({ state: 'done', isToday: true, bandLeft: true })
  })
  it('counts the month', () => {
    expect(monthCount(2026, 9, keys('2026-10-01', '2026-10-02', '2026-09-30'), today)).toBe(2)
  })
})
