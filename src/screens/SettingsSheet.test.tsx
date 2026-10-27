import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildExport } from '../storage/exportImport'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import { getLogs, getSettings, setBackend, setLogs } from '../storage/storage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { SettingsSheet } from './SettingsSheet'

function Harness() {
  const [open, setOpen] = useState(true)
  return (
    <ThemeProvider>
      <SettingsSheet open={open} onOpenChange={setOpen} />
    </ThemeProvider>
  )
}

const log = (id: string) => ({
  id,
  date: '2026-03-04',
  startedAt: '2026-03-04T08:00:00.000Z',
  durationSec: 600,
  sets: 3,
  reps: 10,
  inhale: 2.5,
  holdTop: 1,
  exhale: 2.5,
  holdBottom: 1,
  restSeconds: 60,
  dialInStart: 4,
  dialOutStart: 3,
  dialInEnd: 5,
  dialOutEnd: 3,
  effort: 6,
})

describe('SettingsSheet', () => {
  beforeEach(() => {
    const data: Record<string, string> = {}
    setBackend({ get: (k) => data[k] ?? null, set: (k, v) => void (data[k] = v) })
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
  })

  it('changing mode writes colorMode and applies it', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(getSettings().colorMode).toBe('dark')
    expect(document.documentElement.dataset.mode).toBe('dark')
  })

  it('hides the theme picker with a single theme', () => {
    render(<Harness />)
    expect(screen.queryByText('Theme')).toBeNull()
  })

  it('sound cues switch is the inverse of cuesMuted', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('switch', { name: 'Sound cues' }))
    expect(getSettings().cuesMuted).toBe(true)
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('imports a file, then reports duplicates on a second import', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const text = JSON.stringify(buildExport(DEFAULT_SETTINGS, [log('a'), log('b')]))
    const input = screen.getByTestId('import-input')
    await user.upload(input, new File([text], 'x.json', { type: 'application/json' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Imported 2 workouts, 0 already there.'),
    )
    await user.upload(input, new File([text], 'x.json', { type: 'application/json' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Imported 0 workouts, 2 already there.'),
    )
    expect(getLogs()).toHaveLength(2)
  })

  it('shows an error and changes nothing for an invalid file', async () => {
    const user = userEvent.setup()
    setLogs([log('keep')])
    render(<Harness />)
    await user.upload(screen.getByTestId('import-input'), new File(['garbage'], 'x.json'))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(getLogs()).toEqual([log('keep')])
  })
})
