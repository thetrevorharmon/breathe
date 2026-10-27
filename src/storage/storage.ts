import { useCallback, useSyncExternalStore } from 'react'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import type { Settings, WorkoutLog } from '../domain/types'

/**
 * Versioned localStorage persistence behind a tiny interface.
 * To swap the backend, call `setBackend()` with anything implementing `Backend`.
 * Bump the `v1` in KEYS when the stored shape changes incompatibly.
 */
export interface Backend {
  get(key: string): string | null
  set(key: string, value: string): void
}

export const KEYS = {
  settings: 'breathe:v1:settings',
  logs: 'breathe:v1:logs',
} as const

const memory = new Map<string, string>()
const localStorageBackend: Backend = {
  get(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      memory.set(key, value)
    }
  },
}

let backend: Backend = localStorageBackend
const listeners = new Set<() => void>()
const cache = new Map<string, { raw: string | null; value: unknown }>()

export function setBackend(b: Backend) {
  backend = b
  cache.clear()
  emit()
}

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || Object.values(KEYS).includes(e.key as never)) emit()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Parses once per distinct raw string so snapshots are referentially stable. */
function read<T>(key: string, parse: (raw: string | null) => T): T {
  const raw = backend.get(key)
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.value as T
  const value = parse(raw)
  cache.set(key, { raw, value })
  return value
}

function write(key: string, value: unknown) {
  backend.set(key, JSON.stringify(value))
  emit()
}

// ---- parsing ----

function safeJson(raw: string | null): unknown {
  if (raw === null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function parseSettings(raw: string | null): Settings {
  const data = safeJson(raw)
  const out: Settings = { ...DEFAULT_SETTINGS }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (typeof rec[k] === typeof DEFAULT_SETTINGS[k] && rec[k] !== null) {
        ;(out as Record<string, unknown>)[k] = rec[k]
      }
    }
    if (!['system', 'light', 'dark'].includes(out.colorMode))
      out.colorMode = DEFAULT_SETTINGS.colorMode
  }
  return out
}

export function isWorkoutLog(x: unknown): x is WorkoutLog {
  if (!x || typeof x !== 'object') return false
  const r = x as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    typeof r.durationSec === 'number'
  )
}

export function parseLogs(raw: string | null): WorkoutLog[] {
  const data = safeJson(raw)
  return Array.isArray(data) ? data.filter(isWorkoutLog) : []
}

// ---- API ----

export const getSettings = (): Settings => read(KEYS.settings, parseSettings)
export const getLogs = (): WorkoutLog[] => read(KEYS.logs, parseLogs)

export function updateSettings(patch: Partial<Settings>) {
  write(KEYS.settings, { ...getSettings(), ...patch })
}

export function setLogs(logs: WorkoutLog[]) {
  write(KEYS.logs, logs)
}

export function addLog(log: WorkoutLog) {
  setLogs([...getLogs(), log])
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(subscribe, getSettings, getSettings)
  return [settings, updateSettings]
}

export function useLogs(): [
  WorkoutLog[],
  { add: (log: WorkoutLog) => void; replace: (logs: WorkoutLog[]) => void },
] {
  const logs = useSyncExternalStore(subscribe, getLogs, getLogs)
  const add = useCallback((log: WorkoutLog) => addLog(log), [])
  const replace = useCallback((l: WorkoutLog[]) => setLogs(l), [])
  return [logs, { add, replace }]
}
