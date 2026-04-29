import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { getApiErrorMessage } from "../utils/apiError"

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

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
  const redirectTriggeredRef = useRef(false)
  const [deliveryType, setDeliveryType] = useState("hostel")
  const [hostel, setHostel] = useState("Himalaya")
  const [contact, setContact] = useState("")
  const [alternate, setAlternate] = useState("")
  const [total, setTotal] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [upiLink, setUpiLink] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [formError, setFormError] = useState("")
  const [timeLeft, setTimeLeft] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState("WAITING_FOR_PAYMENT")

  const normalizePhoneInput = (value) => value.replace(/\D/g, "").slice(0, 10)
  const sessionExpired = Boolean(expiresAt) && timeLeft <= 0

  const formattedTimeLeft = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }, [timeLeft])

  const qrCodeUrl = useMemo(() => {
    if (!upiLink) return ""
    return `https://quickchart.io/qr?size=320&text=${encodeURIComponent(upiLink)}`
  }, [upiLink])

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

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(0)
      return undefined
    }

    const updateTime = () => {
      const expiresAtMs = new Date(expiresAt).getTime()
      const diff = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
      setTimeLeft(diff)
    }

    updateTime()
    const interval = window.setInterval(updateTime, 1000)
    return () => window.clearInterval(interval)
  }, [expiresAt])

  useEffect(() => {
    if (!orderId) {
      return undefined
    }

    const pollStatus = async () => {
      try {
        const res = await API.get("/my-orders")
        const currentOrder = (res.data || []).find((order) => order.id === orderId)
        if (!currentOrder) {
          return
        }
        setPaymentStatus(currentOrder.payment_status || "WAITING_FOR_PAYMENT")
        if (currentOrder.expires_at) {
          setExpiresAt(currentOrder.expires_at)
        }
      } catch (error) {
        console.log(error)
      }
    }

    pollStatus()
    const interval = window.setInterval(pollStatus, 7000)
    return () => window.clearInterval(interval)
  }, [orderId])

  useEffect(() => {
    if (!isMobile || !upiLink || redirectTriggeredRef.current || paymentStatus === "FAILED") {
      return
    }
    redirectTriggeredRef.current = true
    window.location.href = upiLink
  }, [upiLink, paymentStatus])

  useEffect(() => {
    if (paymentStatus === "SUCCESS" || paymentStatus === "LATE_SUCCESS") {
      toast.success("Payment confirmed")
      navigate("/orders")
    }
  }, [navigate, paymentStatus])

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
      redirectTriggeredRef.current = false
      const orderRes = await API.post("/orders", {
        delivery_type: deliveryType,
        hostel_name: deliveryType === "hostel" ? hostel : null,
        contact_number: contact,
        alternate_contact_number: alternate || null,
      })

      setOrderId(orderRes.data.order_id)
      setUpiLink(orderRes.data.upi_link || "")
      setExpiresAt(orderRes.data.expires_at || "")
      setPaymentStatus(orderRes.data.payment_status || "WAITING_FOR_PAYMENT")
      toast.success("Payment session started")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Unable to start payment"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetryPayment = async () => {
    if (!orderId) {
      toast.error("Order not found. Please start again.")
      return
    }

    try {
      setSubmitting(true)
      redirectTriggeredRef.current = false
      const res = await API.post(`/regenerate-payment/${orderId}`)
      setUpiLink(res.data.upi_link || "")
      setExpiresAt(res.data.expires_at || "")
      setPaymentStatus(res.data.payment_status || "WAITING_FOR_PAYMENT")
      toast.success("Payment session renewed")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to regenerate payment"))
    } finally {
      setSubmitting(false)
    }
  }

  const renderStatus = () => {
    if (paymentStatus === "VERIFYING_PAYMENT") {
      return "Verifying your payment..."
    }
    if (paymentStatus === "FAILED" || sessionExpired) {
      return "Session expired"
    }
    return "Waiting for payment confirmation..."
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
        <p className="text-sm text-gray-400">Cart Total</p>
        <p className="text-2xl font-bold text-yellow-400">Rs {Number(total || 0).toFixed(2)}</p>
      </div>

      <button
        onClick={handlePay}
        disabled={submitting || total <= 0 || Boolean(orderId && !sessionExpired && paymentStatus !== "FAILED")}
        className="mt-6 w-full rounded-xl bg-yellow-400 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Starting Payment..." : orderId && !sessionExpired && paymentStatus !== "FAILED" ? "Payment Session Active" : "Confirm Address"}
      </button>

      {formError && (
        <p className="mt-3 text-sm font-medium text-red-500">{formError}</p>
      )}

      {orderId && (
        <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-white/5 p-4 backdrop-blur">
          {isMobile ? (
            <>
              <h2 className="text-xl font-bold text-yellow-400">Redirecting to payment app...</h2>
              <p className="mt-2 text-sm text-gray-300">Complete payment in your UPI app</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-yellow-400">Scan using any UPI app</h2>
              <div className="mt-4 flex justify-center">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-3">
                  <img
                    src={qrCodeUrl}
                    alt="UPI QR Code"
                    className="h-64 w-64"
                  />
                </div>
              </div>
            </>
          )}

          {!sessionExpired && paymentStatus !== "FAILED" && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-center">
              <p className="text-sm text-gray-400">Session Expires In</p>
              <p className="mt-2 text-3xl font-bold text-white">{formattedTimeLeft}</p>
            </div>
          )}

          <p className="mt-4 text-center text-sm text-gray-300">
            {renderStatus()}
          </p>

          {(sessionExpired || paymentStatus === "FAILED") && (
            <button
              onClick={handleRetryPayment}
              disabled={submitting}
              className="mt-4 w-full rounded-xl bg-yellow-400 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:opacity-60"
            >
              {submitting ? "Retrying..." : "Retry Payment"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Checkout
