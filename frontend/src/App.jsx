import { AnimatePresence, motion } from "framer-motion"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import Signup from "./pages/Signup"
import Admin from "./pages/Admin"
import Navbar from "./components/Navbar"
import BottomNav from "./components/BottomNav"
import Orders from "./pages/Orders"
import Profile from "./pages/Profile"
import Home from "./pages/Home"
import Upload from "./pages/Upload"
import Cart from "./pages/Cart"
import Checkout from "./pages/Checkout"
import Login from "./pages/Login"
import ProtectedRoute from "./components/ProtectedRoute"
import Delivery from "./pages/Delivery"
import { getUserRole } from "./utils/auth"
import PrivacyPolicy from "./pages/PrivacyPolicy"
import Terms from "./pages/Terms"
import RefundPolicy from "./pages/RefundPolicy"
import Contact from "./pages/Contact"
import Footer from "./components/Footer"
function AppRoutes() {
  const location = useLocation()
  const userRole = getUserRole()
  const showBottomNav = !["admin", "delivery"].includes(userRole || "")

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.24 }}
          >
            <Routes location={location}>
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
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/contact" element={<Contact />} />
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
              <Route
                path="/delivery"
                element={
                  <ProtectedRoute role={["admin", "delivery"]}>
                    <Delivery />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {showBottomNav && <BottomNav />}
      <Footer />
    </div>
  )
}

function App() {

  return (

    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>

  )

}

export default App
