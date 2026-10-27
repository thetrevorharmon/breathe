import type { Theme } from '../tokens'
import { heat } from './heat'

/** To add a theme: create a file exporting a `Theme` and add it to this list. */
export const themes: Theme[] = [heat]

export const DEFAULT_THEME_ID = 'heat'

export function getTheme(id: string): Theme {
  return (
    themes.find((t) => t.id === id) ?? themes.find((t) => t.id === DEFAULT_THEME_ID) ?? themes[0]
  )
}
