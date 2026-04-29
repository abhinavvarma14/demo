import { useEffect, useMemo, useRef, useState } from "react"
import API, { API_BASE_URL } from "../api/api"

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
  const scrollerRef = useRef(null)
  const mobileView = isMobileDevice()

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

  useEffect(() => {
    if (banners.length <= 1) {
      return undefined
    }

    const interval = window.setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length
      const scroller = scrollerRef.current
      if (!scroller) {
        return
      }

      const nextChild = scroller.children[nextIndex]
      nextChild?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
    }, 3000)

    return () => window.clearInterval(interval)
  }, [activeIndex, banners.length])

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

  const handleScroll = () => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const cardWidth = scroller.clientWidth
    if (!cardWidth) return

    const nextIndex = Math.round(scroller.scrollLeft / cardWidth)
    setActiveIndex(nextIndex)
  }

  if (preparedBanners.length === 0) {
    return null
  }

  return (
    <div className="mb-5">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {preparedBanners.map((banner) => {
          const clickable = banner.clickable && banner.link
          const content = (
            <div className="banner-container relative w-full min-w-full flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <img
                src={banner.imageSrc}
                alt={banner.title || "Banner"}
                className="banner-img h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-transparent" />
              {(banner.title || banner.subtitle) && (
                <div className="absolute inset-x-0 bottom-0 p-4">
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

          if (!clickable) {
            return (
              <div key={banner.id} className="min-w-full flex-shrink-0">
                {content}
              </div>
            )
          }

          const isExternal = /^https?:\/\//i.test(banner.link)
          return (
            <a
              key={banner.id}
              href={banner.link}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer" : undefined}
              className="min-w-full flex-shrink-0"
            >
              {content}
            </a>
          )
        })}
      </div>

      {preparedBanners.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {preparedBanners.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => {
                const scroller = scrollerRef.current
                const nextChild = scroller?.children[index]
                nextChild?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
              }}
              className={`h-2.5 rounded-full transition ${
                activeIndex === index ? "w-6 bg-yellow-400" : "w-2.5 bg-white/25"
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      )}

      <style>{`
        .banner-container {
          width: 100%;
          aspect-ratio: 3 / 1;
          overflow: hidden;
          border-radius: 16px;
        }

        .banner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        @media (min-width: 768px) {
          .banner-container {
            aspect-ratio: 16 / 9;
          }
        }
      `}</style>
    </div>
  )
}

export default TopBannerCarousel
