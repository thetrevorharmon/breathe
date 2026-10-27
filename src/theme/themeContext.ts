import { createContext, useContext } from 'react'
import {
  tokenVarName,
  type ColorMode,
  type ResolvedMode,
  type Theme,
  type TokenKey,
  type Tokens,
} from './tokens'

export function resolveMode(mode: ColorMode, systemDark: boolean): ResolvedMode {
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
}

/** Writes every token as a CSS variable on `root` and sets data-mode / color-scheme. */
export function applyTokens(
  root: HTMLElement,
  tokens: Tokens,
  mode: ResolvedMode,
  themeId: string,
) {
  for (const key of Object.keys(tokens) as TokenKey[]) {
    root.style.setProperty(tokenVarName(key), tokens[key])
  }
  root.dataset.mode = mode
  root.dataset.theme = themeId
  root.style.colorScheme = mode
}

export type ThemeContextValue = { theme: Theme; mode: ResolvedMode; tokens: Tokens }
export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
