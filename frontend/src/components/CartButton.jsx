import { memo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ShoppingCart, Sparkles } from "lucide-react"

function CartButton({ hasAdded, quantity, loading, onClick, pulseKey }) {
  return (
    <div className="relative">
      {!hasAdded ? (
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          animate={loading ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          type="button"
          onClick={onClick}
          disabled={loading}
          className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-yellow-400/35 bg-black px-3 py-2 text-xs font-semibold text-yellow-400 transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          <motion.div
            initial={false}
            animate={{ x: loading ? [0, 2, -2, 0] : 0 }}
            transition={{ duration: 0.35 }}
            className="mr-2 flex items-center"
          >
            <ShoppingCart size={16} />
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${loading}-${quantity}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {loading ? "Adding..." : "Add to Cart"}
            </motion.span>
          </AnimatePresence>

          <span className="ml-2">
            <Sparkles size={14} />
          </span>
        </motion.button>
      ) : (
        <div className="grid grid-cols-[1fr,1.2fr] gap-2">
          <div className="flex items-center justify-center rounded-2xl border border-yellow-400/35 bg-black px-3 py-2 text-xs font-semibold text-yellow-400">
            <Check size={14} className="mr-1.5" />
            Added
          </div>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            type="button"
            onClick={onClick}
            disabled={loading}
          className="flex items-center justify-center rounded-2xl bg-yellow-400 px-3 py-2 text-xs font-semibold text-black shadow-[0_6px_14px_rgba(250,204,21,0.14)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Adding..." : `Add More (${quantity})`}
          </motion.button>
        </div>
      )}

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
