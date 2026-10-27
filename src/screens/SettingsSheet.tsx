import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { IconButton } from '../components/IconButton'
import { buildExport, downloadExport, mergeLogs, parseImport } from '../storage/exportImport'
import { getLogs, useLogs, useSettings } from '../storage/storage'
import { themes } from '../theme/themes'
import type { ColorMode } from '../theme/tokens'
import type { CueAudio } from '../domain/types'

const MODES: { value: ColorMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const CUE_AUDIO: { value: CueAudio; label: string; hint: string }[] = [
  { value: 'duck', label: 'Lower', hint: 'Music dips while each cue plays.' },
  { value: 'mix', label: 'Mix', hint: 'Cues play over music, but the silent switch mutes them.' },
  { value: 'pause', label: 'Pause', hint: 'Cues always play; other audio stops during the workout.' },
]

const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsText(file)
  })

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Row({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={id} className="text-[16px] font-bold">
        {label}
      </label>
      {children}
    </div>
  )
}

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Switch.Root
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      className="relative h-8 w-[52px] shrink-0 rounded-full border-0 bg-subtle transition-colors data-[state=checked]:bg-breath"
    >
      <Switch.Thumb className="block h-6 w-6 translate-x-1 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-[24px] data-[state=checked]:bg-on-breath" />
    </Switch.Root>
  )
}

const actionBtn =
  'h-11 flex-1 rounded-full border border-border bg-subtle px-4 text-[15px] font-extrabold text-text'

export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [settings, update] = useSettings()
  const [, { replace }] = useLogs()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const onExport = () => {
    const logs = getLogs()
    downloadExport(buildExport(settings, logs))
    setMessage({ kind: 'ok', text: `Exported ${plural(logs.length, 'workout')}.` })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const parsed = parseImport(await readText(file))
    if (!parsed.ok) {
      setMessage({ kind: 'error', text: parsed.error })
      return
    }
    const { logs, added, skipped } = mergeLogs(getLogs(), parsed.logs)
    if (added > 0) replace(logs)
    setMessage({
      kind: 'ok',
      text: `Imported ${plural(added, 'workout')}, ${skipped} already there.`,
    })
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) setMessage(null)
        onOpenChange(o)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement | null)?.focus()
          }}
          style={{
            backgroundImage: 'linear-gradient(var(--surface), var(--surface))',
            outline: 'none',
          }}
          className="rounded-t-card fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] w-full max-w-[430px] overflow-y-auto border border-b-0 border-border bg-bg-bottom px-5 outline-none pt-3 pb-[max(24px,env(safe-area-inset-bottom))] text-text shadow-[0_-12px_40px_rgba(0,0,0,0.25)]"
        >
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-faint" aria-hidden />
          <div className="flex items-center justify-between">
            <Dialog.Title className="m-0 text-[24px] font-extrabold">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton aria-label="Close settings" className="-mr-2">
                <X size={22} />
              </IconButton>
            </Dialog.Close>
          </div>

          <Section title="Appearance">
            <div>
              <div id="mode-label" className="mb-2 text-[16px] font-bold">
                Mode
              </div>
              <ToggleGroup.Root
                type="single"
                aria-labelledby="mode-label"
                value={settings.colorMode}
                onValueChange={(v) => v && update({ colorMode: v as ColorMode })}
                className="grid grid-cols-3 gap-1 rounded-full bg-subtle p-1"
              >
                {MODES.map((m) => (
                  <ToggleGroup.Item
                    key={m.value}
                    value={m.value}
                    className="h-11 rounded-full border-0 bg-transparent text-[15px] font-extrabold text-muted data-[state=on]:bg-breath data-[state=on]:text-on-breath"
                  >
                    {m.label}
                  </ToggleGroup.Item>
                ))}
              </ToggleGroup.Root>
            </div>

            {themes.length > 1 && (
              <div>
                <div id="theme-label" className="mb-2 text-[16px] font-bold">
                  Theme
                </div>
                <ToggleGroup.Root
                  type="single"
                  aria-labelledby="theme-label"
                  value={settings.themeId}
                  onValueChange={(v) => v && update({ themeId: v })}
                  className="flex flex-wrap gap-1 rounded-[22px] bg-subtle p-1"
                >
                  {themes.map((t) => (
                    <ToggleGroup.Item
                      key={t.id}
                      value={t.id}
                      className="h-11 flex-1 rounded-full border-0 bg-transparent px-4 text-[15px] font-extrabold text-muted data-[state=on]:bg-breath data-[state=on]:text-on-breath"
                    >
                      {t.name}
                    </ToggleGroup.Item>
                  ))}
                </ToggleGroup.Root>
              </div>
            )}

            <Row id="ring-breathes" label="Ring breathes">
              <Toggle
                id="ring-breathes"
                checked={settings.ringBreathes}
                onChange={(v) => update({ ringBreathes: v })}
              />
            </Row>
          </Section>

          <Section title="Sound">
            <Row id="sound-cues" label="Sound cues">
              <Toggle
                id="sound-cues"
                checked={!settings.cuesMuted}
                onChange={(v) => update({ cuesMuted: !v })}
              />
            </Row>
            {!settings.cuesMuted && (
              <div>
                <div id="music-label" className="mb-2 text-[16px] font-bold">
                  When music is playing
                </div>
                <ToggleGroup.Root
                  type="single"
                  aria-labelledby="music-label"
                  aria-describedby="music-hint"
                  value={settings.cueAudio}
                  onValueChange={(v) => v && update({ cueAudio: v as CueAudio })}
                  className="grid grid-cols-3 gap-1 rounded-full bg-subtle p-1"
                >
                  {CUE_AUDIO.map((m) => (
                    <ToggleGroup.Item
                      key={m.value}
                      value={m.value}
                      className="h-11 rounded-full border-0 bg-transparent text-[15px] font-extrabold text-muted data-[state=on]:bg-breath data-[state=on]:text-on-breath"
                    >
                      {m.label}
                    </ToggleGroup.Item>
                  ))}
                </ToggleGroup.Root>
                <p id="music-hint" className="mt-2 mb-0 text-[14px] text-muted">
                  {CUE_AUDIO.find((m) => m.value === settings.cueAudio)?.hint}
                </p>
              </div>
            )}
          </Section>

          <Section title="Data">
            <div className="flex gap-3">
              <button type="button" className={actionBtn} onClick={onExport}>
                Export
              </button>
              <button type="button" className={actionBtn} onClick={() => fileRef.current?.click()}>
                Import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                aria-label="Import file"
                data-testid="import-input"
                onChange={(e) => {
                  const input = e.currentTarget
                  void onFile(input.files?.[0]).finally(() => {
                    input.value = ''
                  })
                }}
              />
            </div>
            {message && (
              <p
                role={message.kind === 'error' ? 'alert' : 'status'}
                className={`m-0 text-[14px] font-bold ${message.kind === 'error' ? 'text-progress' : 'text-muted'}`}
              >
                {message.text}
              </p>
            )}
          </Section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
