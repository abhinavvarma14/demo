import { useState } from "react"
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

const handleLogin = async (e) => {

e.preventDefault()

try {
  setSubmitting(true)

  const params = new URLSearchParams()

  params.append("username", username)
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

  toast.error(getApiErrorMessage(error, "Login failed"))

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
      onChange={(e) => setUsername(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mb-4"
    />

    <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mb-6"
    />

    <button
      type="submit"
      disabled={submitting}
      className="w-full bg-yellow-400 text-black py-3 rounded-xl font-semibold hover:bg-yellow-300 transition"
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
