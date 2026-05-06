import axios from "axios"
import { clearAuth, getToken, isLoggedIn } from "../utils/auth"

const DEFAULT_API_BASE_URL = "https://demo-production-f9fb.up.railway.app"

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || "").trim()
  if (!trimmed) return DEFAULT_API_BASE_URL
  const normalized = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed.replace(/\/+$/, "")
    : `https://${trimmed.replace(/\/+$/, "")}`

  if (/demo-production-f9fb\.up\.railway\.app/i.test(normalized)) {
    return normalized
  }

  return DEFAULT_API_BASE_URL
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL)

if (import.meta.env.DEV) {
  console.info("[batprint] API base URL:", API_BASE_URL)
}

const API = axios.create({
  baseURL: API_BASE_URL
})

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
