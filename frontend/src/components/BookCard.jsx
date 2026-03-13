import { memo, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { isLoggedIn } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"
import ToggleMode from "./ToggleMode"
import CartButton from "./CartButton"
import QuantityControl from "./QuantityControl"

const prettyMode = (value) => {
  if (value === "black_white") return "B/W"
  if (value === "color") return "Color"
  return value
}

function BookCard({ book }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [hasAdded, setHasAdded] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)
  const options = Array.isArray(book?.options) ? book.options : []
  const modes = useMemo(() => [...new Set(options.map((option) => option.mode))], [options])
  const [selectedMode, setSelectedMode] = useState(options[0]?.mode || "")
  const [selectedPrintType, setSelectedPrintType] = useState("single")

  const availableOptions = useMemo(
    () => options.filter((option) => option.mode === selectedMode),
    [options, selectedMode]
  )

  const selectedOption =
    availableOptions.find((option) => option.print_type === selectedPrintType) ||
    availableOptions[0] ||
    options[0]

  useEffect(() => {
    if (!selectedMode && modes.length > 0) {
      setSelectedMode(modes[0])
    }
  }, [modes, selectedMode])

  useEffect(() => {
    if (availableOptions.length === 0) {
      setSelectedPrintType("single")
      return
    }

    const matchingOption = availableOptions.find(
      (option) => option.print_type === selectedPrintType
    )

    if (!matchingOption) {
      setSelectedPrintType(availableOptions[0].print_type)
    }
  }, [availableOptions, selectedPrintType])

  const addToCart = async () => {
    if (!selectedOption) {
      toast.error("Pricing unavailable for this book")
      return
    }

    if (!isLoggedIn()) {
      toast.error("Please login to continue")
      navigate("/login")
      return
    }

    try {
      setSubmitting(true)
      await API.post("/cart/items", {
        item_type: "book",
        book_id: book.id,
        mode: selectedOption.mode,
        print_type: selectedOption.print_type,
        quantity,
      })
      setHasAdded(true)
      setPulseKey((current) => current + 1)
      toast.success(`${book.name} added to cart`)
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to add book"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative overflow-hidden rounded-[28px] border border-white/12 bg-white/8 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur-lg sm:p-5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(250,204,21,0.16),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_32%)] opacity-80" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
              {book.year || "Edition"}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">
              {book.name}
            </h2>
          </div>

          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-xl">
            {modes.length} modes
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Starting at
            </p>
            <p className="mt-2 text-3xl font-semibold text-yellow-300">
              ₹{selectedOption?.price || 0}
            </p>
          </div>

          <div className="text-right text-sm text-white/55">
            <p>Per bundle</p>
            <p className="mt-1 text-xs text-white/40">
              Smooth bulk print ordering
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {modes.map((mode) => {
            const active = mode === selectedMode
            return (
              <motion.button
                whileTap={{ scale: 0.97 }}
                key={mode}
                type="button"
                onClick={() => setSelectedMode(mode)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-yellow-300/30 bg-yellow-400 text-black shadow-[0_14px_28px_rgba(250,204,21,0.24)]"
                    : "border-white/12 bg-white/8 text-white/75 backdrop-blur-xl"
                }`}
              >
                {prettyMode(mode)}
              </motion.button>
            )
          })}
        </div>

        <div className="mt-5">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-white/40">
            Print Style
          </p>
          <ToggleMode
            value={selectedPrintType}
            onChange={setSelectedPrintType}
            disabled={!selectedOption}
          />
        </div>

        <div className="mt-4">
          <QuantityControl
            quantity={quantity}
            visible={hasAdded}
            onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
            onIncrease={() => setQuantity((current) => current + 1)}
          />
        </div>

        <div className="mt-4">
          <CartButton
            hasAdded={hasAdded}
            quantity={quantity}
            loading={submitting}
            onClick={addToCart}
            pulseKey={pulseKey}
          />
        </div>
      </div>
    </motion.article>
  )
}

export default memo(BookCard)
