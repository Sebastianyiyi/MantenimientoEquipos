import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Sidebar.css'

const navItems = [
  { to: '/dashboard',  icon: 'layout-dashboard', label: 'Dashboard' },
  { to: '/equipos',    icon: 'monitor',           label: 'Equipos' },
  { to: '/importar',   icon: 'upload',            label: 'Importar' },
  { to: '/catalogos',  icon: 'list',              label: 'Catálogos' },
]

export default function Sidebar() {
  const { logout } = useAuth()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="logo-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="var(--color-primary)"/>
            <path d="M7 14h14M14 7v14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="logo-text">FISEI<span>UTA</span></span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''}`
          }>
            <i data-lucide={icon}></i>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button className="sidebar-logout" onClick={logout}>
        <i data-lucide="log-out"></i>
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}