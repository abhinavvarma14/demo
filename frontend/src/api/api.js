import axios from "axios"

const DEV_API_BASE_URL = "http://127.0.0.1:8000"
const DEFAULT_API_BASE_URL = "https://abhinav-varma-production.up.railway.app"

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || "").trim()
  if (!trimmed) return import.meta.env.DEV ? DEV_API_BASE_URL : DEFAULT_API_BASE_URL

  if (import.meta.env.DEV) {
    const looksLikeProductionRailway = /abhinav-varma-production\.up\.railway\.app/i.test(trimmed)
    if (looksLikeProductionRailway) return DEV_API_BASE_URL
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed.replace(/\/+$/, "")
  return `https://${trimmed.replace(/\/+$/, "")}`
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL)

const API = axios.create({
  baseURL: API_BASE_URL
})

export const postWithFallback = async (paths, data, config = {}) => {
  let lastError

  for (const path of paths) {
    try {
      return await API.post(path, data, config)
    } catch (error) {
      lastError = error

      if (error.response?.status !== 404 || path === paths[paths.length - 1]) {
        throw error
      }
    }
  }

  throw lastError
}

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  const url = typeof config.url === "string" ? config.url : ""
  const isAuthRequest =
    url === "/login" ||
    url === "/auth/login" ||
    url === "/signup" ||
    url === "/auth/signup" ||
    url.endsWith("/login") ||
    url.endsWith("/signup")

  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default API
