import { addDays, dateKey, startOfWeek } from './dates'

export type CellState = 'done' | 'today' | 'future' | 'past'

export type CalendarCell = {
  date: Date
  key: string
  day: number
  /** `done` also applies to today when it is logged; check `isToday` for the ring. */
  state: CellState
  isToday: boolean
  /** Band joins this day to the previous / next day in the same week row. */
  bandLeft: boolean
  bandRight: boolean
}

/** A null entry is padding outside the month (Sunday-start grid). */
export type GridCell = CalendarCell | null

/**
 * Builds cells for rows of 7 (Sunday first). `dates` may contain nulls.
 * Bands only join neighbours within the same row, never across row ends.
 */
export function buildCells(
  dates: readonly (Date | null)[],
  doneKeys: ReadonlySet<string>,
  today: Date,
): GridCell[] {
  const todayKey = dateKey(today)
  const info = dates.map((d) => {
    if (!d) return null
    const key = dateKey(d)
    return { d, key, done: doneKeys.has(key) && key <= todayKey }
  })
  return info.map((c, i) => {
    if (!c) return null
    const col = i % 7
    const isToday = c.key === todayKey
    const prev = col > 0 ? info[i - 1] : null
    const next = col < 6 ? info[i + 1] : null
    const state: CellState = c.done
      ? 'done'
      : isToday
        ? 'today'
        : c.key > todayKey
          ? 'future'
          : 'past'
    return {
      date: c.d,
      key: c.key,
      day: c.d.getDate(),
      state,
      isToday,
      bandLeft: c.done && !!prev?.done,
      bandRight: c.done && !!next?.done,
    }
  })
}

/** Month grid for `year` / zero-based `month`, padded with nulls to whole weeks. */
export function monthGrid(
  year: number,
  month: number,
  doneKeys: ReadonlySet<string>,
  today: Date,
): GridCell[] {
  const first = new Date(year, month, 1)
  const daysIn = new Date(year, month + 1, 0).getDate()
  const dates: (Date | null)[] = Array.from({ length: first.getDay() }, () => null)
  for (let d = 1; d <= daysIn; d++) dates.push(new Date(year, month, d))
  while (dates.length % 7 !== 0) dates.push(null)
  return buildCells(dates, doneKeys, today)
}

/** The 7 days (Sun-Sat) of the week containing `today`. */
export function weekGrid(doneKeys: ReadonlySet<string>, today: Date): CalendarCell[] {
  const start = startOfWeek(today)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return buildCells(dates, doneKeys, today) as CalendarCell[]
}

/** Number of done days within a month. */
export function monthCount(
  year: number,
  month: number,
  doneKeys: ReadonlySet<string>,
  today: Date,
) {
  return monthGrid(year, month, doneKeys, today).filter((c) => c?.state === 'done').length
}
