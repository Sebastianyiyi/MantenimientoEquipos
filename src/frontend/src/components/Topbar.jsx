import { useAuth } from '../contexts/AuthContext'
import './Topbar.css'

export default function Topbar() {
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">Sistema de Mantenimiento</span>
      </div>
      <div className="topbar-right">
        <div className="topbar-user">
          <div className="user-avatar">
            {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.nombre ?? 'Usuario'}</span>
            <span className="user-role">{user?.rol ?? 'Sin rol'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}