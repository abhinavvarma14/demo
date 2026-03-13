import { memo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ShoppingCart, Sparkles } from "lucide-react"

function CartButton({ hasAdded, quantity, loading, onClick, pulseKey }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10
    setOffset({ x, y })
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        animate={
          loading
            ? { scale: [1, 1.02, 1], x: offset.x, y: offset.y }
            : { scale: hasAdded ? [1, 1.02, 1] : 1, x: offset.x, y: offset.y }
        }
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        type="button"
        onClick={onClick}
        onMouseMove={handleMove}
        onMouseLeave={() => setOffset({ x: 0, y: 0 })}
        disabled={loading}
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
          hasAdded
            ? "border-yellow-400/30 bg-gradient-to-r from-yellow-400 to-yellow-300 text-black shadow-[0_18px_36px_rgba(250,204,21,0.28)]"
            : "border-white/15 bg-white/10 text-white backdrop-blur-xl shadow-[0_18px_38px_rgba(0,0,0,0.22)]"
        } disabled:cursor-not-allowed disabled:opacity-70`}
      >
        <motion.div
          initial={false}
          animate={{ x: loading ? [0, 2, -2, 0] : 0 }}
          transition={{ duration: 0.35 }}
          className="mr-2 flex items-center"
        >
          {hasAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${hasAdded}-${loading}-${quantity}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {loading ? "Adding..." : hasAdded ? `Add More (${quantity})` : "Add to Cart"}
          </motion.span>
        </AnimatePresence>

        <motion.span
          animate={hasAdded ? { x: [0, 4, 0], opacity: [1, 0.7, 1] } : { x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="ml-2"
        >
          <Sparkles size={16} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {pulseKey > 0 && (
          <>
            <motion.div
              key={`label-${pulseKey}`}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: -22, scale: 1 }}
              exit={{ opacity: 0, y: -36, scale: 0.88 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-none absolute right-3 top-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl"
            >
              Added ✓
            </motion.div>
            <motion.div
              key={`plus-${pulseKey}`}
              initial={{ opacity: 0, y: 0, x: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], y: -36, x: 16, scale: 1.05 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="pointer-events-none absolute right-10 top-4 text-xs font-bold text-yellow-400"
            >
              +1
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(CartButton)
