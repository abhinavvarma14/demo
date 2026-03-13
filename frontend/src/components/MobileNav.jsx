import { Home, ShoppingCart, User } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { isLoggedIn } from "../utils/auth"

function MobileNav(){

const navigate = useNavigate()
const location = useLocation()

if(location.pathname === "/admin"){
  return null
}

const active = (path) => location.pathname === path

const handleProfileClick = () => {

if(isLoggedIn()){
  navigate("/profile")
}
else{
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
    flex items-center justify-between
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
      className={`flex flex-col items-center text-xs transition
      ${active("/cart") ? "text-yellow-400" : "text-gray-400"}`}
    >

      <ShoppingCart size={22}/>

      Cart

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
