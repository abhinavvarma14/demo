import { useEffect, useState } from "react"
import { API_BASE_URL } from "../api/api"

const SHOW_LOADER_AFTER_MS = 220
const HEALTH_RETRY_MS = 1200
const STARTUP_DEBUG_KEY = "debugStartup"
const readinessPaths = ["/health", "/"]
const nodes = Array.from({ length: 10 }, (_, index) => index)

const shouldDebugStartup = () =>
  typeof window !== "undefined" &&
  (window.location.search.includes(STARTUP_DEBUG_KEY) || localStorage.getItem(STARTUP_DEBUG_KEY) === "1")

const logStartup = (...args) => {
  if (shouldDebugStartup()) console.info("[startup]", ...args)
}

function StartupLoader() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    let retryTimeout
    let activeController

    logStartup("mounted", { apiBaseUrl: API_BASE_URL })

    const revealTimeout = window.setTimeout(() => {
      if (!cancelled) {
        logStartup("showing intro because backend is still waking")
        setVisible(true)
      }
    }, SHOW_LOADER_AFTER_MS)

    const checkBackend = async () => {
      if (cancelled) return

      activeController = new AbortController()

      try {
        let ready = false
        let lastStatus = "not-started"

        for (const path of readinessPaths) {
          const response = await fetch(`${API_BASE_URL}${path}`, {
            cache: "no-store",
            signal: activeController.signal,
          })

          lastStatus = `${path} -> ${response.status}`
          logStartup("readiness probe", lastStatus)

          if (response.ok) {
            ready = true
            break
          }
        }

        if (!ready) throw new Error(`Backend readiness failed: ${lastStatus}`)
        if (cancelled) return

        window.clearTimeout(revealTimeout)
        logStartup("backend ready, hiding intro")
        setVisible(false)
      } catch (error) {
        if (cancelled || error.name === "AbortError") return
        logStartup("backend not ready, retrying", error.message)
        retryTimeout = window.setTimeout(checkBackend, HEALTH_RETRY_MS)
      }
    }

    checkBackend()

    return () => {
      cancelled = true
      window.clearTimeout(revealTimeout)
      window.clearTimeout(retryTimeout)
      activeController?.abort()
      logStartup("unmounted")
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

