/** Local-date helpers. A "key" is a zero-padded local `YYYY-MM-DD`. Never uses UTC. */

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

export function dateKey(d: Date): string {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parses a key to local midnight. */
export function parseKey(key: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) throw new Error(`Invalid date key: ${key}`)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Adds calendar days (DST-safe: works on the local date, not on 24h blocks). */
export function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

export function addDaysToKey(key: string, n: number): string {
  return dateKey(addDays(parseKey(key), n))
}

/** Local midnight of the Sunday on or before `date`. */
export function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay())
}

/** Whole calendar days from a to b (b - a), DST-safe. */
export function diffDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / 86_400_000)
}
