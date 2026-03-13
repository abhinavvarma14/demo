import { ClipboardList, Home, ShoppingCart, User } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { isLoggedIn } from "../utils/auth"
import toast from "react-hot-toast"
import { useEffect, useState } from "react"
import API from "../api/api"

function MobileNav(){

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

if(location.pathname.startsWith("/admin")){
  return null
}

const active = (path) => location.pathname === path

const handleProfileClick = () => {

if(isLoggedIn()){
  navigate("/profile")
}
else{
  toast.error("Please login to continue")
  navigate("/login")
}

}

return(

<div className="fixed bottom-4 left-0 w-full flex justify-center z-50">

  <div
    className="
    w-[92%] max-w-[420px]
    bg-white/5 backdrop-blur-xl border border-white/10
    rounded-2xl px-8 py-3
    grid grid-cols-4 items-center
    shadow-lg
    "
  >

    {/* Home */}

    <button
      onClick={()=>navigate("/")}
      className={`flex flex-col items-center text-xs transition
      ${active("/") ? "text-yellow-400" : "text-gray-400"}`}
    >

      <Home size={22}/>

      Home

    </button>


    {/* Cart */}

    <button
      onClick={()=>navigate("/cart")}
      className={`relative flex flex-col items-center text-xs transition
      ${active("/cart") ? "text-yellow-400" : "text-gray-400"}`}
    >

      <ShoppingCart size={22}/>
      {cartCount > 0 && (
        <span className="absolute -top-1 right-2 min-w-4 h-4 px-1 rounded-full bg-yellow-400 text-black text-[10px] flex items-center justify-center">
          {cartCount}
        </span>
      )}

      Cart

    </button>

    <button
      onClick={()=>navigate("/orders")}
      className={`flex flex-col items-center text-xs transition
      ${active("/orders") ? "text-yellow-400" : "text-gray-400"}`}
    >

      <ClipboardList size={22}/>

      Orders

    </button>


    {/* Profile */}

    <button
      onClick={handleProfileClick}
      className={`flex flex-col items-center text-xs transition
      ${active("/profile") || active("/login") ? "text-yellow-400" : "text-gray-400"}`}
    >

      <User size={22}/>

      Profile

    </button>

  </div>

</div>

)

}

export default MobileNav
