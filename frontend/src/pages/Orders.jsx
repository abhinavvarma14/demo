import { useEffect, useState } from "react"
import API from "../api/api"
import toast from "react-hot-toast"
import { getApiErrorMessage } from "../utils/apiError"

function Orders(){
  const [orders,setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const statusSteps = ["pending", "printing", "ready", "delivered"]

  const fetchOrders = async () => {
    try {
      const res = await API.get("/my-orders")
      setOrders(res.data)
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div className="pt-24 pb-24 px-4">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">
        My Orders
      </h1>

      {loading && (
        <>
          {[1, 2].map((item) => (
            <div key={item} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 h-28 animate-pulse" />
          ))}
        </>
      )}

      {!loading && orders.length === 0 && (
        <p className="text-gray-400">
          No orders yet
        </p>
      )}

      {!loading && orders.map((order) => (
        <div
          key={order.id}
          className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
        >
          <p className="text-gray-300">
            Order ID: {order.id}
          </p>

          <p className="text-yellow-400 font-semibold">
            ₹{order.total_amount}
          </p>

          <p className="text-gray-400">
            Status: {order.status}
          </p>

          <div className="mt-3 flex gap-2 flex-wrap">
            {statusSteps.map((step) => {
              const reached = statusSteps.indexOf(order.status) >= statusSteps.indexOf(step)
              return (
                <span
                  key={step}
                  className={`px-3 py-1 rounded-full text-xs border ${reached ? "border-yellow-400 text-yellow-400" : "border-white/10 text-gray-500"}`}
                >
                  {step.charAt(0).toUpperCase() + step.slice(1)}
                </span>
              )
            })}
          </div>

          <div className="mt-3 space-y-2">
            {(order.items || []).map((item) => (
              <div key={item.id} className="text-sm text-gray-400 border-t border-white/5 pt-2">
                {item.item_name || "Unnamed item"} • {item.mode || "-"} • {item.print_type === "single" ? "Single" : item.print_type === "double" ? "Double" : item.print_type || "-"} • Qty {item.quantity}
                {item.leave_date && (
                  <div className="mt-1 text-xs text-white/55">
                    Leave Date: {item.leave_date}
                  </div>
                )}
                {item.request_reason && (
                  <div className="mt-1 text-xs text-white/55">
                    Reason: {item.request_reason}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      ))}
    </div>
  )
}

export default Orders
