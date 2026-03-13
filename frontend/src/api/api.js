import axios from "axios"

export const API_BASE_URL = import.meta.env.VITE_API_URL

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
