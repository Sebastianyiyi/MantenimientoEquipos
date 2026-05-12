import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ roles }) {
  const { user, token } = useAuth()

  // No hay sesión en absoluto
  if (!user || !token) return <Navigate to="/login" replace />

  // Tiene sesión pero el rol no está permitido
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/sin-acceso" replace />
  }

  return <Outlet />
}