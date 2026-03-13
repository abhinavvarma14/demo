import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import toast from "react-hot-toast"
import { getUsername } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

function Profile(){
const navigate = useNavigate()

const [orders,setOrders] = useState([])
const [username,setUsername] = useState(getUsername() || "")
const [loading, setLoading] = useState(true)

const fetchProfile = async () => {

try{

  const res = await API.get("/me")

  setUsername(res.data.username)

}
catch(err){

  console.log(err)
  toast.error(getApiErrorMessage(err))

}

}

const fetchOrders = async () => {

try{

  const res = await API.get("/my-orders")

  setOrders(res.data)

}
catch(err){

  console.log(err)
  toast.error(getApiErrorMessage(err))

} finally {
  setLoading(false)
}

}

useEffect(()=>{

fetchProfile()
fetchOrders()

},[])

const handleLogout = () => {
  localStorage.removeItem("token")
  toast.success("Logged out successfully")
  navigate("/login")
}

return(

<div className="pt-24 px-4 pb-24">

  <h1 className="text-2xl font-bold text-yellow-400 mb-4">

    My Profile

  </h1>

  <p className="text-gray-300 mb-4">
    Hello, {username || "there"}
  </p>

  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">

    <p className="text-gray-400 text-sm">
      Username
    </p>

    <p className="text-lg font-semibold">
      {username}
    </p>

    <p className="text-gray-500 text-sm mt-2">
      Total Orders: {orders.length}
    </p>

  </div>

  <button
    onClick={handleLogout}
    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mb-6 text-left"
  >
    Logout
  </button>

  <h2 className="text-xl font-semibold mb-4">

    Recent Orders

  </h2>

  {loading && (
    <>
      {[1, 2].map((item) => (
        <div key={item} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3 h-24 animate-pulse" />
      ))}
    </>
  )}

  {!loading && orders.length === 0 && (

    <p className="text-gray-400">

      No orders yet

    </p>

  )}

  {!loading && orders.slice(0, 3).map((order)=>(
    
    <div
    key={order.id}
    className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3"
    >

    <p className="text-gray-300">
      Order ID: {order.id}
    </p>

    <p className="text-yellow-400">
      ₹{order.total_amount}
    </p>

    <p className="text-gray-400 text-sm">
      Status: {order.status}
    </p>

    <div className="mt-3 space-y-2">
      {(order.items || []).map((item)=>(
        <p key={item.id} className="text-gray-500 text-sm">
          {item.item_name || "Unnamed item"} • ₹{item.total_price}
        </p>
      ))}
    </div>

    </div>

  ))}

</div>

)

}

export default Profile
