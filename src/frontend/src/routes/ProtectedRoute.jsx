import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * ProtectedRoute — redirige a /login si no autenticado,
 * a /sin-acceso si el rol no está permitido.
 * Si no se pasan `roles`, cualquier usuario autenticado puede entrar.
 */
export default function ProtectedRoute({ roles }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.rol)) {
    return <Navigate to="/sin-acceso" replace />
  }

  return <Outlet />
}
