import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"

function Checkout() {
  const navigate = useNavigate()
  const [deliveryType, setDeliveryType] = useState("hostel")
  const [hostel, setHostel] = useState("")
  const [contact, setContact] = useState("")
  const [alternate, setAlternate] = useState("")
  const [total, setTotal] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadCartTotal = async () => {
      try {
        const res = await API.get("/cart")
        setTotal(res.data.total_amount)
      } catch (error) {
        console.log(error)
        if (error.response?.status === 401) {
          navigate("/login")
        }
      }
    }

    loadCartTotal()
  }, [navigate])

  const handlePayment = async () => {
    try {
      if (!localStorage.getItem("token")) {
        toast.error("Please login first")
        navigate("/login")
        return
      }

      setSubmitting(true)

      const orderRes = await API.post("/orders", {
        delivery_type: deliveryType,
        hostel_name: hostel,
        contact_number: contact,
        alternate_contact_number: alternate,
      })

      const order_id = orderRes.data.order_id
      const paymentRes = await API.post(`/payment/create/${order_id}`)

      const options = {
        key: "rzp_test_SNBhRNnAER1BwS",
        amount: paymentRes.data.amount,
        currency: "INR",
        name: "BatPrint",
        description: "Printing Payment",
        order_id: paymentRes.data.id,
        handler: async function (response) {
          await API.post("/payment/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })
          toast.success("Payment Successful")
          navigate("/orders")
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    }
    catch (error) {
      console.log(error)
      toast.error(error.response?.data?.detail || "Payment failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (

    <div className="pt-24 pb-24 px-4">

      <h1 className="text-2xl font-bold text-yellow-400 mb-6">
        Checkout
      </h1>


      {/* Delivery Type */}

      <div className="mb-6">

        <p className="text-gray-400 text-sm mb-2">
          Delivery Type
        </p>

        <div className="flex gap-3">

          <button
            onClick={() => setDeliveryType("hostel")}
            className={`px-4 py-2 rounded-xl border ${
              deliveryType === "hostel"
                ? "border-yellow-400 text-yellow-400"
                : "border-white/10"
            }`}
          >
            Hostel
          </button>


          <button
            onClick={() => setDeliveryType("dayscholar")}
            className={`px-4 py-2 rounded-xl border ${
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

          <p className="text-gray-400 text-sm mb-2">
            Hostel Name
          </p>

          <input
            value={hostel}
            onChange={(e) => setHostel(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
          />

        </div>

      )}



      <div className="mb-4">

        <p className="text-gray-400 text-sm mb-2">
          Contact Number
        </p>

        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
        />

      </div>



      <div className="mb-6">

        <p className="text-gray-400 text-sm mb-2">
          Alternate Number
        </p>

        <input
          value={alternate}
          onChange={(e) => setAlternate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
        />

      </div>



      {/* Total */}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">

        <p className="text-gray-400 text-sm">
          Total Amount
        </p>

        <p className="text-2xl font-bold text-yellow-400">
          ₹{total}
        </p>

      </div>



      <button
        onClick={handlePayment}
        disabled={submitting || total <= 0}
        className="mt-6 w-full bg-yellow-400 text-black py-3 rounded-xl font-semibold hover:bg-yellow-300 transition disabled:opacity-60"
      >
        {submitting ? "Processing..." : "Pay Now"}
      </button>

    </div>

  )

}

export default Checkout
