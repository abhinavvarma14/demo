import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const registerServiceWorkerWhenIdle = () => {
  const run = async () => {
    const { registerSW } = await import('virtual:pwa-register')
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW(true)
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return
        window.setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      },
    })
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
