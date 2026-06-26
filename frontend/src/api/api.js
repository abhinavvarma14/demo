import axios from "axios"
import { clearAuth, getToken, isLoggedIn } from "../utils/auth"

const DEFAULT_API_BASE_URL = "https://demo-production-f9fb.up.railway.app"
const LOCAL_API_BASE_URL = "http://127.0.0.1:8000"

const isLocalFrontend = () =>
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || "").trim()
  const runningLocally = isLocalFrontend()

  if (!trimmed) {
    return runningLocally ? LOCAL_API_BASE_URL : DEFAULT_API_BASE_URL
  }

  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed.replace(/\/+$/, "")
    : `https://${trimmed.replace(/\/+$/, "")}`
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL)

if (import.meta.env.DEV) {
  console.info("[batprint] API base URL:", API_BASE_URL)
}

const API = axios.create({
  baseURL: API_BASE_URL
})

const GET_CACHE_TTL = 30_000
const ADMIN_CACHE_TTL = 8_000
const STALE_CACHE_TTL = 5 * 60_000
const getCache = new Map()
const inflightGets = new Map()

const stableSerialize = (value) => {
  if (!value || typeof value !== "object") return String(value || "")
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = value[key]
        return acc
      }, {})
  )
}

const getCacheKey = (url, config = {}) =>
  `${getRequestPath(url)}?${stableSerialize(config.params)}`

const getCacheTtl = (url) => (getRequestPath(url).startsWith("/admin") ? ADMIN_CACHE_TTL : GET_CACHE_TTL)

const shouldCacheGet = (url, config = {}) => {
  if (config.responseType || config.cache === false) return false
  const path = getRequestPath(url)
  return !path.includes("/uploads/")
}

export const clearApiCache = (matcher) => {
  if (!matcher) {
    getCache.clear()
    return
  }

  for (const key of getCache.keys()) {
    if (typeof matcher === "string" ? key.startsWith(matcher) : matcher(key)) {
      getCache.delete(key)
    }
  }
}

const originalGet = API.get.bind(API)
API.get = (url, config = {}) => {
  if (!shouldCacheGet(url, config)) return originalGet(url, config)

  const key = getCacheKey(url, config)
  const cached = getCache.get(key)
  if (cached && Date.now() - cached.timestamp < getCacheTtl(url)) {
    return Promise.resolve(cached.response)
  }

  if (inflightGets.has(key)) {
    return inflightGets.get(key)
  }

  const request = originalGet(url, config)
    .then((response) => {
      getCache.set(key, { response, timestamp: Date.now() })
      return response
    })
    .catch((error) => {
      const stale = getCache.get(key)
      if (stale && Date.now() - stale.timestamp < STALE_CACHE_TTL) {
        return stale.response
      }
      throw error
    })
    .finally(() => inflightGets.delete(key))

  inflightGets.set(key, request)
  return request
}

const invalidateAfterMutation = (method) => async (...args) => {
  const response = await method(...args)
  clearApiCache()
  window.dispatchEvent(new Event("api-cache-invalidated"))
  return response
}

API.post = invalidateAfterMutation(API.post.bind(API))
API.put = invalidateAfterMutation(API.put.bind(API))
API.patch = invalidateAfterMutation(API.patch.bind(API))
API.delete = invalidateAfterMutation(API.delete.bind(API))

const protectedPrefixes = [
  "/admin",
  "/api/uploads",
  "/cart",
  "/delivery",
  "/me",
  "/my-orders",
  "/order/create",
  "/orders",
  "/payment",
  "/support-threads",
]

const getRequestPath = (url = "") => {
  try {
    return new URL(url, API_BASE_URL).pathname.replace(/\/+$/, "") || "/"
  } catch {
    return String(url || "").split("?")[0].replace(/\/+$/, "") || "/"
  }
}

const isAuthEndpoint = (url = "") => {
  const path = getRequestPath(url)
  return ["/login", "/auth/login", "/signup", "/auth/signup"].includes(path)
}

const isProtectedEndpoint = (url = "") => {
  const path = getRequestPath(url)
  return protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export const postWithFallback = async (paths, data, config = {}) => {
  let lastError

  for (const path of paths) {
    try {
      return await API.post(path, data, config)
    } catch (error) {
      lastError = error

      const canTryNext = [404, 405].includes(error.response?.status)
      if (!canTryNext || path === paths[paths.length - 1]) {
        throw error
      }
    }
  }

  throw lastError
}

API.interceptors.request.use((config) => {
  const url = typeof config.url === "string" ? config.url : ""
  const isAuthRequest = isAuthEndpoint(url)

  if (!isAuthRequest && isProtectedEndpoint(url) && !isLoggedIn()) {
    const authError = new axios.CanceledError("Please login to continue")
    authError.code = "AUTH_REQUIRED"
    authError.config = config
    return Promise.reject(authError)
  }

  const token = getToken()
  if (token && !isAuthRequest) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = typeof error.config?.url === "string" ? error.config.url : ""
    const isAuthRequest = isAuthEndpoint(url)

    if (status === 401 && !isAuthRequest) {
      clearAuth()
    }

    return Promise.reject(error)
  }
)

export default API

