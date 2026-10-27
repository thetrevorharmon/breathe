import { useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { useSettings } from '../storage/storage'
import { getTheme } from './themes'
import { ThemeContext, applyTokens, resolveMode } from './themeContext'
import type { ResolvedMode } from './tokens'

const QUERY = '(prefers-color-scheme: dark)'

function subscribeSystem(cb: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const systemIsDark = () => window.matchMedia(QUERY).matches

/**
 * Resolves themeId + colorMode from settings ('system' follows prefers-color-scheme live).
 * `forcedMode` (dev ?mode= param) overrides colorMode without persisting.
 */
export function ThemeProvider({
  forcedMode,
  children,
}: {
  forcedMode?: ResolvedMode
  children: ReactNode
}) {
  const [settings] = useSettings()
  const systemDark = useSyncExternalStore(subscribeSystem, systemIsDark, () => false)
  const mode = forcedMode ?? resolveMode(settings.colorMode, systemDark)
  const theme = getTheme(settings.themeId)
  const tokens = theme[mode]

  useLayoutEffect(() => {
    applyTokens(document.documentElement, tokens, mode, theme.id)
  }, [tokens, mode, theme.id])

  const value = useMemo(() => ({ theme, mode, tokens }), [theme, mode, tokens])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
