import { Navigate } from "react-router-dom"
import { getUserRole, isLoggedIn } from "../utils/auth"

function ProtectedRoute({ children, role = null }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  if (role && getUserRole() !== role) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
