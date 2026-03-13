import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { getApiErrorMessage } from "../utils/apiError"

function Signup() {

const navigate = useNavigate()

const [username, setUsername] = useState("")
const [password, setPassword] = useState("")
const [confirmPassword, setConfirmPassword] = useState("")
const [submitting, setSubmitting] = useState(false)
const [usernameError, setUsernameError] = useState("")
const [formError, setFormError] = useState("")

const handleSignup = async (e) => {

e.preventDefault()
setUsernameError("")
setFormError("")

if (password !== confirmPassword) {
  setFormError("Passwords do not match.")

  return

}

try {
  setSubmitting(true)
  const normalizedUsername = username.trim()

  if (!normalizedUsername || !password) {
    setFormError("Username and password are required.")
    return
  }

  await API.post("/signup", {
    username: normalizedUsername,
    password
  })

  toast.success("Account created")

  navigate("/login")

} catch (error) {

  console.log(error)

  if (error.response?.status === 409) {
    setUsernameError("Username already exists. Please choose another.")
  } else {
    setFormError(getApiErrorMessage(error, "Signup failed"))
  }

} finally {
  setSubmitting(false)
}

}

return (

<div className="min-h-screen flex items-center justify-center px-6">

  <form
    onSubmit={handleSignup}
    className="w-full max-w-sm bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6"
  >

    <h1 className="text-2xl text-yellow-400 font-bold mb-6 text-center">
      BatPrint Signup
    </h1>

    <input
      placeholder="Username"
      value={username}
      onChange={(e) => {
        setUsername(e.target.value)
        setUsernameError("")
      }}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
    />

    <AnimatePresence mode="wait">
      {usernameError && (
        <motion.p
          key={usernameError}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-red-500 text-sm mt-2"
        >
          {usernameError}
        </motion.p>
      )}
    </AnimatePresence>

    <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => {
        setPassword(e.target.value)
        setFormError("")
      }}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mb-4"
    />

    <input
      type="password"
      placeholder="Confirm Password"
      value={confirmPassword}
      onChange={(e) => {
        setConfirmPassword(e.target.value)
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
      {submitting ? "Processing..." : "Create Account"}
    </button>

    <p className="text-center text-gray-400 text-sm mt-4">

      Already have an account?

      <span
        onClick={() => navigate("/login")}
        className="text-yellow-400 ml-2 cursor-pointer"
      >
        Login
      </span>

    </p>

  </form>

</div>

)

}

export default Signup
