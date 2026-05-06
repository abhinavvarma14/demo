const decodeTokenPayload = (token) => {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=")

    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

export const getToken = () => localStorage.getItem("token")

export const setToken = (token) => {
  if (!token) return
  localStorage.setItem("token", token)
  window.dispatchEvent(new Event("auth-changed"))
}

export const clearAuth = () => {
  localStorage.removeItem("token")
  window.dispatchEvent(new Event("auth-changed"))
}

const getValidTokenPayload = () => {
  const token = getToken()
  if (!token) return null

  const payload = decodeTokenPayload(token)
  if (!payload) {
    clearAuth()
    return null
  }

  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    clearAuth()
    return null
  }

  return payload
}

export const isLoggedIn = () => !!getValidTokenPayload()

export const getUserRole = () => {
  return getValidTokenPayload()?.role || null
}

export const getUsername = () => {
  return getValidTokenPayload()?.username || null
}
