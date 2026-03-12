import { useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"

function Login() {

const navigate = useNavigate()

const [username, setUsername] = useState("")
const [password, setPassword] = useState("")

const handleLogin = async (e) => {

e.preventDefault()

try {

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

  navigate("/")

} catch (err) {

  console.log(err)

  toast.error("Login failed")

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
      className="w-full bg-yellow-400 text-black py-3 rounded-xl font-semibold hover:bg-yellow-300 transition"
    >
      Login
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

  </form>

</div>

)

}

export default Login