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
          className="flex items-center justify-between gap-2 rounded-2xl bg-white/5 px-2 py-1.5 backdrop-blur-xl"
        >
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
            Copies
          </span>

          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onDecrease}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-white"
            >
              <Minus size={14} />
            </motion.button>

            <motion.div
              key={quantity}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-w-6 text-center text-sm font-semibold text-white"
            >
              {quantity}
            </motion.div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onIncrease}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-black shadow-[0_8px_16px_rgba(250,204,21,0.14)]"
            >
              <Plus size={14} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default memo(QuantityControl)
