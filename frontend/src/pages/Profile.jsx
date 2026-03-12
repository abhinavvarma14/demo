import { useEffect, useState } from "react"
import API from "../api/api"

function Profile(){

const [orders,setOrders] = useState([])
const [username,setUsername] = useState("")

const fetchProfile = async () => {

try{

  const res = await API.get("/me")

  setUsername(res.data.username)

}
catch(err){

  console.log(err)

}

}

const fetchOrders = async () => {

try{

  const res = await API.get("/my-orders")

  setOrders(res.data)

}
catch(err){

  console.log(err)

}

}

useEffect(()=>{

fetchProfile()
fetchOrders()

},[])

return(

<div className="pt-24 px-4 pb-24">

  <h1 className="text-2xl font-bold text-yellow-400 mb-4">

    My Profile

  </h1>

  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">

    <p className="text-gray-400 text-sm">
      Username
    </p>

    <p className="text-lg font-semibold">
      {username}
    </p>

  </div>

  <h2 className="text-xl font-semibold mb-4">

    My Orders

  </h2>

  {orders.length === 0 && (

    <p className="text-gray-400">

      No orders yet

    </p>

  )}

  {orders.map((order)=>(
    
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
