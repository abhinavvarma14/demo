import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { getUsername } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

function ProfilePage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [username, setUsername] = useState(getUsername() || "")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          API.get("/me"),
          API.get("/my-orders"),
        ])
        setUsername(profileRes.data.username)
        setOrders(ordersRes.data)
      } catch (error) {
        console.log(error)
        toast.error(getApiErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    toast.success("Logged out successfully")
    navigate("/login")
  }

  return (
    <div className="px-4 pb-28 pt-24">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.34em] text-white/45">
          Profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Hello, {username || "there"}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Manage your details, review orders, and update preferences.
        </p>

        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/50">User details</p>
            <p className="mt-2 text-lg font-medium text-white">{username}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/50">Settings</p>
            <p className="mt-2 text-sm text-white/75">
              Notifications and delivery preferences will live here next.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">
            Orders
          </h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
            {orders.length} total
          </span>
        </div>

        {loading && (
          <div className="mt-4 space-y-3">
            {[1, 2].map((item) => (
              <div key={item} className="h-24 rounded-2xl bg-white/10 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && orders.length === 0 && (
          <p className="mt-4 text-sm text-white/55">
            No orders yet
          </p>
        )}

        {!loading && orders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                Order #{order.id}
              </p>
              <span className="text-sm font-medium text-yellow-400">
                ₹{order.total_amount}
              </span>
            </div>

            <p className="mt-2 text-sm text-white/60">
              Status: {order.status}
            </p>

            <div className="mt-3 space-y-2">
              {(order.items || []).map((item) => (
                <p key={item.id} className="text-sm text-white/55">
                  {item.item_name || "Unnamed item"} • Qty {item.quantity}
                </p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="mt-6 w-full rounded-xl bg-red-500 py-3 font-semibold text-white transition hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  )
}

export default ProfilePage
