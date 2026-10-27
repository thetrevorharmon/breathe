import { monthGrid, weekGrid, type CalendarCell, type GridCell } from '../lib/calendar'
import { dateKey } from '../lib/dates'

type Common = {
  /** Local `YYYY-MM-DD` keys that have at least one workout. */
  doneKeys: ReadonlySet<string>
  today: Date
  /** Extra days to draw as done without touching the data (e.g. the Complete screen). */
  extraDoneKeys?: readonly string[]
  /** Shorthand for adding today's key to `extraDoneKeys`. */
  assumeTodayDone?: boolean
}

export type CalendarGridProps =
  (Common & { mode: 'month'; year: number; month: number }) | (Common & { mode: 'week' })

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Month (Sunday-start grid) or week strip with streak bands behind the day circles. */
export function CalendarGrid(props: CalendarGridProps) {
  const { doneKeys, today, extraDoneKeys, assumeTodayDone } = props
  const todayKey = dateKey(today)
  let keys: ReadonlySet<string> = doneKeys
  if (extraDoneKeys?.length || assumeTodayDone) {
    keys = new Set([...doneKeys, ...(extraDoneKeys ?? []), ...(assumeTodayDone ? [todayKey] : [])])
  }
  // Cells are built from the widened key set so bands account for the extras.
  const cells: GridCell[] =
    props.mode === 'month' ? monthGrid(props.year, props.month, keys, today) : weekGrid(keys, today)

  return (
    <div role="grid" aria-label={props.mode === 'month' ? 'Month calendar' : 'This week'}>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted" role="row">
        {WEEKDAYS.map((d, i) => (
          <div key={i} role="columnheader">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-y-1">
        {cells.map((c, i) => (
          <Cell key={i} cell={c} />
        ))}
      </div>
    </div>
  )
}

function Cell({ cell }: { cell: GridCell }) {
  if (!cell) return <div className="h-[38px]" role="gridcell" aria-hidden="true" />
  const { state, isToday } = cell
  const base =
    'relative flex h-[34px] w-[34px] items-center justify-center rounded-full text-[14px]'
  const look =
    state === 'done'
      ? 'bg-breath font-extrabold text-on-breath'
      : state === 'today'
        ? 'font-extrabold text-text'
        : state === 'future'
          ? 'font-medium text-faint'
          : 'font-semibold text-muted'
  const style =
    state === 'done' && isToday
      ? { boxShadow: '0 0 0 2px var(--bg-top), 0 0 0 4px var(--breath)' }
      : state === 'today'
        ? { boxShadow: 'inset 0 0 0 2px var(--breath)' }
        : undefined
  return (
    <div
      role="gridcell"
      aria-label={labelFor(cell)}
      className="relative flex h-[38px] items-center justify-center"
    >
      {(cell.bandLeft || cell.bandRight) && (
        <div
          data-band
          className="absolute bottom-[3px] top-[3px] bg-band"
          style={{ left: cell.bandLeft ? 0 : '50%', right: cell.bandRight ? 0 : '50%' }}
        />
      )}
      <div className={`${base} ${look}`} style={style}>
        {cell.day}
      </div>
    </div>
  )
}

function labelFor(c: CalendarCell) {
  const d = c.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return `${d}${c.state === 'done' ? ', workout done' : ''}${c.isToday ? ', today' : ''}`
}
