import { useEffect, useState } from "react"
import API from "../api/api"
import toast from "react-hot-toast"

function Orders(){
  const [orders,setOrders] = useState([])

  const fetchOrders = async () => {
    try {
      const res = await API.get("/my-orders")
      setOrders(res.data)
    } catch (error) {
      console.log(error)
      toast.error("Login required")
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

      {orders.length === 0 && (
        <p className="text-gray-400">
          No orders yet
        </p>
      )}

      {orders.map((order) => (
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

          <div className="mt-3 space-y-2">
            {(order.items || []).map((item) => (
              <div key={item.id} className="text-sm text-gray-400 border-t border-white/5 pt-2">
                {item.item_name || "Unnamed item"} • {item.mode || "-"} • {item.print_type === "single" ? "Single" : item.print_type === "double" ? "Double" : item.print_type || "-"} • Qty {item.quantity}
              </div>
            ))}
          </div>

        </div>
      ))}
    </div>
  )
}

export default Orders
