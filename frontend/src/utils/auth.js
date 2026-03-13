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

export const isLoggedIn = () => !!getToken()

export const getUserRole = () => {
  const token = getToken()
  if (!token) return null

  return decodeTokenPayload(token)?.role || null
}

export const getUsername = () => {
  const token = getToken()
  if (!token) return null

  return decodeTokenPayload(token)?.username || null
}
