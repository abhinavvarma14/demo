import { Home, ShoppingCart, User } from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import API from "../api/api"
import { isLoggedIn } from "../utils/auth"
import toast from "react-hot-toast"

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const fetchCartCount = async () => {
      if (!isLoggedIn()) {
        setCartCount(0)
        return
      }

      try {
        const res = await API.get("/cart")
        setCartCount((res.data.items || []).length)
      } catch {
        setCartCount(0)
      }
    }

    fetchCartCount()
  }, [location.pathname])

  if (location.pathname.startsWith("/admin")) {
    return null
  }

  const isActive = (path) => location.pathname === path

  const goToProfile = () => {
    if (!isLoggedIn()) {
      toast.error("Please login to continue")
      navigate("/login")
      return
    }
    navigate("/profile")
  }

  const items = [
    { label: "Home", icon: Home, onClick: () => navigate("/"), active: isActive("/") },
    { label: "Cart", icon: ShoppingCart, onClick: () => navigate("/cart"), active: isActive("/cart"), badge: cartCount },
    { label: "Profile", icon: User, onClick: goToProfile, active: isActive("/profile") || isActive("/login") },
  ]

  return (
    <div className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid min-w-[280px] grid-cols-3 rounded-full border border-yellow-400/35 bg-black px-1.5 py-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]"
      >
        {items.map((item) => {
          const Icon = item.icon
          return (
            <motion.button
              key={item.label}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={item.onClick}
              className={`relative flex flex-col items-center gap-0.5 rounded-full px-3 py-1 text-[10px] transition ${
                item.active ? "border border-yellow-400/35 bg-yellow-400/10 text-yellow-400" : "text-gray-400"
              }`}
            >
              <Icon size={16} />
              {item.badge > 0 && (
                <span className="absolute right-3 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-yellow-400 px-1 text-[9px] font-bold text-black">
                  {item.badge}
                </span>
              )}
              <span>{item.label}</span>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}

export default BottomNav
