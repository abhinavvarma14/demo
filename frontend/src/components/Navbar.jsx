import { useLocation, useNavigate } from "react-router-dom"
import { User } from "lucide-react"

function Navbar(){

  const navigate = useNavigate()
  const location = useLocation()

  if (location.pathname.startsWith("/admin")) {
    return null
  }

  return(

    <div className="fixed top-4 left-0 w-full flex justify-center z-50">

      <div className="w-[92%] max-w-[420px] relative
      bg-white/5 backdrop-blur-xl border border-white/10
      rounded-2xl px-4 py-3 flex items-center justify-end">

        {/* Center Logo */}

        <div
          onClick={()=>navigate("/")}
          className="absolute left-1/2 transform -translate-x-1/2
          flex items-center gap-2 cursor-pointer"
        >
          <span className="text-yellow-400 text-lg">🦇</span>
          <span className="text-yellow-400 font-bold text-lg">
            BatPrint
          </span>
        </div>

        {/* Login Button */}

        <button
          onClick={()=>navigate("/login")}
          className="text-gray-300 hover:text-yellow-400 transition"
        >
          <User size={20}/>
        </button>

      </div>

    </div>

  )

}

export default Navbar
