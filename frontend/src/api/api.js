import axios from "axios"

export const API_BASE_URL = import.meta.env.VITE_API_URL

const API = axios.create({
  baseURL: API_BASE_URL
})

API.interceptors.request.use((config) => {

  const token = localStorage.getItem("token")

  // Don't attach token for login
  if (token && config.url !== "/login") {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default API
