import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const registerServiceWorkerWhenIdle = () => {
  const run = async () => {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2500 })
    return
  }

  window.setTimeout(run, 1200)
}

registerServiceWorkerWhenIdle()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
