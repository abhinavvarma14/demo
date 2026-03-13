import { Search } from "lucide-react"
import { motion } from "framer-motion"

function SearchBar({ value, onChange, placeholder = "Search books" }) {
  return (
    <motion.div
      whileFocus={{ scale: 1.01 }}
      className="relative"
    >
      <motion.div
        animate={value ? { boxShadow: "0 0 0 1px rgba(253,224,71,0.22), 0 20px 40px rgba(0,0,0,0.22)" } : { boxShadow: "0 18px 36px rgba(0,0,0,0.18)" }}
        transition={{ duration: 0.25 }}
        className="flex items-center rounded-full border border-white/30 bg-white/20 px-4 py-3 backdrop-blur-xl"
      >
        <Search size={18} className="text-white/55" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="ml-3 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45"
        />
      </motion.div>
    </motion.div>
  )
}

export default SearchBar
