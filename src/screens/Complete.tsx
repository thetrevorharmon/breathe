import { Check, Flame } from 'lucide-react'
import { useState } from 'react'
import { CalendarGrid } from '../components/CalendarGrid'
import { DialTile } from '../components/DialTile'
import { PrimaryButton } from '../components/PrimaryButton'
import type { SessionConfig, SessionResult, WorkoutLog } from '../domain/types'
import { dateKey } from '../lib/dates'
import { formatTime } from '../lib/format'
import { computeStreaks, loggedDays } from '../lib/streak'
import { totalSeconds } from '../lib/workout'
import { useLogs, useSettings } from '../storage/storage'

const zoneOf = (n: number) =>
  n >= 9
    ? { label: 'Too much', text: 'text-progress', bg: 'bg-progress', border: 'border-progress' }
    : n >= 7
      ? { label: 'In the zone', text: 'text-breath', bg: 'bg-breath', border: 'border-breath' }
      : { label: 'Easy', text: 'text-rest-text', bg: 'bg-rest', border: 'border-rest' }

export function CompleteScreen({ result, onNext }: { result?: SessionResult; onNext: () => void }) {
  const [settings, updateSettings] = useSettings()
  const [logs, { add }] = useLogs()
  // Fall back to current settings when opened directly (e.g. ?screen=complete).
  const [res] = useState<SessionResult>(
    () =>
      result ?? {
        config: settings satisfies SessionConfig,
        startedAt: new Date().toISOString(),
        durationSec: totalSeconds(settings),
      },
  )
  const cfg = res.config
  const [effort, setEffort] = useState(0)
  const [dialIn, setDialIn] = useState(cfg.dialIn)
  const [dialOut, setDialOut] = useState(cfg.dialOut)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const { includingToday } = computeStreaks(logs, today)

  const save = () => {
    if (!effort) return
    const log: WorkoutLog = {
      id: crypto.randomUUID(),
      date: dateKey(new Date(res.startedAt)),
      startedAt: res.startedAt,
      durationSec: res.durationSec,
      sets: cfg.sets,
      reps: cfg.reps,
      inhale: cfg.inhale,
      holdTop: cfg.holdTop,
      exhale: cfg.exhale,
      holdBottom: cfg.holdBottom,
      restSeconds: cfg.restSeconds,
      dialInStart: cfg.dialIn,
      dialOutStart: cfg.dialOut,
      dialInEnd: dialIn,
      dialOutEnd: dialOut,
      effort,
    }
    add(log)
    updateSettings({ dialIn, dialOut })
    onNext()
  }

  const zone = effort ? zoneOf(effort) : null

  return (
    <section className="flex flex-1 flex-col gap-[18px] px-6 pb-[max(32px,calc(env(safe-area-inset-bottom)+16px))] pt-[max(56px,calc(env(safe-area-inset-top)+12px))]">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-breath text-on-breath">
          <Check size={30} strokeWidth={3.4} aria-hidden="true" />
        </div>
        <h1 className="m-0 text-[28px] font-extrabold">Workout complete</h1>
        <div className="text-[14px] font-semibold text-muted">
          {cfg.sets} sets × {cfg.reps} reps · {formatTime(res.durationSec)}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface px-2.5 pb-3 pt-3.5">
        <div className="flex items-center gap-1.5 px-1.5">
          <Flame
            size={18}
            aria-hidden="true"
            className="text-breath"
            fill="currentColor"
            strokeWidth={0}
          />
          <span className="text-[17px] font-extrabold">{includingToday}-day streak</span>
        </div>
        <CalendarGrid mode="week" doneKeys={loggedDays(logs)} today={today} assumeTodayDone />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <div className="text-[12px] font-extrabold tracking-[0.14em] text-muted">
            HOW HARD WAS IT?
          </div>
          <div
            data-testid="effort-zone"
            className={`text-[14px] font-extrabold ${zone ? zone.text : 'text-muted'}`}
          >
            {zone ? zone.label : 'Tap a number'}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const z = zoneOf(n)
            const sel = n === effort
            return (
              <button
                key={n}
                type="button"
                aria-label={`Effort ${n}`}
                aria-pressed={sel}
                onClick={() => setEffort(n)}
                className={`h-12 rounded-xl border-[1.5px] text-[17px] font-extrabold ${
                  sel ? `${z.bg} ${z.border} text-on-zone` : `border-border bg-surface ${z.text}`
                }`}
              >
                {n}
              </button>
            )
          })}
        </div>
        <div className="flex justify-between text-[12px] font-semibold text-muted">
          <Legend dot="bg-rest">1–6 Easy</Legend>
          <Legend dot="bg-breath">7–8 In the zone</Legend>
          <Legend dot="bg-progress">9–10 Too much</Legend>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[12px] font-extrabold tracking-[0.14em] text-muted">
            DIALS YOU FINISHED ON
          </div>
          <div className="text-[13px] text-muted">Adjust if you changed them mid-workout.</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DialTile
            label="Inhale dial"
            value={dialIn}
            onChange={setDialIn}
            min={1}
            max={6}
            changedFrom={cfg.dialIn}
          />
          <DialTile
            label="Exhale dial"
            value={dialOut}
            onChange={setDialOut}
            min={1}
            max={5}
            changedFrom={cfg.dialOut}
          />
        </div>
      </div>

      <div className="mt-auto pt-1">
        <PrimaryButton disabled={!effort} onClick={save}>
          Save
        </PrimaryButton>
      </div>
    </section>
  )
}

function Legend({ dot, children }: { dot: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {children}
    </span>
  )
}
