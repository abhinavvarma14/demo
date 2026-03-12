import { BrowserRouter, Routes, Route } from "react-router-dom"
import Signup from "./pages/Signup"
import Admin from "./pages/Admin"
import Navbar from "./components/Navbar"
import MobileNav from "./components/MobileNav"
import Orders from "./pages/Orders"
import Profile from "./pages/Profile"
import Home from "./pages/Home"
import Upload from "./pages/Upload"
import Cart from "./pages/Cart"
import Checkout from "./pages/Checkout"
import Login from "./pages/Login"


function App() {

  return (

    <BrowserRouter>

      {/* Animated Glass Background */}
  

      {/* Top Navigation */}
      <Navbar />

      {/* App Routes */}
      <Routes>

        <Route path="/" element={<Home />} />
<Route path="/signup" element={<Signup />} />
        <Route path="/upload" element={<Upload />} />
<Route path="/profile" element={<Profile />} />
        <Route path="/cart" element={<Cart />} />

        <Route path="/checkout" element={<Checkout />} />

        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<Admin />} />

        <Route path="/orders" element={<Orders />} />

      </Routes>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

    </BrowserRouter>

  )

}

export default App