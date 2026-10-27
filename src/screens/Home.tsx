import { Check, ChevronLeft, ChevronRight, Flame, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { CalendarGrid } from '../components/CalendarGrid'
import { IconButton } from '../components/IconButton'
import { monthCount } from '../lib/calendar'
import { computeStreaks, loggedDays } from '../lib/streak'
import { useLogs, useSettings } from '../storage/storage'

export function HomeScreen({
  onNext,
  onOpenSettings,
}: {
  onNext: () => void
  onOpenSettings: () => void
}) {
  const [logs] = useLogs()
  const [settings] = useSettings()
  const [monthOffset, setMonthOffset] = useState(0)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const doneKeys = loggedDays(logs)
  const { current, best, doneToday } = computeStreaks(logs, today)

  const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = first.getFullYear()
  const month = first.getMonth()
  const count = monthCount(year, month, doneKeys, today)

  const { sets, reps, inhale, holdTop, exhale, holdBottom, restSeconds } = settings
  const cycle = inhale + holdTop + exhale + holdBottom
  const totalSec = 3 + sets * reps * cycle + (sets - 1) * restSeconds
  const summaryLine = `${sets} sets × ${reps} reps`

  return (
    <section className="flex flex-1 flex-col gap-[22px] px-6 pb-[max(28px,calc(env(safe-area-inset-bottom)+16px))] pt-[max(60px,calc(env(safe-area-inset-top)+16px))]">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-[12px] font-extrabold tracking-[0.16em] text-breath">
            BREATH TRAINING
          </div>
          <h1 className="m-0 text-[28px] font-extrabold">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h1>
        </div>
        <IconButton aria-label="Settings" className="-mr-3 -mt-3" onClick={onOpenSettings}>
          <SettingsIcon size={22} aria-hidden="true" />
        </IconButton>
      </header>

      {doneToday ? (
        <div className="flex items-center gap-4 rounded-card border border-border bg-surface px-[22px] py-5">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-breath text-on-breath">
            <Check size={24} strokeWidth={3} aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="text-[19px] font-extrabold">Done for today</div>
            <div className="text-[14px] text-muted">{summaryLine}</div>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="h-11 rounded-full border border-border bg-transparent px-3.5 text-[14px] font-bold text-text"
          >
            Again
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="flex w-full flex-col gap-[18px] rounded-card border-0 bg-breath px-[22px] py-5 text-left text-on-breath"
        >
          <span className="flex w-full items-center justify-between">
            <span className="text-[12px] font-extrabold tracking-[0.14em]">STRENGTH PROTOCOL</span>
            <span className="text-[13px] font-bold">≈ {Math.ceil(totalSec / 60)} min</span>
          </span>
          <span className="flex w-full items-end justify-between">
            <span className="flex flex-col gap-1.5">
              <span className="text-[30px] font-extrabold leading-[1.05]">Start workout</span>
              <span className="text-[14px] font-bold">{summaryLine}</span>
            </span>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-on-breath">
              <span
                aria-hidden="true"
                className="ml-[5px] h-0 w-0 border-y-[11px] border-l-[17px] border-y-transparent border-l-breath"
              />
            </span>
          </span>
        </button>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-2">
            <Flame
              size={28}
              aria-hidden="true"
              className="mb-1 text-breath"
              fill="currentColor"
              strokeWidth={0}
            />
            <span className="text-[44px] font-extrabold leading-none">{current}</span>
            <span className="pb-[5px] text-[16px] font-bold text-muted">day streak</span>
          </div>
          <div className="pb-1.5 text-[13px] font-semibold text-muted">Best {best}</div>
        </div>

        <div className="flex flex-col gap-1.5 rounded-[20px] border border-border bg-surface px-2.5 pb-3.5 pt-2">
          <div className="flex items-center justify-between">
            <IconButton
              aria-label="Previous month"
              onClick={() => setMonthOffset((o) => o - 1)}
              className="w-11"
            >
              <ChevronLeft size={20} strokeWidth={2.2} aria-hidden="true" />
            </IconButton>
            <div className="text-[16px] font-extrabold">
              {first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <IconButton
              aria-label="Next month"
              onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
              disabled={monthOffset >= 0}
              className="w-11"
            >
              <ChevronRight size={20} strokeWidth={2.2} aria-hidden="true" />
            </IconButton>
          </div>
          <CalendarGrid mode="month" year={year} month={month} doneKeys={doneKeys} today={today} />
          <div className="pt-1 text-center text-[13px] font-semibold text-muted">
            {count} {count === 1 ? 'workout' : 'workouts'} in{' '}
            {first.toLocaleDateString('en-US', { month: 'long' })}
          </div>
        </div>
      </div>
    </section>
  )
}
