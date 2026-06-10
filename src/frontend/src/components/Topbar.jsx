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
            <span className="user-name">{user?.fullName ?? 'Usuario del Sistema'}</span>
            <span className="user-role">{user?.role ?? 'Sin rol'}</span>
          </div>
          <div className="user-avatar" style={{ padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  )
}
