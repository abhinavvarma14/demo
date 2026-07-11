import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { API_BASE_URL } from "../api/api"

const SHOW_LOADER_AFTER_MS = 320
const REQUEST_TIMEOUT_MS = 1200
const HEALTH_RETRY_MS = 1500
const readinessPaths = ["/health", "/"]

function IntroParticles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext("2d")
    if (!ctx) return undefined

    let frameId = 0
    let width = window.innerWidth
    let height = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const particleCount = window.matchMedia("(max-width: 768px)").matches ? 72 : 120

    const setSize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const resetParticle = (particle = {}) => {
      particle.x = Math.random() * width
      particle.y = Math.random() * height
      particle.radius = Math.random() * 2 + 0.8
      particle.speed = Math.random() * 0.35 + 0.15
      particle.alpha = Math.random() * 0.6 + 0.2
      particle.color = Math.random() > 0.35 ? "#FFD54A" : "#ffffff"
      return particle
    }

    const updateParticle = (particle) => {
      particle.y -= particle.speed
      if (particle.y < 0) {
        particle.y = height + 10
        particle.x = Math.random() * width
      }
    }

    const drawParticle = (particle) => {
      ctx.beginPath()
      ctx.globalAlpha = particle.alpha
      ctx.fillStyle = particle.color
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    setSize()
    const particles = Array.from({ length: particleCount }, () => resetParticle())

    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      for (const particle of particles) {
        updateParticle(particle)
        drawParticle(particle)
      }
      frameId = window.requestAnimationFrame(animate)
    }

    const handleResize = () => {
      setSize()
      for (const particle of particles) resetParticle(particle)
    }
    window.addEventListener("resize", handleResize, { passive: true })
    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="particleCanvas" aria-hidden="true" />
}

function StartupLoader() {
  const [visible, setVisible] = useState(false)
  const cancelledRef = useRef(false)
  const retryRef = useRef(null)
  const revealRef = useRef(null)
  const controllerRef = useRef(null)

  useEffect(() => {
    cancelledRef.current = false

    const clearTimers = () => {
      window.clearTimeout(retryRef.current)
      window.clearTimeout(revealRef.current)
    }

    const probe = async (path) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        return response.status < 500
      } finally {
        window.clearTimeout(timeout)
      }
    }

    const checkBackend = async () => {
      if (cancelledRef.current || document.hidden) return

      try {
        for (const path of readinessPaths) {
          if (await probe(path)) {
            clearTimers()
            if (!cancelledRef.current) setVisible(false)
            return
          }
        }
      } catch {
        if (cancelledRef.current) return
      }

      if (!cancelledRef.current) {
        retryRef.current = window.setTimeout(checkBackend, HEALTH_RETRY_MS)
      }
    }

    revealRef.current = window.setTimeout(() => {
      if (!cancelledRef.current) setVisible(true)
    }, SHOW_LOADER_AFTER_MS)

    const handleVisibility = () => {
      if (!document.hidden) checkBackend()
    }

    document.addEventListener("visibilitychange", handleVisibility)
    checkBackend()

    return () => {
      cancelledRef.current = true
      clearTimers()
      controllerRef.current?.abort()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          className="batprint-intro-shell"
          aria-label="BatPrint startup animation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="intro">
            <IntroParticles />
            <motion.div
              className="lightSweep"
              initial={{ x: -900, opacity: 0 }}
              animate={{ x: 1600, opacity: [0, 0.9, 0.9, 0] }}
              transition={{ delay: 1.1, duration: 1.25, ease: "easeInOut" }}
            />
            <motion.div
              className="logo-wrapper"
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <img src="/bat-logo.png" alt="BatPrint" className="bat-logo" />
            </motion.div>
            <motion.div
              className="brandWrapper"
              initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}
              animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
              transition={{ delay: 1.75, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="brandTitle">BATPRINT</h1>
            </motion.div>
            <motion.div
              className="taglineWrapper"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 0.8, ease: "easeOut" }}
            >
              <div className="taglineLine" />
              <p className="tagline">Print. Bind. Deliver.</p>
            </motion.div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

export default StartupLoader

