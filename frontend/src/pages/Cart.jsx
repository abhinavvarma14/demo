import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { getApiErrorMessage } from "../utils/apiError"

function Cart() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const fetchCart = async () => {
    try {
      const res = await API.get("/cart")
      setCart(res.data.items)
      setTotal(res.data.total_amount)
      } catch (error) {
        console.log(error)
        if (error.response?.status === 401) {
          toast.error("Please login to continue")
          navigate("/login")
        } else {
          toast.error(getApiErrorMessage(error))
        }
      } finally {
        setLoading(false)
    }
  }

  useEffect(() => {
    fetchCart()
  }, [])

  const removeItem = async (id) => {
    try {
      await API.delete(`/cart/items/${id}`)
      toast.success("Removed from cart")
      fetchCart()
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to remove item"))
    }
  }

  const updateQuantity = async (item, nextQuantity) => {
    if (nextQuantity <= 0) {
      return removeItem(item.id)
    }

    try {
      setUpdatingId(item.id)
      await API.patch(`/cart/items/${item.id}`, { quantity: nextQuantity })
      fetchCart()
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to update item"))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="pt-24 px-4 pb-24">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">
        Cart
      </h1>

      {loading && (
        <>
          {[1, 2].map((item) => (
            <div key={item} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 h-28 animate-pulse" />
          ))}
        </>
      )}

      {!loading && cart.length === 0 && (
        <p className="text-gray-400">
          Cart is empty
        </p>
      )}

      {cart.map((item) => (
        <div
          key={item.id}
          className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
        >
          <p className="text-gray-300">
            {item.item_name}
          </p>

          <p className="text-gray-400 text-sm mt-1">
            Mode: {item.mode || "-"}
          </p>

          <p className="text-gray-400 text-sm">
            Print: {item.print_type === "single" ? "Single Side" : item.print_type === "double" ? "Double Side" : item.print_type || "-"}
          </p>

          <p className="text-gray-400 text-sm">
            Quantity: {item.quantity}
          </p>

          {item.leave_date && (
            <p className="text-gray-400 text-sm">
              Leave Date: {item.leave_date}
            </p>
          )}

          {item.request_reason && (
            <p className="text-gray-400 text-sm">
              Reason: {item.request_reason}
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => updateQuantity(item, item.quantity - 1)}
              disabled={updatingId === item.id}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1"
            >
              -
            </button>

            <button
              onClick={() => updateQuantity(item, item.quantity + 1)}
              disabled={updatingId === item.id}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1"
            >
              +
            </button>
          </div>

          {item.upload && (
            <p className="text-gray-400 text-sm">
              Pages: {item.upload.total_pages}
            </p>
          )}

          <p className="text-yellow-400 font-semibold mt-2">
            ₹{item.total_price}
          </p>

          <button
            onClick={() => removeItem(item.id)}
            className="mt-2 text-red-400 text-sm"
          >
            Remove
          </button>
        </div>
      ))}

      <div className="sticky bottom-20 bg-white/5 border border-white/10 rounded-2xl p-4 mt-6">
        <p className="text-gray-400 text-sm">
          Total
        </p>

        <p className="text-2xl font-bold text-yellow-400">
          ₹{total}
        </p>
      </div>

      <button
        onClick={() => navigate("/checkout")}
        disabled={cart.length === 0}
        className="mt-6 w-full bg-yellow-400 text-black py-3 rounded-xl font-semibold hover:bg-yellow-300 transition disabled:opacity-60"
      >
        Proceed to Checkout
      </button>
    </div>
  )

}

export default Cart
