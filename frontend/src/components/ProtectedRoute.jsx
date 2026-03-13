import { Navigate } from "react-router-dom"
import { getUserRole, isLoggedIn } from "../utils/auth"

function ProtectedRoute({ children, role = null }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  const userRole = getUserRole()

  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role]
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />
    }
  }

  return children
}

export default ProtectedRoute
