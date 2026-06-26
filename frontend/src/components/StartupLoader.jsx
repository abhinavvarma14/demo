import { useEffect, useState } from "react"
import { API_BASE_URL } from "../api/api"

const SHOW_LOADER_AFTER_MS = 220
const HEALTH_RETRY_MS = 1200
const nodes = Array.from({ length: 10 }, (_, index) => index)

function StartupLoader() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    let retryTimeout
    let activeController

    const revealTimeout = window.setTimeout(() => {
      if (!cancelled) setVisible(true)
    }, SHOW_LOADER_AFTER_MS)

    const checkBackend = async () => {
      if (cancelled) return

      activeController = new AbortController()

      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          cache: "no-store",
          signal: activeController.signal,
        })

        if (!response.ok) throw new Error("Backend health check failed")
        if (cancelled) return

        window.clearTimeout(revealTimeout)
        setVisible(false)
      } catch (error) {
        if (cancelled || error.name === "AbortError") return
        retryTimeout = window.setTimeout(checkBackend, HEALTH_RETRY_MS)
      }
    }

    checkBackend()

    return () => {
      cancelled = true
      window.clearTimeout(revealTimeout)
      window.clearTimeout(retryTimeout)
      activeController?.abort()
    }
  }, [])

  if (!visible) return null

  return (
    <section className="flow-loader" aria-label="BatPrint startup animation">
      <div className="flow-backdrop" />
      <div className="flow-noise" />
      <div className="flow-grid" />

      <div className="flow-panels" aria-hidden="true">
        <span className="flow-panel flow-panel-a" />
        <span className="flow-panel flow-panel-b" />
        <span className="flow-panel flow-panel-c" />
      </div>

      <svg className="flow-lines" viewBox="0 0 1440 810" fill="none" aria-hidden="true">
        <path className="flow-stroke flow-stroke-a" d="M165 548C332 450 527 425 714 472C893 517 1042 501 1275 382" />
        <path className="flow-stroke flow-stroke-b" d="M220 328C399 286 598 308 787 382C962 451 1114 426 1280 305" />
        <path className="flow-stroke flow-stroke-c" d="M236 644C430 572 626 570 817 624C988 672 1126 652 1265 570" />
        <path className="flow-stroke flow-stroke-d" d="M416 249H1024C1084 249 1132 297 1132 357V453" />
        <path className="flow-stroke flow-stroke-e" d="M1024 661H416C356 661 308 613 308 553V457" />
      </svg>

      <div className="flow-core" aria-hidden="true">
        <div className="flow-ring flow-ring-a" />
        <div className="flow-ring flow-ring-b" />
        <div className="flow-ring flow-ring-c" />
        <div className="flow-pulse" />
        <div className="flow-nodes">
          {nodes.map((node) => (
            <span key={node} style={{ "--node": node }} />
          ))}
        </div>
      </div>

      <div className="flow-sweep" aria-hidden="true" />
    </section>
  )
}

export default StartupLoader
