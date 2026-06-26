import { lazy, Suspense, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import BottomNav from "./components/BottomNav"
import ProtectedRoute from "./components/ProtectedRoute"
import Footer from "./components/Footer"
import StartupLoader from "./components/StartupLoader"
import { prefetchWhenIdle, routeLoaders } from "./utils/routePrefetch"

const Home = lazy(routeLoaders["/"])
const Signup = lazy(routeLoaders["/signup"])
const Admin = lazy(routeLoaders["/admin"])
const Orders = lazy(routeLoaders["/orders"])
const Profile = lazy(routeLoaders["/profile"])
const Upload = lazy(routeLoaders["/upload"])
const Cart = lazy(routeLoaders["/cart"])
const Checkout = lazy(routeLoaders["/checkout"])
const Login = lazy(routeLoaders["/login"])
const Delivery = lazy(routeLoaders["/delivery"])
const PrivacyPolicy = lazy(routeLoaders["/privacy-policy"])
const Terms = lazy(routeLoaders["/terms"])
const RefundPolicy = lazy(routeLoaders["/refund-policy"])
const Contact = lazy(routeLoaders["/contact"])

function RouteSkeleton() {
  return (
    <div className="px-4 pb-24 pt-28">
      <div className="mx-auto grid max-w-3xl gap-4">
        <div className="h-12 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
        <div className="h-36 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-32 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          <div className="h-32 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  const showBottomNav = !location.pathname.startsWith("/admin") && !location.pathname.startsWith("/delivery")

  useEffect(() => {
    prefetchWhenIdle(["/upload", "/cart", "/profile", "/orders"])
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            className="route-panel"
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Suspense fallback={<RouteSkeleton />}>
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
                  path="/admin/*"
                  element={
                    <ProtectedRoute role="admin">
                      <Admin />
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
            </Suspense>
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
      <StartupLoader />
      <AppRoutes />
    </BrowserRouter>

  )

}

export default App
