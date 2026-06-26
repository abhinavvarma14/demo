export const routeLoaders = {
  "/": () => import("../pages/Home"),
  "/signup": () => import("../pages/Signup"),
  "/upload": () => import("../pages/Upload"),
  "/profile": () => import("../pages/Profile"),
  "/privacy-policy": () => import("../pages/PrivacyPolicy"),
  "/terms": () => import("../pages/Terms"),
  "/refund-policy": () => import("../pages/RefundPolicy"),
  "/contact": () => import("../pages/Contact"),
  "/cart": () => import("../pages/Cart"),
  "/checkout": () => import("../pages/Checkout"),
  "/login": () => import("../pages/Login"),
  "/admin": () => import("../pages/Admin"),
  "/orders": () => import("../pages/Orders"),
  "/delivery": () => import("../pages/Delivery"),
}

const prefetchedRoutes = new Set()

export const getRouteKey = (path = "/") => {
  if (path.startsWith("/admin")) return "/admin"
  return routeLoaders[path] ? path : "/"
}

export const prefetchRoute = (path) => {
  const key = getRouteKey(path)
  if (prefetchedRoutes.has(key)) return

  prefetchedRoutes.add(key)
  routeLoaders[key]?.()
}

export const prefetchWhenIdle = (paths) => {
  const run = () => paths.forEach(prefetchRoute)

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1600 })
  } else {
    window.setTimeout(run, 700)
  }
}
