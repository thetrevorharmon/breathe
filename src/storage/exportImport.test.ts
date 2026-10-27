import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import type { WorkoutLog } from '../domain/types'
import { buildExport, exportFilename, mergeLogs, parseImport } from './exportImport'
import { getLogs, setBackend, setLogs } from './storage'

const log = (id: string, over: Partial<WorkoutLog> = {}): WorkoutLog => ({
  id,
  date: '2026-03-04',
  startedAt: '2026-03-04T08:00:00.000Z',
  durationSec: 600,
  sets: 3,
  reps: 10,
  inhale: 2.5,
  holdTop: 1,
  exhale: 2.5,
  holdBottom: 1,
  restSeconds: 60,
  dialInStart: 4,
  dialOutStart: 3,
  dialInEnd: 5,
  dialOutEnd: 3,
  effort: 6,
  ...over,
})

const file = (logs: unknown[], over: Record<string, unknown> = {}) =>
  JSON.stringify({ app: 'breathe', schemaVersion: 1, exportedAt: 'x', settings: {}, logs, ...over })

describe('parseImport', () => {
  it('accepts a valid file', () => {
    const r = parseImport(file([log('a'), log('b')]))
    expect(r).toEqual({ ok: true, logs: [log('a'), log('b')] })
  })

  it.each([
    ['not json', 'nope'],
    ['wrong app', file([], { app: 'other' })],
    ['newer schema', file([], { schemaVersion: 99 })],
    ['missing logs', file([], { logs: undefined })],
    ['bad date', file([log('a', { date: '2026-3-4' })])],
    ['impossible date', file([log('a', { date: '2026-02-31' })])],
    ['string number', file([{ ...log('a'), reps: '10' }])],
    ['effort out of range', file([log('a', { effort: 11 })])],
    ['dialIn out of range', file([log('a', { dialInStart: 7 })])],
    ['negative duration', file([log('a', { durationSec: -1 })])],
    ['missing id', file([{ ...log('a'), id: undefined }])],
    ['one bad among good', file([log('a'), { nope: true }])],
  ])('rejects %s', (_n, text) => {
    expect(parseImport(text).ok).toBe(false)
  })
})

describe('mergeLogs', () => {
  it('adds only new ids and is idempotent', () => {
    const first = mergeLogs([log('a')], [log('a'), log('b')])
    expect(first.added).toBe(1)
    expect(first.skipped).toBe(1)
    const second = mergeLogs(first.logs, [log('a'), log('b')])
    expect(second.added).toBe(0)
    expect(second.logs).toEqual(first.logs)
  })

  it('dedupes within the incoming list', () => {
    expect(mergeLogs([], [log('a'), log('a')]).added).toBe(1)
  })
})

describe('round trip', () => {
  beforeEach(() => {
    const data: Record<string, string> = {}
    setBackend({ get: (k) => data[k] ?? null, set: (k, v) => void (data[k] = v) })
  })

  it('export -> clear -> import restores logs', () => {
    setLogs([log('a'), log('b')])
    const text = JSON.stringify(buildExport(DEFAULT_SETTINGS, getLogs()))
    setLogs([])
    const parsed = parseImport(text)
    if (!parsed.ok) throw new Error(parsed.error)
    setLogs(mergeLogs(getLogs(), parsed.logs).logs)
    expect(getLogs()).toEqual([log('a'), log('b')])
  })
})

it('names the file by local date', () => {
  expect(exportFilename(new Date(2026, 0, 5))).toBe('breathe-logs-2026-01-05.json')
})
