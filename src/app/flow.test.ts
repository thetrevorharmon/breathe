import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import { flowReducer, initialFlow } from './flow'
import { parseDevParams } from './devParams'

describe('flowReducer', () => {
  it('walks home -> setup -> session -> complete -> home', () => {
    let s = initialFlow()
    const seen = [s.screen]
    for (let i = 0; i < 4; i++) {
      s = flowReducer(s, { type: 'next' })
      seen.push(s.screen)
    }
    expect(seen).toEqual(['home', 'setup', 'session', 'complete', 'home'])
  })

  it('goto and back', () => {
    expect(flowReducer(initialFlow(), { type: 'goto', screen: 'session' }).screen).toBe('session')
    expect(flowReducer(initialFlow('setup'), { type: 'back' }).screen).toBe('home')
  })
})

describe('finishSession', () => {
  it('moves to complete and keeps the result', () => {
    const result = {
      config: { ...DEFAULT_SETTINGS },
      startedAt: '2026-10-27T10:00:00.000Z',
      durationSec: 333,
    }
    const s = flowReducer(initialFlow('session'), { type: 'finishSession', result })
    expect(s.screen).toBe('complete')
    expect(s.sessionResult).toBe(result)
  })
})

describe('parseDevParams', () => {
  it('parses screen and mode', () => {
    const p = parseDevParams('?screen=setup&mode=dark&t=40')
    expect(p.screen).toBe('setup')
    expect(p.mode).toBe('dark')
    expect(p.raw.get('t')).toBe('40')
    expect(p.t).toBe(40)
    expect(parseDevParams('?paused=1').paused).toBe(true)
  })
  it('ignores invalid values', () => {
    const p = parseDevParams('?screen=nope&mode=blue')
    expect(p.screen).toBeUndefined()
    expect(p.mode).toBeUndefined()
  })
})
