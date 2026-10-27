/** Moves `value` one `step` up/down, clamped to [min, max], free of float drift (2.5 + 0.5 = 3). */
export function stepValue(
  value: number,
  dir: 1 | -1,
  min: number,
  max: number,
  step: number,
): number {
  const decimals = (String(step).split('.')[1] ?? '').length
  const next = Number((value + dir * step).toFixed(decimals))
  return Math.min(max, Math.max(min, next))
}
