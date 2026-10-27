/** Seconds -> m:ss (rounds to the nearest second, never negative). */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/** 2.5 -> "2.5s", 1 -> "1s". */
export function formatSeconds(v: number): string {
  return `${Number.isInteger(v) ? v : v.toFixed(1)}s`
}
