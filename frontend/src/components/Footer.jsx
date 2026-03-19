import { Link } from "react-router-dom"

function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-white/5 backdrop-blur text-center text-xs text-gray-400">
      <div className="mx-auto max-w-5xl px-4 py-3 pb-20">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Link className="hover:text-yellow-400 transition" to="/privacy-policy">
            Privacy Policy
          </Link>
          <span className="text-white/20">|</span>
          <Link className="hover:text-yellow-400 transition" to="/terms">
            Terms
          </Link>
          <span className="text-white/20">|</span>
          <Link className="hover:text-yellow-400 transition" to="/refund-policy">
            Refund Policy
          </Link>
          <span className="text-white/20">|</span>
          <Link className="hover:text-yellow-400 transition" to="/contact">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
