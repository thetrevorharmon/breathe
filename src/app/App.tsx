import { useReducer, useState } from 'react'
import { CompleteScreen } from '../screens/Complete'
import { Gallery } from '../screens/Gallery'
import { HomeScreen } from '../screens/Home'
import { SessionScreen } from '../screens/Session'
import { SetupScreen } from '../screens/Setup'
import { ThemeProvider } from '../theme/ThemeProvider'
import type { DevParams } from './devParams'
import { flowReducer, initialFlow } from './flow'
import { PhoneColumn } from './PhoneColumn'

export function App({ dev }: { dev: DevParams }) {
  const [flow, dispatch] = useReducer(flowReducer, undefined, () =>
    initialFlow(dev.screen === 'gallery' ? 'home' : dev.screen),
  )
  // T6 renders the settings sheet from this state.
  const [, setSettingsOpen] = useState(false)
  const next = () => dispatch({ type: 'next' })

  return (
    <ThemeProvider forcedMode={dev.mode}>
      <PhoneColumn>
        {dev.screen === 'gallery' ? (
          <Gallery />
        ) : (
          <>
            {flow.screen === 'home' && (
              <HomeScreen onNext={next} onOpenSettings={() => setSettingsOpen(true)} />
            )}
            {flow.screen === 'setup' && (
              <SetupScreen onNext={next} onBack={() => dispatch({ type: 'back' })} />
            )}
            {flow.screen === 'session' && <SessionScreen onNext={next} />}
            {flow.screen === 'complete' && <CompleteScreen onNext={next} />}
          </>
        )}
      </PhoneColumn>
    </ThemeProvider>
  )
}
