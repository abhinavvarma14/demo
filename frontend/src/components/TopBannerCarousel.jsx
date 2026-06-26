import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import API, { API_BASE_URL } from "../api/api"

const AUTO_SLIDE_DELAY = 6500
const IDLE_RESUME_DELAY = 4200
const SWIPE_CONFIDENCE = 9000

const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

const resolveBannerImage = (image) => {
  if (!image) return ""
  if (/^https?:\/\//i.test(image)) {
    return image
  }
  return `${API_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`
}

function TopBannerCarousel() {
  const [banners, setBanners] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const mobileView = isMobileDevice()
  const rootRef = useRef(null)
  const slideTimerRef = useRef(null)
  const resumeTimerRef = useRef(null)
  const dragMovedRef = useRef(false)

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await API.get("/api/banners")
        setBanners((res.data || []).filter((banner) => banner.active))
      } catch (error) {
        console.log(error)
      }
    }

    fetchBanners()
  }, [])

  const preparedBanners = useMemo(
    () =>
      banners.map((banner) => {
        const imageToUse = mobileView ? banner.mobile_image || banner.image : banner.image
        return {
          ...banner,
          imageSrc: resolveBannerImage(imageToUse),
        }
      }),
    [banners, mobileView]
  )

  const safeActiveIndex = preparedBanners.length > 0 ? activeIndex % preparedBanners.length : 0

  const pauseAuto = useCallback((resumeDelay = IDLE_RESUME_DELAY) => {
    setIsPaused(true)
    window.clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = window.setTimeout(() => {
      setIsPaused(false)
    }, resumeDelay)
  }, [])

  const goToIndex = useCallback((index) => {
    setDirection(index > safeActiveIndex ? 1 : -1)
    setActiveIndex(index)
    pauseAuto()
  }, [pauseAuto, safeActiveIndex])

  const goBy = useCallback((delta) => {
    if (preparedBanners.length < 2) return
    setDirection(delta > 0 ? 1 : -1)
    setActiveIndex((current) => (current + delta + preparedBanners.length) % preparedBanners.length)
  }, [preparedBanners.length])

  useEffect(() => {
    const node = rootRef.current
    if (!node || !("IntersectionObserver" in window)) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio > 0.35),
      { threshold: [0, 0.35, 0.7] }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleActivity = () => pauseAuto()
    const handleVisibility = () => {
      setIsPaused(document.hidden)
      if (!document.hidden) pauseAuto(1200)
    }

    window.addEventListener("scroll", handleActivity, { passive: true })
    window.addEventListener("touchstart", handleActivity, { passive: true })
    window.addEventListener("pointerdown", handleActivity, { passive: true })
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("scroll", handleActivity)
      window.removeEventListener("touchstart", handleActivity)
      window.removeEventListener("pointerdown", handleActivity)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.clearTimeout(resumeTimerRef.current)
    }
  }, [pauseAuto])

  useEffect(() => {
    window.clearTimeout(slideTimerRef.current)
    if (preparedBanners.length < 2 || isPaused || !isVisible || document.hidden) return undefined

    slideTimerRef.current = window.setTimeout(() => {
      goBy(1)
    }, AUTO_SLIDE_DELAY)

    return () => window.clearTimeout(slideTimerRef.current)
  }, [goBy, isPaused, isVisible, preparedBanners.length, activeIndex])

  if (preparedBanners.length === 0) {
    return null
  }

  const banner = preparedBanners[safeActiveIndex] || preparedBanners[0]
  const clickable = banner.clickable && banner.link
  const bannerLink = clickable
    ? (/^https?:\/\//i.test(banner.link) ? banner.link : `https://${String(banner.link).replace(/^\/+/, "")}`)
    : ""

  const handleDragEnd = (_, info) => {
    const swipe = Math.abs(info.offset.x) * info.velocity.x
    dragMovedRef.current = Math.abs(info.offset.x) > 10
    if (swipe < -SWIPE_CONFIDENCE || info.offset.x < -80) {
      goBy(1)
    } else if (swipe > SWIPE_CONFIDENCE || info.offset.x > 80) {
      goBy(-1)
    }
    pauseAuto()
    window.setTimeout(() => {
      dragMovedRef.current = false
    }, 120)
  }

  const handleClick = (event) => {
    if (dragMovedRef.current) {
      event.preventDefault()
    }
  }

  const slide = (
    <div className="premium-card banner-container relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.img
          key={banner.imageSrc}
          src={banner.imageSrc}
          alt={banner.title || "Banner"}
          className="banner-img h-full w-full object-cover object-center"
          custom={direction}
          initial={{ opacity: 0, x: direction * 28, scale: 1.012 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: direction * -18, scale: 0.997 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-black/58 via-black/12 to-transparent" />
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-x-0 bottom-0 p-4 text-center">
          {banner.title && (
            <p className="text-lg font-semibold text-white">
              {banner.title}
            </p>
          )}
          {banner.subtitle && (
            <p className="mt-1 text-sm text-white/80">
              {banner.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div ref={rootRef} className="mb-5">
      <motion.div
        className="banner-shell"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragStart={() => pauseAuto(7000)}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => pauseAuto(1200)}
        style={{ touchAction: "pan-y" }}
      >
        {clickable ? (
          <a
            href={bannerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            onClick={handleClick}
          >
            {slide}
          </a>
        ) : (
          slide
        )}
      </motion.div>

      {preparedBanners.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {preparedBanners.map((item, index) => (
            <button
              key={item.id || index}
              type="button"
              onClick={() => goToIndex(index)}
              aria-label={`Show banner ${index + 1}`}
              className={`banner-dot ${index === safeActiveIndex ? "banner-dot-active" : ""}`}
            />
          ))}
        </div>
      )}

      <style>{`
        .banner-shell {
          width: 100%;
          cursor: grab;
        }

        .banner-shell:active {
          cursor: grabbing;
        }

        .banner-container {
          width: 100%;
          aspect-ratio: 3 / 1;
          overflow: hidden;
          border-radius: 16px;
          contain: paint;
        }

        .banner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform 520ms ease;
          will-change: transform, opacity;
        }

        .banner-dot {
          height: 10px;
          width: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.26);
          transition: transform 220ms ease, background-color 220ms ease, opacity 220ms ease;
          transform-origin: center;
          will-change: transform;
        }

        .banner-dot-active {
          transform: scaleX(2.8);
          background: #facc15;
          box-shadow: 0 0 18px rgba(250, 204, 21, 0.28);
        }

        @media (hover: hover) and (pointer: fine) {
          .banner-container:hover .banner-img {
            transform: scale(1.022);
          }
        }

        @media (min-width: 768px) {
          .banner-container {
            aspect-ratio: 20 / 7;
          }
        }

        @media (min-width: 1024px) {
          .banner-shell {
            max-width: 980px;
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
    </div>
  )
}

export default TopBannerCarousel
