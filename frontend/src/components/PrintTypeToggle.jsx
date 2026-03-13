import { memo } from "react"
import { motion } from "framer-motion"

function PrintTypeToggle({ value, onChange, disabled = false, options = [] }) {
  const normalizedOptions = options.filter(Boolean)
  const activeOptions = normalizedOptions.length > 0 ? normalizedOptions : ["A", "R"]
  const selectedIndex = Math.max(activeOptions.indexOf(value), 0)
  const current = activeOptions[selectedIndex] || activeOptions[0]

  const handleToggle = () => {
    if (disabled) return
    const nextIndex = (selectedIndex + 1) % activeOptions.length
    onChange(activeOptions[nextIndex])
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className="relative h-8 w-full rounded-full bg-black px-1 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <motion.div
        animate={{ x: selectedIndex > 0 ? "92%" : "0%", scale: [1, 1.04, 1] }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="absolute inset-y-1 left-1 flex w-[48%] items-center justify-center rounded-full bg-yellow-400 px-2 shadow-[0_6px_14px_rgba(250,204,21,0.14)]"
      >
        <motion.span
          key={value}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="whitespace-nowrap text-[10px] font-semibold text-black"
        >
          {current}
        </motion.span>
      </motion.div>
    </button>
  )
}

export default memo(PrintTypeToggle)
