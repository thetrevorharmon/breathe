import type { SessionResult } from '../domain/types'
import { SCREENS, type Screen } from './devParams'

export type { Screen }

export type FlowState = { screen: Screen; sessionResult?: SessionResult }

export type FlowAction =
  | { type: 'goto'; screen: Screen }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'finishSession'; result: SessionResult }

/** home -> setup -> session -> complete -> home. `back` goes one step toward home (setup/session -> home). */
export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'goto':
      return { ...state, screen: action.screen }
    case 'next':
      return { ...state, screen: SCREENS[(SCREENS.indexOf(state.screen) + 1) % SCREENS.length] }
    case 'back':
      return { ...state, screen: 'home' }
    case 'finishSession':
      return { ...state, screen: 'complete', sessionResult: action.result }
  }
}

export const initialFlow = (screen: Screen = 'home'): FlowState => ({ screen })
