import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, CheckCircle2, Copy, Check } from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"

import API from "../api/api"
import { isLoggedIn } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

const UPI_ID = "9052612456-3@ybl"
const hostelOptions = ["Himalaya", "Lotus", "Tulip", "Aravali", "Vindhya", "Kailash", "Outside Hostel"]

function CopyIcon({ value, label }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      toast.success(`${label} copied`, { duration: 1400, style: { fontSize: "13px" } })
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}`)
    }
  }, [value, label])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="copy-icon-btn"
      aria-label={`Copy ${label}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <Check className="h-4 w-4 text-green-400" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <Copy className="h-4 w-4 text-white/50" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

function SuccessScreen() {
  return (
    <motion.div
      className="success-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="success-glow" />
      <motion.div
        className="success-card"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
      >
        <motion.div
          className="success-check-ring"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.3, type: "spring", stiffness: 180, damping: 14 }}
        >
          <CheckCircle2 className="h-16 w-16 text-green-400" strokeWidth={1.5} />
        </motion.div>

        <motion.h1
          className="mt-6 text-center text-2xl font-bold text-white sm:text-3xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
        >
          Thank You For Placing Your Order
        </motion.h1>

        <motion.p
          className="mt-3 text-center text-sm text-white/50 sm:text-base"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.35 }}
        >
          Refer BatPrint to your friends and help them print smarter.
        </motion.p>

        <motion.div
          className="success-confetti"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {[...Array(12)].map((_, i) => (
            <span key={i} className="confetti-dot" style={{ "--i": i }} />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function Checkout() {
  const navigate = useNavigate()
  const [step, setStep] = useState("payment")
  const [form, setForm] = useState({
    userName: "",
    contact: "",
    alternate: "",
    deliveryType: "hostel",
    hostel: "",
    utrNumber: "",
    transactionId: "",
  })
  const [total, setTotal] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const amount = useMemo(() => Math.max(0, Math.round(Number(total || 0))), [total])
  const upiUrl = useMemo(() => {
    const params = new URLSearchParams({
      pa: UPI_ID,
      am: String(amount),
      cu: "INR",
      tn: "BatPrint order payment",
    })
    return `upi://pay?${params.toString()}`
  }, [amount])
  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(upiUrl)}`,
    [upiUrl]
  )

  const normalizePhoneInput = (value) => value.replace(/\D/g, "").slice(0, 10)

  useEffect(() => {
    const loadCartTotal = async () => {
      if (!isLoggedIn()) {
        navigate("/login", { replace: true })
        return
      }

      try {
        const res = await API.get("/cart")
        const nextTotal = Number(res.data.total_amount || 0)
        setTotal(nextTotal)
        if (nextTotal <= 0) {
          toast.error("Your cart is empty")
          navigate("/cart", { replace: true })
        }
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

  const validateVerification = () => {
    if (!form.userName.trim()) return "Please enter your name"
    if (!/^\d{10}$/.test(form.contact)) return "Phone number must be exactly 10 digits"
    if (form.alternate && !/^\d{10}$/.test(form.alternate)) return "Alternate number must be exactly 10 digits"
    if (form.deliveryType === "hostel" && !form.hostel.trim()) return "Please select a hostel"
    if (!form.utrNumber.trim()) return "UTR number is required"
    if (!form.transactionId.trim()) return "Transaction ID is required"
    if (amount <= 0) return "Cart total is empty"
    return ""
  }

  const submitVerification = async () => {
    if (!isLoggedIn()) {
      toast.error("Please login to continue")
      navigate("/login")
      return
    }

    const validationMessage = validateVerification()
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }

    try {
      setSubmitting(true)
      const orderResponse = await API.post("/orders", {
        user_name: form.userName.trim(),
        delivery_type: form.deliveryType,
        hostel_name: form.deliveryType === "hostel" ? form.hostel : null,
        contact_number: form.contact,
        alternate_contact_number: form.alternate || null,
      })

      const verificationResponse = await API.post("/payment/submit-verification", {
        order_id: orderResponse.data.order_id,
        utr_number: form.utrNumber.trim(),
        transaction_id: form.transactionId.trim(),
      })

      if (verificationResponse.data?.success === false) {
        toast.error(verificationResponse.data.message || "Payment details rejected")
        return
      }

      setStep("success")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Unable to submit payment details"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 pb-28 pt-24">
      <div className="mx-auto max-w-6xl">
        {step !== "success" && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">Secure UPI Checkout</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Payment Checkout</h1>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === "payment" && (
            <motion.section
              key="payment"
              className="premium-card payment-shell overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f12] p-5 md:p-7"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.34, ease: "easeOut" }}
            >
              <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
                <div className="space-y-5">
                  {/* Amount Card */}
                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-100/60">Amount To Pay</p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-5xl font-black text-yellow-300">₹{amount}</p>
                      <CopyIcon value={amount} label="Amount" />
                    </div>
                  </div>

                  {/* Info Cards */}
                  <div className="grid gap-3 text-sm text-white/70">
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <ShieldCheck className="h-5 w-5 shrink-0 text-yellow-300" />
                      <span>UPI ID and amount are embedded in the QR code.</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-300" />
                      <span>After payment, submit your UTR and transaction ID for admin verification.</span>
                    </div>
                  </div>

                  {/* UPI Card */}
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/45">UPI ID</p>

                    <div className="mt-1 flex items-center gap-3">
                      <p className="break-all text-lg font-semibold text-white">{UPI_ID}</p>
                      <CopyIcon value={UPI_ID} label="UPI ID" />
                    </div>
                  </div>

                  {/* Mobile: UPI deep link only on mobile */}
                  <div className="mobile-payment-actions">
                    <a
                      href={upiUrl}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-400/15"
                    >
                      Pay with UPI App
                    </a>
                  </div>

                  {/* Paid Button */}
                  <button
                    type="button"
                    onClick={() => setStep("verify")}
                    className="paid-btn w-full rounded-xl bg-yellow-400 px-5 py-4 text-lg font-bold text-black transition hover:bg-yellow-300"
                  >
                    Paid
                  </button>
                </div>

                {/* Desktop QR */}
                <motion.div
                  className="desktop-qr-card relative hidden rounded-3xl border border-yellow-400/25 bg-black/35 p-6 lg:block"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.42, ease: "easeOut", delay: 0.08 }}
                >
                  <div className="qr-shimmer" />
                  <div className="relative rounded-2xl bg-white p-4">
                    <img src={qrUrl} alt="BatPrint UPI QR code" className="mx-auto h-[330px] w-[330px]" />
                  </div>
                  <div className="relative mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-green-200">
                    <ShieldCheck className="h-4 w-4" />
                    Secure UPI payment
                  </div>
                </motion.div>
              </div>
            </motion.section>
          )}

          {step === "verify" && (
            <motion.section
              key="verify"
              className="premium-card rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-300/70">Payment Confirmation</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Submit your order details</h2>
                </div>
                <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-right">
                  <p className="text-xs text-yellow-100/60">Paid Amount</p>
                  <p className="text-2xl font-black text-yellow-300">₹{amount}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm text-white/55">Name</span>
                  <input
                    value={form.userName}
                    onChange={(event) => updateForm("userName", event.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-yellow-400/70"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm text-white/55">Phone Number</span>
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

                <label>
                  <span className="mb-2 block text-sm text-white/55">UTR Number</span>
                  <input
                    value={form.utrNumber}
                    onChange={(event) => updateForm("utrNumber", event.target.value)}
                    placeholder="Enter UTR number"
                    className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-yellow-400/70"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm text-white/55">Transaction ID</span>
                  <input
                    value={form.transactionId}
                    onChange={(event) => updateForm("transactionId", event.target.value)}
                    placeholder="Enter transaction ID"
                    className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-yellow-400/70"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setStep("payment")}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white"
                >
                  Back
                </button>
                <button
                  onClick={submitVerification}
                  disabled={submitting}
                  className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Verification"}
                </button>
              </div>
            </motion.section>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <SuccessScreen />
              <motion.div
                className="mt-8 flex justify-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.35 }}
              >
                <button
                  onClick={() => navigate("/orders")}
                  className="rounded-xl bg-yellow-400 px-8 py-3 font-semibold text-black transition hover:bg-yellow-300"
                >
                  View My Orders
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          .payment-shell,
          .desktop-qr-card {
            will-change: transform, opacity;
          }

          .desktop-qr-card::before {
            content: "";
            position: absolute;
            inset: -1px;
            border-radius: inherit;
            background: linear-gradient(135deg, rgba(250, 204, 21, 0.42), transparent 32%, rgba(255, 255, 255, 0.1), transparent 68%, rgba(250, 204, 21, 0.25));
            opacity: 0.72;
            pointer-events: none;
          }

          .qr-shimmer {
            position: absolute;
            inset: 0;
            overflow: hidden;
            border-radius: inherit;
            pointer-events: none;
          }

          .qr-shimmer::after {
            content: "";
            position: absolute;
            inset: -45% auto -45% -40%;
            width: 42%;
            transform: translate3d(-120%, 0, 0) rotate(18deg);
            background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.16), transparent);
            animation: qr-sweep 4.8s ease-in-out infinite;
            will-change: transform;
          }

          @keyframes qr-sweep {
            0%, 28% { transform: translate3d(-120%, 0, 0) rotate(18deg); }
            70%, 100% { transform: translate3d(420%, 0, 0) rotate(18deg); }
          }

          .copy-icon-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.06);
            cursor: pointer;
            transition: background 160ms ease, border-color 160ms ease, transform 140ms ease;
            flex-shrink: 0;
          }

          .copy-icon-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(250, 204, 21, 0.35);
          }

          .copy-icon-btn:active {
            transform: scale(0.92);
          }

          .paid-btn {
            position: relative;
            overflow: hidden;
          }

          .paid-btn::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
            transform: translateX(-100%);
            transition: transform 0s;
          }

          .paid-btn:hover::after {
            transform: translateX(100%);
            transition: transform 0.6s ease;
          }

          .mobile-payment-actions {
            display: block;
          }

          @media (min-width: 1024px) {
            .mobile-payment-actions {
              display: none;
            }
          }

          /* Success Screen */
          .success-screen {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 420px;
            padding: 40px 16px;
          }

          .success-glow {
            position: absolute;
            width: 320px;
            height: 320px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(74, 222, 128, 0.15), transparent 65%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            animation: success-pulse 3s ease-in-out infinite;
          }

          .success-card {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 480px;
            width: 100%;
            padding: 40px 28px;
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.1);
            background: linear-gradient(180deg, rgba(255,255,255,0.06), transparent 40%), rgba(10,10,10,0.9);
            box-shadow: 0 24px 80px rgba(0,0,0,0.35);
          }

          .success-check-ring {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 88px;
            height: 88px;
            border-radius: 999px;
            background: rgba(74, 222, 128, 0.1);
            border: 2px solid rgba(74, 222, 128, 0.25);
          }

          .success-confetti {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
            border-radius: inherit;
          }

          .confetti-dot {
            position: absolute;
            width: 5px;
            height: 5px;
            border-radius: 999px;
            opacity: 0;
            animation: confetti-burst 2s ease-out forwards;
            animation-delay: calc(var(--i) * 80ms + 300ms);
          }

          .confetti-dot:nth-child(odd) {
            background: rgba(250, 204, 21, 0.7);
          }
          .confetti-dot:nth-child(even) {
            background: rgba(74, 222, 128, 0.6);
          }
          .confetti-dot:nth-child(3n) {
            background: rgba(255, 255, 255, 0.4);
          }

          .confetti-dot:nth-child(1) { left: 15%; top: 20%; }
          .confetti-dot:nth-child(2) { left: 80%; top: 15%; }
          .confetti-dot:nth-child(3) { left: 45%; top: 10%; }
          .confetti-dot:nth-child(4) { left: 70%; top: 75%; }
          .confetti-dot:nth-child(5) { left: 25%; top: 80%; }
          .confetti-dot:nth-child(6) { left: 90%; top: 45%; }
          .confetti-dot:nth-child(7) { left: 10%; top: 55%; }
          .confetti-dot:nth-child(8) { left: 55%; top: 85%; }
          .confetti-dot:nth-child(9) { left: 35%; top: 5%; }
          .confetti-dot:nth-child(10) { left: 65%; top: 30%; }
          .confetti-dot:nth-child(11) { left: 85%; top: 65%; }
          .confetti-dot:nth-child(12) { left: 20%; top: 40%; }

          @keyframes confetti-burst {
            0% {
              opacity: 0;
              transform: translate3d(0, 0, 0) scale(0);
            }
            30% {
              opacity: 1;
              transform: translate3d(
                calc((var(--i) - 6) * 8px),
                calc((var(--i) - 6) * -12px),
                0
              ) scale(1.3);
            }
            100% {
              opacity: 0;
              transform: translate3d(
                calc((var(--i) - 6) * 16px),
                calc((var(--i) - 6) * -8px + 30px),
                0
              ) scale(0.4);
            }
          }

          @keyframes success-pulse {
            0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.08); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default Checkout


