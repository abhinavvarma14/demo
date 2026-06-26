import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import API from "../api/api"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import { isLoggedIn } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

const STATUS_STEPS = [
  { key: "pending_verification", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "printing", label: "Printing" },
  { key: "ready_for_delivery", label: "Ready" },
  { key: "delivered", label: "Delivered" },
]

function StatusStepper({ status }) {
  const statusIndex = STATUS_STEPS.findIndex((s) => s.key === status)
  const reachedIndex = statusIndex >= 0 ? statusIndex : 0
  const isDelivered = status === "delivered"
  const isRejected = status === "rejected"

  if (isRejected) {
    return (
      <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2 text-center">
        <span className="text-sm font-semibold text-red-400">Order Rejected</span>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-1">
        {STATUS_STEPS.map((step, index) => {
          const reached = index <= reachedIndex
          const isCurrent = index === reachedIndex
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className="h-[2px] flex-1 transition-colors duration-300"
                    style={{
                      background: reached
                        ? isDelivered && index === STATUS_STEPS.length - 1
                          ? "#4ade80"
                          : "#facc15"
                        : "rgba(255,255,255,0.1)",
                    }}
                  />
                )}
                <motion.div
                  className="stepper-dot"
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.3 : 1,
                    background: reached
                      ? isDelivered && index === STATUS_STEPS.length - 1
                        ? "#4ade80"
                        : "#facc15"
                      : "rgba(255,255,255,0.15)",
                    boxShadow: isCurrent
                      ? isDelivered
                        ? "0 0 12px rgba(74,222,128,0.4)"
                        : "0 0 12px rgba(250,204,21,0.35)"
                      : "none",
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "999px",
                    flexShrink: 0,
                  }}
                />
                {index < STATUS_STEPS.length - 1 && (
                  <div
                    className="h-[2px] flex-1 transition-colors duration-300"
                    style={{
                      background: index < reachedIndex
                        ? "#facc15"
                        : "rgba(255,255,255,0.1)",
                    }}
                  />
                )}
              </div>
              <span
                className="text-center text-[10px] font-semibold transition-colors duration-300"
                style={{
                  color: reached
                    ? isDelivered && index === STATUS_STEPS.length - 1
                      ? "#4ade80"
                      : "rgba(250,204,21,0.9)"
                    : "rgba(255,255,255,0.3)",
                }}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!isLoggedIn()) {
      setLoading(false)
      navigate("/login", { replace: true })
      return
    }

    try {
      const res = await API.get("/my-orders")
      setOrders(res.data)
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return (
    <div className="pt-24 pb-24 px-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">My Orders</h1>

        {loading && (
          <>
            {[1, 2].map((item) => (
              <div key={item} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 h-28 animate-pulse" />
            ))}
          </>
        )}

        {!loading && orders.length === 0 && (
          <div className="premium-card rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            No orders yet
          </div>
        )}

        <div className="stagger-list">
          {!loading &&
            orders.map((order) => (
              <motion.div
                key={order.id}
                className="premium-card bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/40">Order #{order.id}</p>
                    <p className="text-yellow-400 font-bold text-xl mt-1">₹{Math.round(order.total_amount || 0)}</p>
                  </div>
                  {order.status === "delivered" && (
                    <motion.span
                      className="rounded-full border border-green-400/30 bg-green-400/15 px-3 py-1 text-xs font-semibold text-green-400"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      Delivered
                    </motion.span>
                  )}
                </div>

                <StatusStepper status={order.status} />

                <div className="mt-3 space-y-2">
                  {(order.items || []).map((item) => (
                    <div key={item.id} className="text-sm text-white/50 border-t border-white/5 pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {item.item_name || "Unnamed item"} • {item.mode || "-"} •{" "}
                          {item.print_type === "single"
                            ? "Single"
                            : item.print_type === "double"
                            ? "Double"
                            : item.print_type || "-"}
                        </span>
                        <span className="whitespace-nowrap text-white/35">×{item.quantity}</span>
                      </div>
                      {item.leave_date && (
                        <div className="mt-1 text-xs text-white/35">
                          Leave: {item.leave_date}
                          {item.leave_to_date ? ` to ${item.leave_to_date}` : ""}
                        </div>
                      )}
                      {item.request_reason && (
                        <div className="mt-1 text-xs text-white/35">Reason: {item.request_reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default Orders
