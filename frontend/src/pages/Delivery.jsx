import { useCallback, useEffect, useState } from "react"
import { Truck } from "lucide-react"
import API from "../api/api"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import DeliveryQueue from "../components/DeliveryQueue"
import { isLoggedIn } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

function Delivery() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")

  const fetchOrders = useCallback(async () => {
    if (!isLoggedIn()) {
      setLoading(false)
      navigate("/login", { replace: true })
      return
    }

    try {
      setLoading(true)
      const res = await API.get("/delivery/orders")
      setOrders(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error(error)
      toast.error(getApiErrorMessage(error, "Failed to load delivery orders"))
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const markDelivered = async (order) => {
    const orderId = order.id
    const orderKey = String(orderId)
    if (actionLoading) return

    const previousOrders = orders
    setActionLoading(orderKey)
    setOrders((current) => current.filter((currentOrder) => String(currentOrder.id) !== orderKey))

    try {
      await API.put(`/delivery/orders/${orderId}/delivered`)
      toast.success("Order marked delivered")
    } catch (error) {
      setOrders(previousOrders)
      console.error(error)
      toast.error(getApiErrorMessage(error, "Failed to update delivery"))
    } finally {
      setActionLoading("")
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-28 pt-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-yellow-400">
            <Truck className="h-5 w-5" />
            <span className="text-sm font-black uppercase tracking-[0.24em]">Delivery Dashboard</span>
          </div>
          <h1 className="text-3xl font-black text-white md:text-5xl">Delivery Workflow</h1>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : (
          <DeliveryQueue
            orders={orders}
            actionLoading={actionLoading}
            onMarkDelivered={markDelivered}
          />
        )}
      </div>
    </div>
  )
}

export default Delivery
