import { memo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus } from "lucide-react"

function QuantityControl({ quantity, onDecrease, onIncrease, visible }) {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="flex items-center justify-between rounded-2xl bg-white/5 px-2.5 py-2 backdrop-blur-xl"
        >
          <span className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
            Copies
          </span>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onDecrease}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white"
            >
              <Minus size={16} />
            </motion.button>

            <motion.div
              key={quantity}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-w-8 text-center text-base font-semibold text-white"
            >
              {quantity}
            </motion.div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onIncrease}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-black shadow-[0_10px_20px_rgba(250,204,21,0.18)]"
            >
              <Plus size={16} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default memo(QuantityControl)
