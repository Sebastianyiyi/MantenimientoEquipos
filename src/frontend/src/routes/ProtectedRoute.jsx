import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ roles }) {
  const { user, token } = useAuth()

  if (!user || !token) return <Navigate to="/login" replace />

  if (roles) {
    const userRole = user.role?.trim().toLowerCase()
    const allowed = roles.map(r => r.trim().toLowerCase())
    if (!allowed.includes(userRole)) {
      return <Navigate to="/sin-acceso" replace />
    }
  }

  return <Outlet />
}