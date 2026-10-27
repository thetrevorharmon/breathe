import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import { getSettings, KEYS, setBackend, updateSettings } from '../storage/storage'
import { SetupScreen } from './Setup'

const unlock = vi.hoisted(() => vi.fn())
vi.mock('../session/cues/unlockAudio', () => ({ unlockAudio: unlock }))

let store: Map<string, string>
beforeEach(() => {
  store = new Map()
  setBackend({ get: (k) => store.get(k) ?? null, set: (k, v) => void store.set(k, v) })
  unlock.mockClear()
})

const dec = (l: string) => screen.getByLabelText(`Decrease ${l}`)
const inc = (l: string) => screen.getByLabelText(`Increase ${l}`)

describe('SetupScreen', () => {
  it('shows default total 5:33', () => {
    render(<SetupScreen onNext={() => {}} />)
    expect(screen.getByTestId('total-time')).toHaveTextContent('5:33')
  })

  it('disables buttons at bounds', () => {
    updateSettings({ sets: 1, restSeconds: 15, reps: 30 })
    const { unmount } = render(<SetupScreen onNext={() => {}} />)
    expect(dec('Sets')).toBeDisabled()
    expect(dec('Rest between sets')).toBeDisabled()
    expect(inc('Reps per set')).toBeDisabled()
    unmount()
    updateSettings({ sets: 6, restSeconds: 180, dialIn: 6, dialOut: 1 })
    render(<SetupScreen onNext={() => {}} />)
    expect(inc('Sets')).toBeDisabled()
    expect(inc('Rest between sets')).toBeDisabled()
    expect(inc('Inhale dial')).toBeDisabled()
    expect(dec('Exhale dial')).toBeDisabled()
  })

  it('steps by 0.5 s and 15 s, updates total and persists', async () => {
    render(<SetupScreen onNext={() => {}} />)
    await userEvent.click(inc('Inhale'))
    expect(screen.getByText('3s')).toBeInTheDocument()
    expect(getSettings().inhale).toBe(3)
    // C 7 -> 7.5: 3 + 3*10*7.5 + 120 = 348
    expect(screen.getByTestId('total-time')).toHaveTextContent('5:48')
    await userEvent.click(inc('Rest between sets'))
    expect(getSettings().restSeconds).toBe(75)
    expect(JSON.parse(store.get(KEYS.settings)!).restSeconds).toBe(75)
  })

  it('Start unlocks audio and advances', async () => {
    const onNext = vi.fn()
    render(<SetupScreen onNext={onNext} />)
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(unlock).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
    expect(getSettings().sets).toBe(DEFAULT_SETTINGS.sets)
  })
})
