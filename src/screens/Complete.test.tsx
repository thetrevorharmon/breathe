import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import type { SessionResult } from '../domain/types'
import { getLogs, getSettings, setBackend } from '../storage/storage'
import { CompleteScreen } from './Complete'
import { HomeScreen } from './Home'

beforeEach(() => {
  const store = new Map<string, string>()
  setBackend({ get: (k) => store.get(k) ?? null, set: (k, v) => void store.set(k, v) })
})

const result: SessionResult = {
  config: { ...DEFAULT_SETTINGS, dialIn: 3, dialOut: 2 },
  startedAt: new Date().toISOString(),
  durationSec: 333,
}

describe('CompleteScreen', () => {
  it('disables Save until an effort is picked and shows summary', async () => {
    render(<CompleteScreen result={result} onNext={() => {}} />)
    expect(screen.getByText('3 sets × 10 reps · 5:33')).toBeInTheDocument()
    expect(screen.getByText('1-day streak')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByTestId('effort-zone')).toHaveTextContent('Tap a number')
    await userEvent.click(screen.getByLabelText('Effort 8'))
    expect(screen.getByTestId('effort-zone')).toHaveTextContent('In the zone')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('shows "was N" for a changed dial', async () => {
    render(<CompleteScreen result={result} onNext={() => {}} />)
    await userEvent.click(screen.getByLabelText('Increase Inhale dial'))
    expect(screen.getByText('was 3')).toBeVisible()
  })

  it('Save stores a full log, writes dials, and Home shows Done for today', async () => {
    const onNext = vi.fn()
    const { unmount } = render(<CompleteScreen result={result} onNext={onNext} />)
    await userEvent.click(screen.getByLabelText('Increase Inhale dial'))
    await userEvent.click(screen.getByLabelText('Decrease Exhale dial'))
    await userEvent.click(screen.getByLabelText('Effort 9'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onNext).toHaveBeenCalledOnce()
    const [log] = getLogs()
    const c = result.config
    expect(log).toMatchObject({
      sets: c.sets,
      reps: c.reps,
      inhale: c.inhale,
      holdTop: c.holdTop,
      exhale: c.exhale,
      holdBottom: c.holdBottom,
      restSeconds: c.restSeconds,
      startedAt: result.startedAt,
      durationSec: 333,
      dialInStart: 3,
      dialOutStart: 2,
      dialInEnd: 4,
      dialOutEnd: 1,
      effort: 9,
    })
    expect(log.id).toBeTruthy()
    expect(log.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(getSettings()).toMatchObject({ dialIn: 4, dialOut: 1 })
    unmount()
    render(<HomeScreen onNext={() => {}} onOpenSettings={() => {}} />)
    expect(screen.getByText('Done for today')).toBeInTheDocument()
  })
})
