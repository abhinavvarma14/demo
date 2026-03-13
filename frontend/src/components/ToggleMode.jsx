import { memo } from "react"
import { motion } from "framer-motion"

const labels = {
  single: {
    short: "S",
    full: "Single",
  },
  double: {
    short: "D",
    full: "Double",
  },
}

function ToggleMode({ value, onChange, disabled = false }) {
  const current = labels[value] || labels.single
  const isDouble = value === "double"

  const handleToggle = () => {
    if (disabled) return
    onChange(isDouble ? "single" : "double")
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className="relative h-11 w-full rounded-full border border-white/10 bg-white/5 px-1.5 backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="pointer-events-none absolute inset-y-1 left-1 right-1"
      >
        <motion.div
          animate={{
            x: isDouble ? "84%" : "0%",
            scale: [1, 1.04, 1],
          }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="flex h-full w-[52%] items-center justify-center rounded-full border border-white/20 bg-white/10 px-2 shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
        >
          <motion.div
            layout
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/35 bg-white/25 text-xs font-bold text-white shadow-[0_8px_18px_rgba(255,255,255,0.15)] backdrop-blur-2xl"
          >
            {current.short}
          </motion.div>

          <motion.span
            key={value}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22 }}
            className="ml-2 whitespace-nowrap text-xs font-semibold text-white"
          >
            {current.full}
          </motion.span>
        </motion.div>
      </motion.div>
    </button>
  )
}

export default memo(ToggleMode)
