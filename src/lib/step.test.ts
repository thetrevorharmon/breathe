import { describe, expect, it } from 'vitest'
import { stepValue } from './step'

describe('stepValue', () => {
  it('steps without float drift and clamps', () => {
    expect(stepValue(2.4, 1, 0.5, 10, 0.1)).toBe(2.5)
    expect(stepValue(2.5, 1, 0.5, 10, 0.5)).toBe(3)
    expect(stepValue(10, 1, 0.5, 10, 0.5)).toBe(10)
    expect(stepValue(15, -1, 15, 180, 15)).toBe(15)
  })
})
