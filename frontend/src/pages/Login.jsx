import { useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { getUserRole, setToken } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

function Login() {

const navigate = useNavigate()

const [username, setUsername] = useState("")
const [password, setPassword] = useState("")
const [submitting, setSubmitting] = useState(false)
const [formError, setFormError] = useState("")

const handleLogin = async (e) => {

e.preventDefault()

if (submitting) {
  return
}

const normalizedUsername = username.trim()

if (!normalizedUsername || !password) {
  setFormError("Username and password are required.")
  return
}

try {
  setSubmitting(true)
  setFormError("")

  const params = new URLSearchParams()

  params.append("username", normalizedUsername)
  params.append("password", password)

  const res = await API.post("/login", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  })

  const token = res.data?.access_token || res.data?.token
  if (!token) {
    setFormError("Server error. Login token was not returned.")
    return
  }

  setToken(token)

  toast.success("Login successful")

  if (getUserRole() === "admin") {
    navigate("/admin")
  } else if (getUserRole() === "delivery") {
    navigate("/delivery")
  } else {
    navigate("/")
  }

} catch (error) {

  console.log(error)
  const status = error.response?.status
  const detail = error.response?.data?.detail

  if (!error.response) {
    setFormError("Server connection blocked. Please try again after the backend CORS update is deployed.")
  } else if (status === 404) {
    setFormError("User not found. Please sign up.")
  } else if (status === 401 || status === 400) {
    setFormError("Invalid credentials.")
  } else if (status === 429) {
    setFormError(detail || "Too many login attempts. Try again later.")
  } else if (status >= 500) {
    setFormError("Server error. Please try again shortly.")
  } else {
    setFormError(detail || getApiErrorMessage(error, "Login failed"))
  }

} finally {
  setSubmitting(false)
}

}

return (

<div className="min-h-screen flex items-center justify-center px-6">

  <form
    onSubmit={handleLogin}
    className="premium-card w-full max-w-sm bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6"
  >

    <h1 className="text-2xl text-yellow-400 font-bold mb-6 text-center">
      BatPrint Login
    </h1>

    <input
      placeholder="Username"
      autoComplete="username"
      value={username}
      onChange={(e) => {
        setUsername(e.target.value)
        setFormError("")
      }}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mb-4"
    />

    <input
      type="password"
      placeholder="Password"
      autoComplete="current-password"
      value={password}
      onChange={(e) => {
        setPassword(e.target.value)
        setFormError("")
      }}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
    />

    {formError && (
      <p className="text-red-500 text-sm mt-2" role="alert">
        {formError}
      </p>
    )}

    <button
      type="submit"
      disabled={submitting}
      className="w-full bg-yellow-400 text-black py-3 rounded-xl font-semibold hover:bg-yellow-300 transition mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {submitting ? "Processing..." : "Login"}
    </button>

    <p className="text-center text-gray-400 text-sm mt-3">
      If you don't have an account, create one.

      <span
        onClick={() => navigate("/signup")}
        className="text-yellow-400 ml-2 cursor-pointer"
      >
        Signup
      </span>
    </p>

  </form>

</div>

)

}

export default Login
