import { memo } from "react"
import { motion } from "framer-motion"

const labels = {
  black_white: {
    short: "B",
    full: "B/W",
  },
  color: {
    short: "C",
    full: "Color",
  },
}

function PrintTypeToggle({ value, onChange, disabled = false }) {
  const current = labels[value] || labels.black_white
  const isColor = value === "color"

  const handleToggle = () => {
    if (disabled) return
    onChange(isColor ? "black_white" : "color")
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className="relative w-full rounded-full border border-white/10 bg-white/5 px-2 py-2 backdrop-blur-xl shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
        <span>B</span>
        <span>C</span>
      </div>

      <motion.div
        animate={{ x: isColor ? "100%" : "0%" }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="absolute inset-y-1 left-1 flex w-[58%] items-center rounded-full border border-white/20 bg-white/10 px-3 shadow-[0_12px_30px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
      >
        <motion.div
          layout
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-white/30 text-sm font-bold text-white"
        >
          {current.short}
        </motion.div>

        <motion.span
          key={value}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="ml-2 whitespace-nowrap text-sm font-semibold text-white"
        >
          {current.full}
        </motion.span>
      </motion.div>
    </button>
  )
}

export default memo(PrintTypeToggle)
