import { useEffect, useState } from "react"
import API from "../api/api"
import toast from "react-hot-toast"
import { getApiErrorMessage } from "../utils/apiError"

function Delivery() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")

  const fetchOrders = async () => {
    try {
      const res = await API.get("/delivery/orders")
      setOrders(res.data)
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to load delivery orders"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const markDelivered = async (orderId) => {
    try {
      setActionLoading(String(orderId))
      await API.put(`/delivery/orders/${orderId}/delivered`)
      toast.success("Order marked delivered")
      await fetchOrders()
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to update delivery"))
    } finally {
      setActionLoading("")
    }
  }

  return (
    <div className="pt-24 px-4 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-yellow-400">
        Delivery Orders
      </h1>

      {loading && (
        <div className="h-40 animate-pulse rounded-xl border border-white/10 bg-white/5" />
      )}

      {!loading && orders.length === 0 && (
        <p className="text-gray-400">
          No delivery orders right now
        </p>
      )}

      {!loading && orders.map((order) => (
        <div
          key={order.id}
          className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-white">
                Order #{order.id}
              </p>
              <p className="text-sm text-gray-400">
                User: {order.user?.username || "-"}
              </p>
            </div>

            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize text-yellow-400">
              {order.status}
            </span>
          </div>

          <div className="mt-3 space-y-1 text-sm text-gray-300">
            <p>Delivery Type: {order.delivery_type}</p>
            <p>Hostel: {order.hostel_name || "-"}</p>
            <p>Contact: {order.contact_number || "-"}</p>
            <p>Alternate: {order.alternate_contact_number || "-"}</p>
          </div>

          <div className="mt-4 rounded-xl bg-white/5 p-3">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
              Books To Deliver
            </p>

            <div className="mt-2 space-y-2">
              {(order.items || []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-black/20 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white">
                      {item.item_name}
                    </p>
                    <span className="text-sm text-yellow-400">
                      Qty {item.quantity}
                    </span>
                  </div>
                  {item.leave_date && (
                    <p className="mt-1 text-xs text-white/55">
                      Leave Date: {item.leave_date}
                    </p>
                  )}
                  {item.request_reason && (
                    <p className="mt-1 text-xs text-white/55">
                      Reason: {item.request_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => markDelivered(order.id)}
            disabled={actionLoading === String(order.id)}
            className="mt-4 w-full rounded-xl bg-yellow-400 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {actionLoading === String(order.id) ? "Processing..." : "Mark Delivered"}
          </button>
        </div>
      ))}
    </div>
  )
}

export default Delivery
