import { ChevronLeft } from 'lucide-react'
import { useEffect } from 'react'
import { DialTile } from '../components/DialTile'
import { IconButton } from '../components/IconButton'
import { PrimaryButton } from '../components/PrimaryButton'
import { Stepper } from '../components/Stepper'
import { formatSeconds, formatTime } from '../lib/format'
import { totalSeconds } from '../lib/workout'
import { preloadCues, unlockAudio } from '../session/cues/unlockAudio'
import { useSettings } from '../storage/storage'

const rowClass = 'h-14 border-b border-border'

export function SetupScreen({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  const [s, set] = useSettings()
  useEffect(preloadCues, [])

  const start = () => {
    unlockAudio(s.cueAudio)
    onNext()
  }

  return (
    <section className="flex h-dvh flex-col">
      <header className="flex items-center px-3 pb-1.5 pt-[max(52px,calc(env(safe-area-inset-top)+8px))]">
        <IconButton aria-label="Back" onClick={onBack} disabled={!onBack}>
          <ChevronLeft size={22} strokeWidth={2.4} aria-hidden />
        </IconButton>
        <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold">Workout setup</h1>
        <div className="w-11" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto px-6 pb-5 pt-2.5">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-0.5">
            <div className="text-[12px] font-extrabold tracking-[0.14em] text-breath">
              SET YOUR DIALS
            </div>
            <div className="text-[14px] text-muted">
              Match the dials on your device before you start.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DialTile
              label="Inhale dial"
              value={s.dialIn}
              min={1}
              max={6}
              onChange={(v) => set({ dialIn: v })}
            />
            <DialTile
              label="Exhale dial"
              value={s.dialOut}
              min={1}
              max={5}
              onChange={(v) => set({ dialOut: v })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="pb-1 text-[12px] font-extrabold tracking-[0.14em] text-muted">
            WORKOUT
          </div>
          <Stepper
            className={rowClass}
            label="Sets"
            value={s.sets}
            min={1}
            max={6}
            onChange={(v) => set({ sets: v })}
          />
          <Stepper
            className={rowClass}
            label="Reps per set"
            value={s.reps}
            min={1}
            max={30}
            onChange={(v) => set({ reps: v })}
          />
          <Stepper
            className={rowClass}
            label="Inhale"
            hint="Breathe in hard"
            value={s.inhale}
            min={0.5}
            max={10}
            step={0.5}
            format={formatSeconds}
            onChange={(v) => set({ inhale: v })}
          />
          <Stepper
            className={rowClass}
            label="Hold"
            hint="At the top"
            value={s.holdTop}
            min={0}
            max={10}
            step={0.5}
            format={formatSeconds}
            onChange={(v) => set({ holdTop: v })}
          />
          <Stepper
            className={rowClass}
            label="Exhale"
            hint="Breathe out hard"
            value={s.exhale}
            min={0.5}
            max={10}
            step={0.5}
            format={formatSeconds}
            onChange={(v) => set({ exhale: v })}
          />
          <Stepper
            className={rowClass}
            label="Hold"
            hint="At the bottom"
            value={s.holdBottom}
            min={0}
            max={10}
            step={0.5}
            format={formatSeconds}
            onChange={(v) => set({ holdBottom: v })}
          />
          <Stepper
            className={rowClass}
            label="Rest between sets"
            value={s.restSeconds}
            min={15}
            max={180}
            step={15}
            format={formatSeconds}
            onChange={(v) => set({ restSeconds: v })}
          />
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-border px-6 pb-[max(34px,calc(env(safe-area-inset-bottom)+12px))] pt-3.5">
        <div className="flex justify-between text-[14px]">
          <span className="font-semibold text-muted">Total time</span>
          <span className="font-extrabold" data-testid="total-time">
            {formatTime(totalSeconds(s))}
          </span>
        </div>
        <PrimaryButton onClick={start}>Start</PrimaryButton>
      </footer>
    </section>
  )
}
