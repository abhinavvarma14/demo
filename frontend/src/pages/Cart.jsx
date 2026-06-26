import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import API from "../api/api"
import toast from "react-hot-toast"
import { isLoggedIn } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

/* Debounce helper for backend sync */
function useDebouncedSync(delay = 600) {
  const pending = useRef(new Map())
  const timers = useRef(new Map())

  const schedule = useCallback((key, syncFn) => {
    const existingTimer = timers.current.get(key)
    if (existingTimer) clearTimeout(existingTimer)

    pending.current.set(key, syncFn)
    timers.current.set(
      key,
      setTimeout(async () => {
        const fn = pending.current.get(key)
        pending.current.delete(key)
        timers.current.delete(key)
        if (fn) {
          try {
            await fn()
          } catch (error) {
            console.log(error)
          }
        }
      }, delay)
    )
  }, [delay])

  const flush = useCallback(async () => {
    for (const [key, timer] of timers.current) {
      clearTimeout(timer)
      timers.current.delete(key)
    }
    const fns = [...pending.current.values()]
    pending.current.clear()
    await Promise.allSettled(fns.map((fn) => fn()))
  }, [])

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      for (const timer of activeTimers.values()) clearTimeout(timer)
    }
  }, [])

  return { schedule, flush }
}

function Cart() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState(null)
  const { schedule, flush } = useDebouncedSync(500)

  /* Recalculate total from items */
  const computedTotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.total_price || 0), 0),
    [cart]
  )

  useEffect(() => {
    setTotal(computedTotal)
  }, [computedTotal])

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn()) {
      setLoading(false)
      setCart([])
      setTotal(0)
      navigate("/login", { replace: true })
      return
    }

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
  }, [navigate])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const removeItem = useCallback(async (id) => {
    if (!isLoggedIn()) {
      toast.error("Please login to continue")
      navigate("/login")
      return
    }

    /* Optimistic remove */
    setRemovingId(id)
    setCart((prev) => prev.filter((item) => item.id !== id))

    try {
      await API.delete(`/cart/items/${id}`)
      toast.success("Removed from cart")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to remove item"))
      fetchCart() // revert on failure
    } finally {
      setRemovingId(null)
    }
  }, [navigate, fetchCart])

  const updateQuantity = useCallback((item, nextQuantity) => {
    if (!isLoggedIn()) {
      toast.error("Please login to continue")
      navigate("/login")
      return
    }

    if (nextQuantity <= 0) {
      removeItem(item.id)
      return
    }

    /* Optimistic update — instant UI */
    setCart((prev) =>
      prev.map((ci) =>
        ci.id === item.id
          ? {
              ...ci,
              quantity: nextQuantity,
              total_price: ci.unit_price * nextQuantity,
            }
          : ci
      )
    )

    /* Debounced backend sync */
    schedule(item.id, async () => {
      try {
        await API.patch(`/cart/items/${item.id}`, { quantity: nextQuantity })
      } catch (error) {
        console.log(error)
        toast.error(getApiErrorMessage(error, "Failed to update item"))
        fetchCart() // revert on failure
      }
    })
  }, [navigate, removeItem, fetchCart, schedule])

  const handleCheckout = useCallback(async () => {
    await flush()
    navigate("/checkout")
  }, [flush, navigate])

  return (
    <div className="pt-24 px-4 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">Cart</h1>

        {loading && (
          <>
            {[1, 2].map((item) => (
              <div key={item} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 h-28 animate-pulse" />
            ))}
          </>
        )}

        {!loading && cart.length === 0 && (
          <div className="premium-card rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            Cart is empty
          </div>
        )}

        <div className="stagger-list">
          {cart.map((item) => (
            <motion.div
              key={item.id}
              layout
              className="premium-card bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">{item.item_name}</p>
                  <p className="text-white/45 text-sm mt-1">
                    {item.mode || "-"} • {item.print_type === "single" ? "Single Side" : item.print_type === "double" ? "Double Side" : item.print_type || "-"}
                  </p>
                  {item.leave_date && (
                    <p className="text-white/40 text-xs mt-1">
                      Leave: {item.leave_date}{item.leave_to_date ? ` to ${item.leave_to_date}` : ""}
                    </p>
                  )}
                  {item.request_reason && (
                    <p className="text-white/40 text-xs mt-1">
                      Reason: {item.request_reason}
                    </p>
                  )}
                  {item.upload && (
                    <p className="text-white/40 text-xs mt-1">
                      Pages: {item.upload.total_pages}
                    </p>
                  )}
                </div>
                <p className="text-yellow-400 font-bold text-lg whitespace-nowrap">
                  ₹{Math.round(item.total_price || 0)}
                </p>
              </div>

              <div className="flex items-center justify-between mt-3">
                {/* Quantity Controls — Instant feedback */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item, item.quantity - 1)}
                    className="cart-qty-btn"
                    aria-label="Decrease quantity"
                  >
                    <span className="cart-qty-icon">−</span>
                  </button>

                  <span className="cart-qty-display">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => updateQuantity(item, item.quantity + 1)}
                    className="cart-qty-btn"
                    aria-label="Increase quantity"
                  >
                    <span className="cart-qty-icon">+</span>
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  disabled={removingId === item.id}
                  className="text-red-400/70 text-sm font-medium hover:text-red-400 transition disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {cart.length > 0 && (
          <>
            <div className="premium-card sticky bottom-20 bg-white/5 border border-white/10 rounded-2xl p-4 mt-6 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-white/50 text-sm">Total</p>
                <p className="text-2xl font-bold text-yellow-400">₹{Math.round(total)}</p>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="mt-6 w-full bg-yellow-400 text-black py-3 rounded-xl font-semibold hover:bg-yellow-300 transition"
            >
              Proceed to Checkout
            </button>
          </>
        )}
      </div>

      <style>{`
        .cart-qty-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
          user-select: none;
          -webkit-user-select: none;
          will-change: transform;
        }

        .cart-qty-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(250, 204, 21, 0.35);
        }

        .cart-qty-btn:active {
          transform: scale(0.88);
          background: rgba(250, 204, 21, 0.15);
        }

        .cart-qty-icon {
          line-height: 1;
          font-weight: 600;
        }

        .cart-qty-display {
          min-width: 32px;
          text-align: center;
          font-size: 15px;
          font-weight: 700;
          color: white;
          user-select: none;
        }
      `}</style>
    </div>
  )
}

export default Cart
