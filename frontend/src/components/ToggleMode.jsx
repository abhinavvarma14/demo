import { memo } from "react"
import { motion } from "framer-motion"

const labels = {
  single: {
    full: "Single",
  },
  double: {
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
      className="relative h-8 w-full rounded-full bg-black px-1 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="pointer-events-none absolute inset-y-1 left-1 right-1"
      >
        <motion.div
          animate={{
            x: isDouble ? "92%" : "0%",
            scale: [1, 1.04, 1],
          }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="flex h-full w-[48%] items-center justify-center rounded-full bg-yellow-400 px-2 shadow-[0_6px_14px_rgba(250,204,21,0.14)]"
        >
          <motion.span
            key={value}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22 }}
            className="whitespace-nowrap text-[10px] font-semibold text-black"
          >
            {current.full}
          </motion.span>
        </motion.div>
      </motion.div>
    </button>
  )
}

export default memo(ToggleMode)
