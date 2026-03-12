import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"

function Cart() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchCart = async () => {
    try {
      const res = await API.get("/cart")
      setCart(res.data.items)
      setTotal(res.data.total_amount)
    } catch (error) {
      console.log(error)
      if (error.response?.status === 401) {
        navigate("/login")
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
      toast.error("Failed to remove item")
    }
  }

  return (
    <div className="pt-24 px-4 pb-24">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">
        Cart
      </h1>

      {loading && (
        <p className="text-gray-400">
          Loading cart...
        </p>
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

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-6">
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
