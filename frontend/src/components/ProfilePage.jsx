import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { getUsername } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

function ProfilePage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [supportThreads, setSupportThreads] = useState([])
  const [username, setUsername] = useState(getUsername() || "")
  const [loading, setLoading] = useState(true)
  const [activePanel, setActivePanel] = useState("orders")
  const [supportMessage, setSupportMessage] = useState("")
  const [supportReplies, setSupportReplies] = useState({})
  const [submittingSupport, setSubmittingSupport] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, ordersRes, supportRes] = await Promise.all([
          API.get("/me"),
          API.get("/my-orders"),
          API.get("/support-threads"),
        ])
        setUsername(profileRes.data.username)
        setOrders(ordersRes.data)
        setSupportThreads(supportRes.data)
      } catch (error) {
        console.log(error)
        toast.error(getApiErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const submitSupportThread = async () => {
    if (!supportMessage.trim()) {
      toast.error("Please enter your problem")
      return
    }

    try {
      setSubmittingSupport("new-thread")
      const res = await API.post("/support-threads", {
        message: supportMessage.trim(),
      })
      setSupportThreads((current) => [res.data, ...current])
      setSupportMessage("")
      setActivePanel("help")
      toast.success("Help request sent")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to send help request"))
    } finally {
      setSubmittingSupport("")
    }
  }

  const replyToThread = async (threadId) => {
    const message = (supportReplies[threadId] || "").trim()
    if (!message) {
      toast.error("Please enter your reply")
      return
    }

    try {
      setSubmittingSupport(`reply-${threadId}`)
      const res = await API.post(`/support-threads/${threadId}/messages`, {
        message,
      })
      setSupportThreads((current) =>
        current.map((thread) => (thread.id === threadId ? res.data : thread))
      )
      setSupportReplies((current) => ({ ...current, [threadId]: "" }))
      toast.success("Reply sent")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to send reply"))
    } finally {
      setSubmittingSupport("")
    }
  }

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
          Check your order status and contact support from one place.
        </p>

        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/50">User details</p>
            <p className="mt-2 text-lg font-medium text-white">{username}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActivePanel("orders")}
              className={`rounded-2xl border p-4 text-left transition ${
                activePanel === "orders"
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                  : "border-white/10 bg-white/5 text-white"
              }`}
            >
              <p className="text-sm font-semibold">Orders</p>
              <p className="mt-1 text-xs text-white/60">View status updates</p>
            </button>

            <button
              onClick={() => setActivePanel("help")}
              className={`rounded-2xl border p-4 text-left transition ${
                activePanel === "help"
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                  : "border-white/10 bg-white/5 text-white"
              }`}
            >
              <p className="text-sm font-semibold">Help</p>
              <p className="mt-1 text-xs text-white/60">Drop your issue here</p>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activePanel === "orders" && (
          <motion.div
            key="orders-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl"
          >
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
                  Status: <span className="capitalize">{order.status}</span>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {["pending", "printing", "ready", "delivered"].map((status) => (
                    <span
                      key={status}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        order.status === status
                          ? "bg-yellow-400 text-black"
                          : "bg-white/10 text-white/45"
                      }`}
                    >
                      {status}
                    </span>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  {(order.items || []).map((item) => (
                    <p key={item.id} className="text-sm text-white/55">
                      {item.item_name || "Unnamed item"} • Qty {item.quantity}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activePanel === "help" && (
          <motion.div
            key="help-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">
                Help
              </h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
                {supportThreads.length} threads
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/60">
                Drop your issue. Also include your contact info for solving the issue betterly.
              </p>
              <textarea
                value={supportMessage}
                onChange={(event) => setSupportMessage(event.target.value)}
                rows={4}
                placeholder="Drop your issue here... Also include your contact info."
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none"
              />
              <button
                onClick={submitSupportThread}
                disabled={submittingSupport === "new-thread"}
                className="mt-3 rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-black"
              >
                {submittingSupport === "new-thread" ? "Sending..." : "Drop Issue"}
              </button>
            </div>

            {supportThreads.length === 0 && (
              <p className="mt-4 text-sm text-white/55">
                No help queries yet
              </p>
            )}

            {supportThreads.map((thread) => (
              <div key={thread.id} className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Query #{thread.id}</p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize text-yellow-400">
                    {thread.status}
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  {(thread.messages || []).map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        message.sender_role === "admin"
                          ? "bg-yellow-400/10 text-yellow-300"
                          : "bg-white/10 text-white/75"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                        {message.sender_role === "admin" ? "Admin Reply" : "Your Message"}
                      </p>
                      <p className="mt-1">{message.message}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <textarea
                    value={supportReplies[thread.id] || ""}
                    onChange={(event) =>
                      setSupportReplies((current) => ({
                        ...current,
                        [thread.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Add more details or contact info..."
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none"
                  />
                  <button
                    onClick={() => replyToThread(thread.id)}
                    disabled={submittingSupport === `reply-${thread.id}`}
                    className="mt-3 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {submittingSupport === `reply-${thread.id}` ? "Sending..." : "Reply"}
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
