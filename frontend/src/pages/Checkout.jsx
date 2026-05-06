import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"

import API from "../api/api"
import { getApiErrorMessage } from "../utils/apiError"

const UPI_ID = "9052612456-3@ybl"
const hostelOptions = ["Himalaya", "Lotus", "Tulip", "Aravali", "Vindhya", "Kailash", "Outside Hostel"]

function Checkout() {
  const navigate = useNavigate()
  const [step, setStep] = useState("details")
  const [form, setForm] = useState({
    userName: "",
    contact: "",
    alternate: "",
    deliveryType: "hostel",
    hostel: "",
  })
  const [paymentForm, setPaymentForm] = useState({
    utrNumber: "",
    transactionId: "",
  })
  const [total, setTotal] = useState(0)
  const [orderId, setOrderId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const amount = useMemo(() => Math.max(0, Math.round(Number(total || 0))), [total])
  const normalizePhoneInput = (value) => value.replace(/\D/g, "").slice(0, 10)

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

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const validateDetails = () => {
    if (!form.userName.trim()) return "Please enter your name"
    if (!/^\d{10}$/.test(form.contact)) return "Contact number must be exactly 10 digits"
    if (form.alternate && !/^\d{10}$/.test(form.alternate)) return "Alternate number must be exactly 10 digits"
    if (form.deliveryType === "hostel" && !form.hostel.trim()) return "Please select a hostel"
    if (amount <= 0) return "Cart total is empty"
    return ""
  }

  const createOrder = async () => {
    const validationMessage = validateDetails()
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }

    try {
      setSubmitting(true)
      const res = await API.post("/orders", {
        user_name: form.userName.trim(),
        delivery_type: form.deliveryType,
        hostel_name: form.deliveryType === "hostel" ? form.hostel : null,
        contact_number: form.contact,
        alternate_contact_number: form.alternate || null,
      })
      setOrderId(res.data.order_id)
      setStep("payment")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Unable to create order"))
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value))
      toast.success(`${label} copied`)
    } catch (error) {
      console.log(error)
      toast.error(`Unable to copy ${label.toLowerCase()}`)
    }
  }

  const openUpiApp = () => {
    toast("Open your UPI app and pay manually to the copied UPI ID.")
  }

  const submitVerification = async () => {
    if (!paymentForm.utrNumber.trim()) {
      toast.error("UTR number is required")
      return
    }
    if (!paymentForm.transactionId.trim()) {
      toast.error("Transaction ID is required")
      return
    }
    if (!orderId) {
      toast.error("Order not found")
      return
    }

    try {
      setSubmitting(true)
      const res = await API.post("/payment/submit-verification", {
        order_id: orderId,
        utr_number: paymentForm.utrNumber.trim(),
        transaction_id: paymentForm.transactionId.trim(),
      })
      if (res.data?.success === false) {
        toast.error(res.data.message || "Payment details rejected")
        return
      }
      toast.success("Payment details submitted")
      navigate("/orders")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Unable to submit payment details"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 pb-28 pt-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">Manual Payment</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Checkout</h1>
        </div>

        {step === "details" && (
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm text-white/55">Name</span>
                <input
                  value={form.userName}
                  onChange={(event) => updateForm("userName", event.target.value)}
                  placeholder="Enter name as per UPI"
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-yellow-400/70"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm text-white/55">Contact Number</span>
                <input
                  value={form.contact}
                  onChange={(event) => updateForm("contact", normalizePhoneInput(event.target.value))}
                  inputMode="numeric"
                  placeholder="10-digit number"
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-yellow-400/70"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm text-white/55">Alternate Number</span>
                <input
                  value={form.alternate}
                  onChange={(event) => updateForm("alternate", normalizePhoneInput(event.target.value))}
                  inputMode="numeric"
                  placeholder="Optional"
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-yellow-400/70"
                />
              </label>

              <div>
                <span className="mb-2 block text-sm text-white/55">Delivery Type</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["hostel", "Hostel"],
                    ["dayscholar", "Day Scholar"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("deliveryType", value)}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        form.deliveryType === value
                          ? "border-yellow-400 bg-yellow-400 text-black"
                          : "border-white/10 bg-white/5 text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label>
                <span className="mb-2 block text-sm text-white/55">Hostel</span>
                <select
                  value={form.hostel}
                  onChange={(event) => updateForm("hostel", event.target.value)}
                  disabled={form.deliveryType !== "hostel"}
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none disabled:opacity-50"
                >
                  <option value="" className="bg-black">Select hostel</option>
                  {hostelOptions.map((option) => (
                    <option key={option} value={option} className="bg-black">
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-yellow-100/70">Amount</p>
                <p className="text-3xl font-bold text-yellow-300">₹{amount}</p>
              </div>
              <button
                type="button"
                onClick={createOrder}
                disabled={submitting || amount <= 0}
                className="rounded-xl bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </section>
        )}

        {step === "payment" && (
          <section className="rounded-2xl border border-white/10 bg-[#101216] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-100/60">Amount To Pay</p>
              <p className="mt-2 text-5xl font-black text-yellow-300">₹{amount}</p>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm text-white/50">UPI ID</p>
                <p className="mt-1 break-all text-xl font-semibold text-white">{UPI_ID}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button onClick={() => copyToClipboard(UPI_ID, "UPI ID")} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-semibold text-white">
                  Copy UPI ID
                </button>
                <button onClick={() => copyToClipboard(amount, "Amount")} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-semibold text-white">
                  Copy Amount
                </button>
                <button onClick={openUpiApp} className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 font-semibold text-yellow-200">
                  Open UPI App
                </button>
                <button onClick={() => setStep("verify")} className="rounded-xl bg-yellow-400 px-4 py-3 font-semibold text-black">
                  I Have Paid
                </button>
              </div>
            </div>
          </section>
        )}

        {step === "verify" && (
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <h2 className="text-2xl font-bold text-white">Submit Payment Details</h2>
            <div className="mt-5 grid gap-4">
              <label>
                <span className="mb-2 block text-sm text-white/55">UTR Number</span>
                <input
                  value={paymentForm.utrNumber}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, utrNumber: event.target.value }))}
                  placeholder="Enter UTR number"
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-yellow-400/70"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm text-white/55">Transaction ID</span>
                <input
                  value={paymentForm.transactionId}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, transactionId: event.target.value }))}
                  placeholder="Enter transaction ID"
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-yellow-400/70"
                />
              </label>

              <button
                onClick={submitVerification}
                disabled={submitting}
                className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Verification"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default Checkout
