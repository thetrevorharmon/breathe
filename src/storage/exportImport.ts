import type { Settings, WorkoutLog } from '../domain/types'

export const EXPORT_SCHEMA_VERSION = 1

export type ExportFile = {
  app: 'breathe'
  schemaVersion: number
  exportedAt: string
  settings: Settings
  logs: WorkoutLog[]
}

export function buildExport(settings: Settings, logs: WorkoutLog[], now = new Date()): ExportFile {
  return {
    app: 'breathe',
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    settings,
    logs,
  }
}

export type ParseResult = { ok: true; logs: WorkoutLog[] } | { ok: false; error: string }

const isObj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x)

function num(r: Record<string, unknown>, key: string, min: number, max: number): number | null {
  const v = r[key]
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null
}

function validDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/** Returns a clean WorkoutLog (unknown keys dropped) or null if anything is out of range. */
export function validateLog(x: unknown): WorkoutLog | null {
  if (!isObj(x)) return null
  if (typeof x.id !== 'string' || x.id === '') return null
  if (!validDate(x.date)) return null
  if (typeof x.startedAt !== 'string' || Number.isNaN(Date.parse(x.startedAt))) return null
  const f = {
    durationSec: num(x, 'durationSec', 0, 86400),
    sets: num(x, 'sets', 1, 100),
    reps: num(x, 'reps', 1, 1000),
    inhale: num(x, 'inhale', 0, 60),
    holdTop: num(x, 'holdTop', 0, 60),
    exhale: num(x, 'exhale', 0, 60),
    holdBottom: num(x, 'holdBottom', 0, 60),
    restSeconds: num(x, 'restSeconds', 0, 3600),
    dialInStart: num(x, 'dialInStart', 1, 6),
    dialOutStart: num(x, 'dialOutStart', 1, 5),
    dialInEnd: num(x, 'dialInEnd', 1, 6),
    dialOutEnd: num(x, 'dialOutEnd', 1, 5),
    effort: num(x, 'effort', 1, 10),
  }
  if (Object.values(f).some((v) => v === null)) return null
  return {
    id: x.id,
    date: x.date,
    startedAt: x.startedAt,
    ...(f as Record<string, number>),
  } as WorkoutLog
}

/** Strict: a single bad log rejects the whole file. Settings in the file are ignored. */
export function parseImport(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  if (!isObj(data) || data.app !== 'breathe')
    return { ok: false, error: 'That file is not a Breathe export.' }
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > EXPORT_SCHEMA_VERSION)
    return { ok: false, error: 'That export is from a newer version of Breathe.' }
  if (!Array.isArray(data.logs)) return { ok: false, error: 'The file has no workout list.' }
  const logs: WorkoutLog[] = []
  for (let i = 0; i < data.logs.length; i++) {
    const log = validateLog(data.logs[i])
    if (!log) return { ok: false, error: `Workout ${i + 1} in the file is invalid.` }
    logs.push(log)
  }
  return { ok: true, logs }
}

/** Adds incoming logs whose id is not already present. Existing logs are never changed. */
export function mergeLogs(
  existing: WorkoutLog[],
  incoming: WorkoutLog[],
): { logs: WorkoutLog[]; added: number; skipped: number } {
  const seen = new Set(existing.map((l) => l.id))
  const fresh: WorkoutLog[] = []
  for (const l of incoming) {
    if (seen.has(l.id)) continue
    seen.add(l.id)
    fresh.push(l)
  }
  return {
    logs: fresh.length ? [...existing, ...fresh] : existing,
    added: fresh.length,
    skipped: incoming.length - fresh.length,
  }
}

export function exportFilename(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `breathe-logs-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`
}

export function downloadExport(file: ExportFile, name = exportFilename()) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
