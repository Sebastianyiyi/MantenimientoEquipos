import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMsal } from '@azure/msal-react'
import './Sidebar.css'

const navItems = [
  { to: '/dashboard', icon: 'layout-dashboard', label: 'Dashboard', roles: null },
  { to: '/equipos', icon: 'monitor', label: 'Gestión de Equipos', roles: null },
  { to: '/importar', icon: 'upload', label: 'Importar', roles: null },
  { to: '/catalogos', icon: 'list', label: 'Catálogos del Sistema', roles: null },
  { to: '/tickets', icon: 'clipboard-list', label: 'Tickets de Mantenimiento', roles: ['Laboratorista'] },
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
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="var(--color-primary)" />
            <path d="M7 14h14M14 7v14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
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
            <i data-lucide={icon}></i>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        <i data-lucide="log-out"></i>
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}