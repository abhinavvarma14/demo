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
import ProtectedRoute from "./components/ProtectedRoute"


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
<Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <Admin defaultSection="orders" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/books"
          element={
            <ProtectedRoute role="admin">
              <Admin defaultSection="books" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/print-queue"
          element={
            <ProtectedRoute role="admin">
              <Admin defaultSection="printQueue" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

      </Routes>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

    </BrowserRouter>

  )

}

export default App
