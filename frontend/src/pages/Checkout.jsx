import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { getApiErrorMessage } from "../utils/apiError"

function Checkout() {
  const hostelOptions = [
    "Himalaya",
    "Lotus",
    "Tulip",
    "Aravali",
    "Vindhya",
    "Kailash",
    "Outside Hostel",
  ]

  const navigate = useNavigate()
  const [deliveryType, setDeliveryType] = useState("hostel")
  const [hostel, setHostel] = useState("Himalaya")
  const [contact, setContact] = useState("")
  const [alternate, setAlternate] = useState("")
  const [total, setTotal] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [paymentStarted, setPaymentStarted] = useState(false)
  const [utr, setUtr] = useState("")
  const [paymentMessage, setPaymentMessage] = useState("")
  const [formError, setFormError] = useState("")
  const [utrError, setUtrError] = useState("")

  const normalizePhoneInput = (value) => value.replace(/\D/g, "").slice(0, 10)

  const upiLink = useMemo(() => {
    const amount = Number(total || 0).toFixed(2)
    return `upi://pay?pa=yourupi@upi&pn=BatPrint&am=${encodeURIComponent(amount)}&cu=INR`
  }, [total])

  useEffect(() => {
    const loadCartTotal = async () => {
      try {
        const res = await API.get("/cart")
        setTotal(res.data.total_amount)
      } catch (error) {
        console.log(error)
        if (error.response?.status === 401) {
          toast.error("Please login to continue")
          navigate("/login")
        } else {
          toast.error(getApiErrorMessage(error))
        }
      }
    }

    loadCartTotal()
  }, [navigate])

  const handlePay = async () => {
    setFormError("")
    if (!localStorage.getItem("token")) {
      toast.error("Please login to continue")
      navigate("/login")
      return
    }

    if (deliveryType === "hostel" && !hostel.trim()) {
      toast.error("Please enter hostel name")
      return
    }

    if (!contact.trim()) {
      setFormError("Contact number is required")
      toast.error("Contact number is required")
      return
    }

    if (!/^\d{10}$/.test(contact)) {
      setFormError("Contact number must be exactly 10 digits")
      toast.error("Contact number must be exactly 10 digits")
      return
    }

    if (alternate && !/^\d{10}$/.test(alternate)) {
      setFormError("Alternate number must be exactly 10 digits")
      toast.error("Alternate number must be exactly 10 digits")
      return
    }

    try {
      setSubmitting(true)
      setPaymentMessage("")
      setPaymentStarted(true)

      toast.success("Opening UPI app")

      const openLink = () => {
        const anchor = document.createElement("a")
        anchor.href = upiLink
        anchor.setAttribute("rel", "noopener")
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      }

      setTimeout(openLink, 100)
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Unable to open UPI payment"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitPayment = (e) => {
    e.preventDefault()
    setUtrError("")

    if (!utr.trim()) {
      setUtrError("Please enter UTR / Transaction ID")
      toast.error("Please enter UTR / Transaction ID")
      return
    }

    setPaymentMessage("✅ Payment submitted successfully. Verification in progress")
    toast.success("Payment submitted successfully")
  }

  return (
    <div className="pt-24 pb-28 px-4">
      <h1 className="mb-6 text-2xl font-bold text-yellow-400">Checkout</h1>

      <div className="mb-6">
        <p className="mb-2 text-sm text-gray-400">Delivery Type</p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeliveryType("hostel")}
            className={`rounded-xl border px-4 py-2 ${
              deliveryType === "hostel"
                ? "border-yellow-400 text-yellow-400"
                : "border-white/10"
            }`}
          >
            Hostel
          </button>

          <button
            onClick={() => setDeliveryType("dayscholar")}
            className={`rounded-xl border px-4 py-2 ${
              deliveryType === "dayscholar"
                ? "border-yellow-400 text-yellow-400"
                : "border-white/10"
            }`}
          >
            Day Scholar
          </button>
        </div>
      </div>

      {deliveryType === "hostel" && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-gray-400">Hostel Name</p>
          <select
            value={hostel}
            onChange={(e) => setHostel(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
          >
            {hostelOptions.map((option) => (
              <option key={option} value={option} className="bg-black text-white">
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <p className="mb-2 text-sm text-gray-400">Contact Number</p>
        <input
          value={contact}
          onChange={(e) => setContact(normalizePhoneInput(e.target.value))}
          inputMode="numeric"
          maxLength={10}
          placeholder="Enter 10-digit number"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
        />
      </div>

      <div className="mb-6">
        <p className="mb-2 text-sm text-gray-400">Alternate Number</p>
        <input
          value={alternate}
          onChange={(e) => setAlternate(normalizePhoneInput(e.target.value))}
          inputMode="numeric"
          maxLength={10}
          placeholder="Optional 10-digit number"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-gray-400">Total Amount</p>
        <p className="text-2xl font-bold text-yellow-400">₹{total}</p>
      </div>

      <button
        onClick={handlePay}
        disabled={submitting || total <= 0}
        className="mt-6 w-full rounded-xl bg-yellow-400 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Opening UPI..." : "Pay via UPI"}
      </button>

      {formError && (
        <p className="mt-3 text-sm font-medium text-red-500">{formError}</p>
      )}

      {paymentStarted && (
        <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-white/5 p-4 backdrop-blur">
          <h2 className="text-xl font-bold text-yellow-400">
            Complete Your Payment
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            After completing payment, paste your UTR (Transaction ID) below
          </p>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-gray-300">
            <p className="font-semibold text-white">UPI Deep Link</p>
            <p className="mt-1 break-all text-xs text-gray-400">{upiLink}</p>
          </div>

          <form onSubmit={handleSubmitPayment} className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Enter UTR / Transaction ID
              </label>
              <input
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Enter UTR / Transaction ID"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
              />
              {utrError && (
                <p className="mt-2 text-sm text-red-500">{utrError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-yellow-400 py-3 font-semibold text-black transition hover:bg-yellow-300"
            >
              Submit Payment
            </button>
          </form>

          {/* TODO: Replace with actual UTR guide image */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/10 text-yellow-400">
                ↑
              </div>
              <div>
                <p className="font-semibold text-white">
                  Find UTR in PhonePe / GPay payment details
                </p>
                <p className="text-xs text-gray-400">
                  UTR is usually listed in the transaction or payment reference
                  section.
                </p>
              </div>
            </div>

            <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-yellow-400/20 bg-white/5 text-center text-sm text-gray-400">
              UTR guide image placeholder
            </div>
          </div>

          {paymentMessage && (
            <p className="mt-4 text-sm font-medium text-green-400">
              {paymentMessage}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default Checkout
