import { Volume2, VolumeX, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { IconButton } from '../components/IconButton'
import { PrimaryButton } from '../components/PrimaryButton'
import { SessionRing } from '../components/ring/SessionRing'
import type { SessionConfig, SessionResult } from '../domain/types'
import { useCues } from '../session/cues/useCues'
import { frameAt } from '../session/frame'
import { useSessionClock } from '../session/useSessionClock'
import { useWakeLock } from '../session/useWakeLock'
import { useSettings } from '../storage/storage'

/** m:ss, floored (the header clock counts whole elapsed seconds). */
const clock = (s: number) => {
  const n = Math.floor(s)
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

type Props = {
  /** × (after confirmation): back Home, nothing logged. */
  onExit: () => void
  onFinish: (result: SessionResult) => void
  /** Dev affordances from the URL: `t=<seconds>` and `paused=1`. */
  devStart?: { t?: number; paused?: boolean }
}

export function SessionScreen({ onExit, onFinish, devStart }: Props) {
  const [settings, updateSettings] = useSettings()
  // Frozen when the session is entered.
  const [config] = useState<SessionConfig>(() => ({
    dialIn: settings.dialIn,
    dialOut: settings.dialOut,
    sets: settings.sets,
    reps: settings.reps,
    inhale: settings.inhale,
    holdTop: settings.holdTop,
    exhale: settings.exhale,
    holdBottom: settings.holdBottom,
    restSeconds: settings.restSeconds,
    ringBreathes: settings.ringBreathes,
  }))
  const clockState = useSessionClock(config, { startT: devStart?.t, paused: devStart?.paused })
  const frame = frameAt(config, clockState.t)
  useCues(clockState, settings.cuesMuted)
  useWakeLock(!clockState.done)

  const [confirm, setConfirm] = useState<'exit' | 'restart' | null>(null)
  const pausedByDialog = useRef(false)

  const ask = (kind: 'exit' | 'restart') => {
    pausedByDialog.current = !clockState.paused && !clockState.done
    if (pausedByDialog.current) clockState.pause()
    setConfirm(kind)
  }
  const cancel = () => {
    if (pausedByDialog.current) clockState.resume()
    pausedByDialog.current = false
    setConfirm(null)
  }
  const accept = () => {
    const kind = confirm
    pausedByDialog.current = false
    setConfirm(null)
    if (kind === 'exit') onExit()
    else clockState.restart()
  }

  const finish = () =>
    onFinish({
      config,
      startedAt: clockState.startedAt.toISOString(),
      durationSec: Math.round(clockState.activeElapsed),
    })

  return (
    <section className="flex flex-1 flex-col items-center px-6 pb-[max(44px,calc(env(safe-area-inset-bottom)+16px))] pt-[max(56px,calc(env(safe-area-inset-top)+12px))]">
      <header className="flex h-11 w-full items-center justify-between">
        <div className="flex items-center gap-1">
          <IconButton aria-label="End workout" className="-ml-3" onClick={() => ask('exit')}>
            <X size={24} strokeWidth={2} />
          </IconButton>
          <div className="text-[17px] font-bold">Strength Protocol</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="text-[14px] font-semibold text-muted">
            {clock(frame.t)} <span className="text-faint">/ {clock(frame.total)}</span>
          </div>
          <IconButton
            aria-label={settings.cuesMuted ? 'Unmute cues' : 'Mute cues'}
            aria-pressed={settings.cuesMuted}
            className="-mr-3 text-muted"
            onClick={() => updateSettings({ cuesMuted: !settings.cuesMuted })}
          >
            {settings.cuesMuted ? (
              <VolumeX size={22} strokeWidth={2} />
            ) : (
              <Volume2 size={22} strokeWidth={2} />
            )}
          </IconButton>
        </div>
      </header>

      <div className="mt-[72px]">
        <SessionRing frame={frame} />
      </div>

      <div className="mt-10 flex flex-col items-center gap-1.5">
        <div className="text-[18px] font-bold">{frame.statusMain}</div>
        <div className="text-[14px] text-muted">{frame.statusSub}</div>
      </div>

      <div className="mt-auto flex w-full items-center justify-center gap-7">
        {frame.done ? (
          <PrimaryButton onClick={finish}>Continue</PrimaryButton>
        ) : (
          <>
            <button
              type="button"
              onClick={() => ask('restart')}
              className="h-11 min-w-20 border-0 bg-transparent text-[15px] font-semibold text-muted"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={clockState.toggle}
              aria-label={clockState.paused ? 'Resume' : 'Pause'}
              className="flex size-[68px] items-center justify-center rounded-full border-0 bg-breath"
            >
              {clockState.paused ? (
                <span
                  aria-hidden="true"
                  className="ml-[5px] h-0 w-0 border-y-[12px] border-l-[19px] border-y-transparent border-l-on-breath"
                />
              ) : (
                <span aria-hidden="true" className="flex gap-1.5">
                  <span className="h-[22px] w-1.5 rounded-xs bg-on-breath" />
                  <span className="h-[22px] w-1.5 rounded-xs bg-on-breath" />
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={clockState.skip}
              disabled={!frame.canSkip}
              className={`h-11 min-w-20 border-0 bg-transparent text-[15px] font-bold text-rest-text ${frame.canSkip ? '' : 'invisible'}`}
            >
              Skip
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'exit' ? 'End workout?' : 'Restart workout?'}
        description={
          confirm === 'exit'
            ? 'Your progress will be lost and nothing will be logged.'
            : 'Your progress so far will be lost and the session starts again from the beginning.'
        }
        confirmLabel={confirm === 'exit' ? 'End workout' : 'Restart'}
        onConfirm={accept}
        onCancel={cancel}
      />
    </section>
  )
}
