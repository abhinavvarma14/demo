import { useLocation, useNavigate } from "react-router-dom"

function Navbar(){

  const navigate = useNavigate()
  const location = useLocation()

  if (location.pathname.startsWith("/admin")) {
    return null
  }

  return(

    <div className="fixed top-3 left-1/2 z-50 flex -translate-x-1/2 justify-center px-4">

      <div className="w-full max-w-[460px] relative
      bg-white/5 backdrop-blur-xl border border-white/10
      rounded-full px-5 py-3 flex items-center justify-center shadow-lg">

        <div
          onClick={()=>navigate("/")}
          className="
          flex items-center gap-2 cursor-pointer"
        >
          <span className="text-yellow-400 text-lg">🦇</span>
          <span className="text-yellow-400 font-bold text-lg tracking-[0.24em] uppercase">
            BatPrint
          </span>
        </div>

      </div>

    </div>

  )

}

export default Navbar
