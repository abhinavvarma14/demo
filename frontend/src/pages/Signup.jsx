import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Sparkles } from "lucide-react"
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
const [passwordError, setPasswordError] = useState("")
const [formError, setFormError] = useState("")

const requirements = useMemo(() => {
  const hasLength = password.length >= 4
  const hasLetters = /[A-Za-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  let label = "Weak"
  let color = "bg-red-500"
  let progress = "34%"

  if (hasLength && hasLetters && hasNumber && hasSymbol) {
    label = "Strong"
    color = "bg-green-500"
    progress = "100%"
  } else if (hasLetters && hasNumber) {
    label = "Medium"
    color = "bg-yellow-400"
    progress = "68%"
  }

  return {
    label,
    color,
    progress,
  }
}, [password])

const generatePassword = () => {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lowercase = "abcdefghijkmnopqrstuvwxyz"
  const numbers = "23456789"
  const symbols = "!@#$%^&*()-_=+"
  const all = `${uppercase}${lowercase}${numbers}${symbols}`

  const pick = (source) => source[Math.floor(Math.random() * source.length)]
  const generated = [
    pick(uppercase),
    pick(lowercase),
    pick(numbers),
    pick(symbols),
    ...Array.from({ length: 8 }, () => pick(all)),
  ]
    .sort(() => Math.random() - 0.5)
    .join("")

  setPassword(generated)
  setConfirmPassword(generated)
  setFormError("")
  toast.success("Secure password generated")
}

const handleSignup = async (e) => {

e.preventDefault()
setUsernameError("")
setPasswordError("")
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

  const detail = error.response?.data?.detail

  if (error.response?.status === 400 && detail === "Username already exists") {
    setUsernameError("Username already exists. Please choose another.")
    toast.error("Username already exists")
  } else if (error.response?.status === 422) {
    setPasswordError(detail || "Password must be at least 4 characters")
    toast.error(detail || "Password must be at least 4 characters")
  } else {
    const message = getApiErrorMessage(error, "Signup failed")
    setFormError(message)
    toast.error(message)
  }

} finally {
  setSubmitting(false)
}

}

return (

<div className="min-h-screen flex items-center justify-center px-6">

  <form
    onSubmit={handleSignup}
    className="w-full max-w-sm bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5"
  >

    <h1 className="text-2xl text-yellow-400 font-bold mb-6 text-center">
      BatPrint Signup
    </h1>

    <input
      placeholder="Username"
      autoComplete="username"
      value={username}
      onChange={(e) => {
        setUsername(e.target.value)
        setUsernameError("")
        setFormError("")
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
      autoComplete="new-password"
      value={password}
      onChange={(e) => {
        setPassword(e.target.value)
        setPasswordError("")
        setFormError("")
      }}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
    />

    <AnimatePresence mode="wait">
      {passwordError && (
        <motion.p
          key={passwordError}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-red-500 text-sm mt-2"
        >
          {passwordError}
        </motion.p>
      )}
    </AnimatePresence>

    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">
            Password Strength
          </p>
          <p className="mt-1 text-sm text-white/80">
            {requirements.label}
          </p>
        </div>

        <button
          type="button"
          onClick={generatePassword}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/85"
        >
          <Sparkles size={14} />
          Generate
        </button>
      </div>

      <div className="mt-2.5 h-2 rounded-full bg-white/10">
        <motion.div
          animate={{ width: requirements.progress }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          className={`h-full rounded-full ${requirements.color}`}
        />
      </div>

      <p className="mt-2 text-[11px] text-white/50">
        Use at least 4 characters. Adding numbers and symbols makes it stronger.
      </p>
    </div>

    <input
      type="password"
      placeholder="Confirm Password"
      autoComplete="new-password"
      value={confirmPassword}
      onChange={(e) => {
        setConfirmPassword(e.target.value)
        setFormError("")
      }}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-4"
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
