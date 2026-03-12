import { useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"

function BookCard({ book }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const options = Array.isArray(book?.options) ? book.options : []
  const [selectedMode, setSelectedMode] = useState(options[0]?.mode || "")
  const initialPrintType =
    options.find((option) => option.mode === selectedMode)?.print_type || ""
  const [selectedPrintType, setSelectedPrintType] = useState(initialPrintType)

  const printTypes = options
    .filter((option) => option.mode === selectedMode)
    .map((option) => option.print_type)

  const selectedOption =
    options.find(
      (option) =>
        option.mode === selectedMode && option.print_type === selectedPrintType
    ) || options[0]

  const modes = [...new Set(options.map((option) => option.mode))]

  const addToCart = async () => {
    if (!selectedOption) {
      toast.error("Pricing unavailable for this book")
      return
    }

    if (!localStorage.getItem("token")) {
      toast.error("Please login first")
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
      toast.success(`${book.name} added to cart`)
    } catch (error) {
      console.log(error)
      toast.error(error.response?.data?.detail || "Failed to add book")
    } finally {
      setSubmitting(false)
    }
  }

  const handleModeChange = (event) => {
    const nextMode = event.target.value
    setSelectedMode(nextMode)
    const nextPrintType =
      options.find((option) => option.mode === nextMode)?.print_type || ""
    setSelectedPrintType(nextPrintType)
  }

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 hover:border-yellow-400 transition">
      <h2 className="text-lg font-semibold">{book.name}</h2>
      <p className="text-gray-400 text-sm">{book.year}</p>

      <p className="text-yellow-400 mt-2 font-bold">
        ₹{selectedOption?.price || 0}
      </p>

      <div className="mt-3 space-y-3">
        <select
          value={selectedMode}
          onChange={handleModeChange}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm"
        >
          {modes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>

        <select
          value={selectedPrintType}
        onChange={(event) => setSelectedPrintType(event.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm"
        disabled={printTypes.length === 0}
      >
          {printTypes.map((printType) => (
            <option key={printType} value={printType}>
              {printType === "single" ? "Single Side" : printType === "double" ? "Double Side" : printType}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm"
        />
      </div>

      <button
        onClick={addToCart}
        disabled={submitting || !selectedOption}
        className="mt-3 w-full py-2 rounded-xl font-medium transition bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-60"
      >
        {submitting ? "Adding..." : "Add To Cart"}
      </button>
    </div>
  )
}

export default BookCard
