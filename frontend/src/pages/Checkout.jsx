import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"

import API from "../api/api"
import { getApiErrorMessage } from "../utils/apiError"

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
const UPI_ID = "9052612456-3@ybl"
const UPI_NAME = "BatPrint"

function Checkout() {
  const hostelOptions = ["Himalaya", "Lotus", "Tulip", "Aravali", "Vindhya", "Kailash", "Outside Hostel"]

  const navigate = useNavigate()
  const redirectTriggeredRef = useRef(false)

  const [userName, setUserName] = useState("")
  const [deliveryType, setDeliveryType] = useState("hostel")
  const [hostel, setHostel] = useState("")
  const [contact, setContact] = useState("")
  const [alternate, setAlternate] = useState("")
  const [total, setTotal] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [uniqueAmount, setUniqueAmount] = useState(0)
  const [upiLink, setUpiLink] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("pending")
  const [orderState, setOrderState] = useState("form")
  const [formError, setFormError] = useState("")

  const normalizePhoneInput = (value) => value.replace(/\D/g, "").slice(0, 10)
  const paymentAmount = useMemo(
    () => Math.max(1, Math.round(Number(uniqueAmount > 0 ? uniqueAmount : Number(total || 0)))),
    [total, uniqueAmount]
  )

  const qrCodeUrl = useMemo(() => {
    if (!upiLink) return ""
    return `https://quickchart.io/qr?size=320&text=${encodeURIComponent(upiLink)}`
  }, [upiLink])

  const resolvedUpiLink = useMemo(() => {
    if (upiLink) return upiLink
    return `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${encodeURIComponent(String(paymentAmount))}&cu=INR`
  }, [paymentAmount, upiLink])

  const copyToClipboard = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value))
      toast.success(`${label} copied`)
    } catch (error) {
      console.log(error)
      toast.error(`Unable to copy ${label.toLowerCase()}`)
    }
  }

  const loadOrderStatus = async (currentOrderId) => {
    if (!currentOrderId) return
    try {
      const res = await API.get(`/order/status/${currentOrderId}`)
      const nextStatus = (res.data?.payment_status || res.data?.status || "pending").toLowerCase()
      setPaymentStatus(nextStatus)
      if (nextStatus === "success") {
        setOrderState("success")
      }
      if (nextStatus === "failed") {
        setOrderState("failed")
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    const loadCartTotal = async () => {
      try {
        const res = await API.get("/cart")
        setTotal(Number(res.data.total_amount || 0))
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

  useEffect(() => {
    if (!orderId || orderState === "success" || orderState === "failed") {
      return undefined
    }

    let active = true
    const refresh = async () => {
      if (!active) return
      await loadOrderStatus(orderId)
    }

    refresh()
    const interval = window.setInterval(refresh, 5000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [orderId, orderState])

  const validateInputs = () => {
    if (!userName.trim()) return "Please enter your name"
    if (!contact.trim()) return "Contact number is required"
    if (!/^\d{10}$/.test(contact)) return "Contact number must be exactly 10 digits"
    if (alternate && !/^\d{10}$/.test(alternate)) return "Alternate number must be exactly 10 digits"
    if (deliveryType === "hostel" && !hostel.trim()) return "Please select a hostel"
    if (!total || total <= 0) return "Cart total is empty"
    return ""
  }

  const startPayment = async () => {
    const validationMessage = validateInputs()
    if (validationMessage) {
      setFormError(validationMessage)
      toast.error(validationMessage)
      return
    }

    if (!localStorage.getItem("token")) {
      toast.error("Please login to continue")
      navigate("/login")
      return
    }

    try {
      setSubmitting(true)
      setFormError("")
      redirectTriggeredRef.current = false
      setOrderState("paying")

      const res = await API.post("/order/create", {
        user_name: userName.trim(),
        phone_number: contact.trim(),
        hostel: deliveryType === "hostel" ? hostel : "Day Scholar",
        delivery_type: deliveryType,
        amount: Number(total),
        alternate_number: alternate.trim() || null,
      })

      setOrderId(res.data.order_id)
      setUniqueAmount(Number(res.data.unique_amount || total))
      setUpiLink(res.data.upi_link || "")
      setPaymentStatus((res.data.payment_status || "pending").toLowerCase())
      toast.success("Payment link ready")
    } catch (error) {
      console.log(error)
      setOrderState("form")
      toast.error(getApiErrorMessage(error, "Unable to create payment order"))
    } finally {
      setSubmitting(false)
    }
  }

  const checkAgain = async () => {
    if (!orderId) {
      toast.error("Order not found")
      return
    }
    try {
      setSubmitting(true)
      await loadOrderStatus(orderId)
      toast.success("Checking payment status again")
    } finally {
      setSubmitting(false)
    }
  }

  const openUpiApp = () => {
    if (!resolvedUpiLink) {
      toast.error("Payment link not ready yet")
      return
    }
    window.location.href = resolvedUpiLink
  }

  return (
    <div className="px-4 pb-28 pt-24">
      <h1 className="mb-6 text-2xl font-bold text-yellow-400">Checkout</h1>

      <div className="rounded-[28px] border border-white/10 bg-[#111111] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        {orderState === "form" && (
          <div className="grid gap-4">
            <div>
              <p className="mb-2 text-sm text-white/55">Your Name</p>
              <input
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                placeholder="Enter name as per UPI"
                className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white outline-none"
              />
            </div>

            <div>
              <p className="mb-2 text-sm text-white/55">Delivery Type</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryType("hostel")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    deliveryType === "hostel"
                      ? "border-yellow-400 bg-yellow-400 text-black"
                      : "border-white/10 bg-white/5 text-white"
                  }`}
                >
                  Hostel
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("dayscholar")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    deliveryType === "dayscholar"
                      ? "border-yellow-400 bg-yellow-400 text-black"
                      : "border-white/10 bg-white/5 text-white"
                  }`}
                >
                  Day Scholar
                </button>
              </div>
            </div>

            {deliveryType === "hostel" && (
              <div>
                <p className="mb-2 text-sm text-white/55">Hostel</p>
                <select
                  value={hostel}
                  onChange={(event) => setHostel(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white outline-none"
                >
                  <option value="" className="bg-black text-white">
                    Select hostel
                  </option>
                  {hostelOptions.map((option) => (
                    <option key={option} value={option} className="bg-black text-white">
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm text-white/55">Contact Number</p>
              <input
                value={contact}
                onChange={(event) => setContact(normalizePhoneInput(event.target.value))}
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter 10-digit number"
                className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white outline-none"
              />
            </div>

            <div>
              <p className="mb-2 text-sm text-white/55">Alternate Number</p>
              <input
                value={alternate}
                onChange={(event) => setAlternate(normalizePhoneInput(event.target.value))}
                inputMode="numeric"
                maxLength={10}
                placeholder="Optional 10-digit number"
                className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-white/55">Cart Total</p>
              <p className="text-2xl font-semibold text-yellow-400">?{Math.round(Number(total || 0))}</p>
            </div>

            {formError && <p className="text-sm font-medium text-red-500">{formError}</p>}

            <button
              onClick={startPayment}
              disabled={submitting || total <= 0}
              className="w-full rounded-xl bg-yellow-400 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating Payment..." : "Confirm"}
            </button>
          </div>
        )}

        {orderState === "paying" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">Payment Ready</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Send exactly ?{paymentAmount}</h2>
              <p className="mt-1 text-sm text-white/65">Pay within 5 minutes</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-white/55">Amount to pay</p>
              <p className="text-3xl font-bold text-yellow-400">?{paymentAmount}</p>
            </div>

            {isMobile ? (
              <p className="text-sm text-white/65">Tap the button below to open your UPI app manually.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-3">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="UPI QR Code" className="mx-auto h-64 w-64" />
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                    QR will appear after the payment link is ready.
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-white/65">
              Status: <span className="capitalize text-yellow-300">{paymentStatus}</span>
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(UPI_ID, "UPI ID")}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
              >
                Copy UPI ID
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(paymentAmount, "Amount")}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
              >
                Copy Amount
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={openUpiApp}
                className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 font-semibold text-yellow-300"
              >
                Open UPI App
              </button>
              <button
                onClick={checkAgain}
                disabled={submitting}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Checking..." : "Paid already?"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/contact")}
                className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-yellow-300"
              >
                Need help?
              </button>
            </div>
          </div>
        )}

        {orderState === "success" && (
          <div className="mt-5 rounded-[24px] border border-green-400/20 bg-green-400/10 p-5">
            <h2 className="text-xl font-semibold text-green-300">Order Placed Successfully</h2>
            <p className="mt-2 text-sm text-green-100/80">Payment has been confirmed. We&apos;re preparing your order now.</p>
            <button
              onClick={() => navigate("/orders")}
              className="mt-4 rounded-xl bg-green-400 px-4 py-2 font-semibold text-black"
            >
              View Orders
            </button>
          </div>
        )}

        {orderState === "failed" && (
          <div className="mt-5 rounded-[24px] border border-red-400/20 bg-red-400/10 p-5">
            <h2 className="text-xl font-semibold text-red-300">Payment failed</h2>
            <p className="mt-2 text-sm text-red-100/80">The payment window expired or the backend could not confirm the payment yet.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/contact")}
                className="rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-black"
              >
                Paid already? Contact support
              </button>
              <button
                onClick={openUpiApp}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-semibold text-white"
              >
                Open UPI Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Checkout
