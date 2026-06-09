import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMsal } from '@azure/msal-react'
import './Sidebar.css'

const navItems = [
  { to: '/dashboard', icon: 'layout-dashboard', label: 'Dashboard', roles: null },
  { to: '/equipos', icon: 'monitor', label: 'Gestión de Equipos', roles: null },
  { to: '/casos', icon: 'clipboard-list', label: 'Casos de Mantenimiento', roles: null },
  { to: '/reemplazo', icon: 'refresh-cw', label: 'Reemplazo de Equipos', roles: null },
  { to: '/catalogos', icon: 'list', label: 'Catálogos del Sistema', roles: ['Administrador'] },
  { to: '/usuarios', icon: 'users', label: 'Gestión de Usuarios', roles: ['Administrador'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { instance } = useMsal()
  
  const handleLogout = async () => {
    try {
      logout()

      const account = instance.getActiveAccount() || instance.getAllAccounts()[0]

      await instance.logoutRedirect({
        account,
        postLogoutRedirectUri: 'http://localhost:5173/login',
      })
    } catch (error) {
      console.error('[MSAL] Logout error:', error)
      window.location.href = '/login'
    }
  }

  const visibleItems = navItems.filter(item =>
    !item.roles || (user?.role && item.roles.includes(user.role))
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#C0191F" />
                <stop offset="100%" stopColor="#7A0B0E" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
            <path d="M16 6.5C18 7.5 21.5 8 24 8C24 14.5 21.5 19.5 16 25.5C10.5 19.5 8 14.5 8 8C10.5 8 14 7.5 16 6.5Z" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
            <circle cx="16" cy="14.5" r="4" stroke="white" strokeWidth="2" />
            <path d="M16 9v2M16 18v2M10.5 14.5h2M19.5 14.5h2M12 10.5l1.4 1.4M18.6 17.1l1.4 1.4M12 18.5l1.4-1.4M18.6 11.9l1.4-1.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M13 22l2.5 2.5l5-5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="logo-text">FISEI - <span>UTA</span></span>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {getIcon(icon)}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        {getIcon('log-out')}
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}

function getIcon(name) {
  switch (name) {
    case 'layout-dashboard':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      )
    case 'monitor':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    case 'clipboard-list':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      )
    case 'refresh-cw':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      )
    case 'list':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      )
    case 'users':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'log-out':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      )
    default:
      return null
  }
}