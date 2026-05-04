import { useEffect, useMemo, useState } from "react"
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

  if (preparedBanners.length === 0) {
    return null
  }

  const banner = preparedBanners[0]
  const clickable = banner.clickable && banner.link
  const content = (
    <div className="banner-container relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <img
        src={banner.imageSrc}
        alt={banner.title || "Banner"}
        className="banner-img h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-transparent" />
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
    <div className="mb-5">
      {clickable ? (
        <a
          href={banner.link}
          target={/^https?:\/\//i.test(banner.link) ? "_blank" : undefined}
          rel={/^https?:\/\//i.test(banner.link) ? "noreferrer" : undefined}
          className="block"
        >
          {content}
        </a>
      ) : (
        content
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
