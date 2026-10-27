import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './app/App'
import { parseDevParams } from './app/devParams'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App dev={parseDevParams(window.location.search)} />
  </StrictMode>,
)
