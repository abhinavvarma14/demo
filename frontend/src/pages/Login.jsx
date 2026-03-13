import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { getUserRole } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

function Login() {

const navigate = useNavigate()

const [username, setUsername] = useState("")
const [password, setPassword] = useState("")
const [submitting, setSubmitting] = useState(false)
const [formError, setFormError] = useState("")

const handleLogin = async (e) => {

e.preventDefault()

try {
  setSubmitting(true)
  setFormError("")
  const normalizedUsername = username.trim()

  if (!normalizedUsername || !password) {
    setFormError("Username and password are required.")
    return
  }

  const params = new URLSearchParams()

  params.append("username", normalizedUsername)
  params.append("password", password)

  const res = await API.post("/login", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  })

  localStorage.setItem("token", res.data.access_token)

  toast.success("Login successful")

  if (getUserRole() === "admin") {
    navigate("/admin")
  } else {
    navigate("/")
  }

} catch (error) {

  console.log(error)
  if (error.response?.status === 404) {
    setFormError("No user found. Please sign up.")
  } else if (error.response?.status === 401) {
    setFormError("Incorrect password.")
  } else if (error.response?.status === 429) {
    setFormError("Too many login attempts. Try again later.")
  } else {
    setFormError(getApiErrorMessage(error, "Login failed"))
  }

} finally {
  setSubmitting(false)
}

}

return (

<div className="min-h-screen flex items-center justify-center px-6">

  <form
    onSubmit={handleLogin}
    className="w-full max-w-sm bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6"
  >

    <h1 className="text-2xl text-yellow-400 font-bold mb-6 text-center">
      BatPrint Login
    </h1>

    <input
      placeholder="Username"
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
      value={password}
      onChange={(e) => {
        setPassword(e.target.value)
        setFormError("")
      }}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
    />

    <AnimatePresence mode="wait">
      {formError && (
        <motion.p
          key={formError}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-red-500 text-sm mt-2"
        >
          {formError}
        </motion.p>
      )}
    </AnimatePresence>

    <button
      type="submit"
      disabled={submitting}
      className="w-full bg-yellow-400 text-black py-3 rounded-xl font-semibold hover:bg-yellow-300 transition mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {submitting ? "Processing..." : "Login"}
    </button>

    <p className="text-center text-gray-400 text-sm mt-4">
      Don't have an account?

      <span
        onClick={() => navigate("/signup")}
        className="text-yellow-400 ml-2 cursor-pointer"
      >
        Signup
      </span>

    </p>

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
