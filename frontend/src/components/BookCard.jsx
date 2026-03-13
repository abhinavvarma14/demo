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
  const normalizeModeValue = (value) => (typeof value === "string" ? value.trim() : "")
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [hasAdded, setHasAdded] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [leaveDate, setLeaveDate] = useState("")
  const [requestReason, setRequestReason] = useState("")
  const options = Array.isArray(book?.options) ? book.options : []
  const printTypeOptions = useMemo(
    () => [...new Set(options.map((option) => option.print_type || "").filter((value) => value !== undefined))],
    [options]
  )
  const modeOptions = useMemo(
    () => [...new Set(options.map((option) => normalizeModeValue(option.mode)).filter(Boolean))],
    [options]
  )
  const hasModeSelector = modeOptions.length > 0
  const hasSideSelector = printTypeOptions.some(Boolean)
  const isSimpleBook = !hasModeSelector && !hasSideSelector
  const requiresDetails = !!book?.requires_details
  const [selectedMode, setSelectedMode] = useState(normalizeModeValue(options[0]?.mode))
  const [selectedPrintType, setSelectedPrintType] = useState(options[0]?.print_type || "")

  const availableOptions = useMemo(() => {
    if (!hasModeSelector) {
      return options
    }

    return options.filter((option) => normalizeModeValue(option.mode) === selectedMode)
  }, [hasModeSelector, options, selectedMode])

  const selectedOption =
    availableOptions.find((option) => (option.print_type || "") === selectedPrintType) ||
    availableOptions[0] ||
    options[0]

  useEffect(() => {
    if (!selectedMode && modeOptions.length > 0) {
      setSelectedMode(modeOptions[0])
    }
  }, [modeOptions, selectedMode])

  useEffect(() => {
    if (availableOptions.length === 0) {
      setSelectedPrintType("")
      return
    }

    const matchingOption = availableOptions.find(
      (option) => (option.print_type || "") === selectedPrintType
    )

    if (!matchingOption) {
      setSelectedPrintType(availableOptions[0].print_type || "")
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

    if (requiresDetails && !showDetailsModal) {
      setShowDetailsModal(true)
      return
    }

    if (requiresDetails) {
      if (!leaveDate) {
        toast.error("Please enter your leave date")
        return
      }
      if (!requestReason.trim()) {
        toast.error("Please enter your reason")
        return
      }
    }

    try {
      setSubmitting(true)
      await API.post("/cart/items", {
        item_type: "book",
        book_id: book.id,
        mode: selectedOption.mode || undefined,
        print_type: selectedOption.print_type || undefined,
        quantity,
        leave_date: requiresDetails ? leaveDate : undefined,
        request_reason: requiresDetails ? requestReason.trim() : undefined,
      })
      setHasAdded(true)
      setPulseKey((current) => current + 1)
      setShowDetailsModal(false)
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
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative overflow-hidden rounded-2xl bg-[#111111] p-3 shadow-[0_18px_34px_rgba(0,0,0,0.24)]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.05),_transparent_28%)] opacity-70" />
      {isSimpleBook && (
        <>
          <div className="absolute -right-8 top-14 h-24 w-24 rounded-full bg-yellow-400/8 blur-2xl" />
          <div className="absolute left-4 top-16 h-px w-12 bg-yellow-400/20" />
          <div className="absolute left-4 top-20 h-px w-8 bg-white/10" />
          <div className="absolute left-4 top-24 h-px w-16 bg-white/5" />
        </>
      )}

      <div className="relative">
        <div className="absolute right-0 top-0 rounded-full bg-black px-2 py-1 text-[10px] font-semibold text-yellow-400">
          {book.year || "N/A"}
        </div>

        <div className="flex items-start justify-between gap-3 pr-12">
          <div>
            <h2 className="text-base font-semibold text-white sm:text-lg leading-tight">
              {book.name}
            </h2>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Price
            </p>
            <p className="mt-1 text-2xl font-semibold text-yellow-400">
              ₹{selectedOption?.price || 0}
            </p>
            {!isSimpleBook && (
              <p className="mt-1 text-[11px] text-white/45">
                {book.pages ? `${book.pages} pages` : "Campus print edition"}
              </p>
            )}
          </div>

          {!isSimpleBook ? (
            <div className="text-right text-[11px] text-white/50">
              <p>{quantity} copy{quantity > 1 ? "ies" : ""}</p>
              <p className="mt-1 text-white/35">Print ready</p>
            </div>
          ) : (
            <div className="text-right">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] font-medium text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400/70" />
                Ready to add
              </div>
            </div>
          )}
        </div>

        <div className={`mt-4 grid ${hasModeSelector && hasSideSelector ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
          {hasSideSelector && (
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
          )}

          {hasModeSelector && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/40">
                Mode
              </p>
              <PrintTypeToggle
                value={selectedMode}
                onChange={setSelectedMode}
                options={modeOptions}
                disabled={!selectedOption || modeOptions.length === 0}
              />
            </div>
          )}
        </div>

        {hasAdded && (
          <div className="mt-3">
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

        <div className="mt-3">
          <CartButton
            hasAdded={hasAdded}
            quantity={quantity}
            loading={submitting}
            onClick={addToCart}
            pulseKey={pulseKey}
          />
        </div>
      </div>

      {showDetailsModal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="w-full rounded-2xl bg-[#111111] p-4 shadow-[0_18px_34px_rgba(0,0,0,0.3)]">
            <p className="text-sm font-semibold text-white">
              Enter your leave date and reason
            </p>

            <input
              type="date"
              value={leaveDate}
              onChange={(event) => setLeaveDate(event.target.value)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"
            />

            <textarea
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              rows={3}
              placeholder="Reason you want this..."
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={addToCart}
                disabled={submitting}
                className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.article>
  )
}

export default memo(BookCard)
