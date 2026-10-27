import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setBackend, updateSettings } from '../storage/storage'
import { ThemeProvider } from './ThemeProvider'
import { resolveMode } from './themeContext'
import { heat } from './themes/heat'

function mockMatchMedia(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: dark,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    const data: Record<string, string> = {}
    setBackend({ get: (k) => data[k] ?? null, set: (k, v) => void (data[k] = v) })
  })

  it('resolves modes', () => {
    expect(resolveMode('system', true)).toBe('dark')
    expect(resolveMode('system', false)).toBe('light')
    expect(resolveMode('light', true)).toBe('light')
  })

  it('writes css variables for the system mode', () => {
    mockMatchMedia(true)
    render(<ThemeProvider>x</ThemeProvider>)
    const root = document.documentElement
    expect(root.dataset.mode).toBe('dark')
    expect(root.style.getPropertyValue('--breath')).toBe(heat.dark.breath)
    expect(root.style.getPropertyValue('--bg-top')).toBe(heat.dark.bgTop)
  })

  it('settings override system, forcedMode overrides settings', () => {
    mockMatchMedia(true)
    updateSettings({ colorMode: 'light' })
    const { unmount } = render(<ThemeProvider>x</ThemeProvider>)
    expect(document.documentElement.dataset.mode).toBe('light')
    unmount()
    render(<ThemeProvider forcedMode="dark">x</ThemeProvider>)
    expect(document.documentElement.dataset.mode).toBe('dark')
  })
})
