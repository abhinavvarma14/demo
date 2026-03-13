import { memo, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { isLoggedIn } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"
import ModeToggle from "./ModeToggle"
import PrintTypeToggle from "./PrintTypeToggle"
import CartButton from "./CartButton"
import QuantityControl from "./QuantityControl"

function BookCard({ book }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [hasAdded, setHasAdded] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })
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

  const handleTilt = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    setTilt({
      rotateX: (0.5 - py) * 8,
      rotateY: (px - 0.5) * 10,
    })
  }

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.01 }}
      animate={tilt}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      onMouseMove={handleTilt}
      onMouseLeave={() => setTilt({ rotateX: 0, rotateY: 0 })}
      style={{ transformStyle: "preserve-3d", perspective: 1200 }}
      className="group relative overflow-hidden rounded-2xl border border-white/30 bg-white/20 p-3 shadow-lg backdrop-blur-lg"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(250,204,21,0.16),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_32%)] opacity-80" />

      <div className="relative">
        <div className="absolute right-0 top-0 rounded-full bg-white/40 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
          {book.year || "N/A"}
        </div>

        <div className="flex items-start justify-between gap-3 pr-12">
          <div>
            <h2 className="text-sm font-semibold text-white sm:text-base leading-tight">
              {book.name}
            </h2>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Price
            </p>
            <p className="mt-1 text-2xl font-semibold text-yellow-300">
              ₹{selectedOption?.price || 0}
            </p>
            <p className="mt-1 text-[11px] text-white/45">
              {book.pages ? `${book.pages} pages` : "Campus print edition"}
            </p>
          </div>

          <div className="text-right text-[11px] text-white/50">
            <p>{quantity} copy{quantity > 1 ? "ies" : ""}</p>
            <p className="mt-1 text-white/35">Print ready</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/40">
              Side
            </p>
            <ModeToggle
              value={selectedPrintType}
              onChange={setSelectedPrintType}
              disabled={!selectedOption}
            />
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/40">
              Type
            </p>
            <PrintTypeToggle
              value={selectedMode}
              onChange={setSelectedMode}
              disabled={!selectedOption || modes.length === 0}
            />
          </div>
        </div>

        {hasAdded && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/40">
              Copies
            </p>
            <QuantityControl
              quantity={quantity}
              visible={hasAdded}
              onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
              onIncrease={() => setQuantity((current) => current + 1)}
            />
          </div>
        )}

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
