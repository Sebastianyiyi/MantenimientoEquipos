import { useAuth } from '../contexts/AuthContext'
import './Topbar.css'

export default function Topbar() {
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumbs">
          <span className="breadcrumb-item">Universidad Técnica de Ambato</span>
          <span className="breadcrumb-sep">|</span>
          <span className="breadcrumb-item active">FISEI - Sistema de Mantenimiento</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-user">
          <div className="user-info">
            <span className="user-name">{user?.nombre ?? 'Usuario del Sistema'}</span>
            <span className="user-role">{user?.rol ?? 'Sin rol'}</span>
          </div>
          <div className="user-avatar">
            {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
