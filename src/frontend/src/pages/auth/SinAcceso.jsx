import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import BackButton from '../../components/BackButton'
import './SinAcceso.css'

export default function SinAcceso() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="sin-acceso-page">
      <BackButton label="Volver atrás" />
      <div className="sin-acceso-card">
        <div className="sin-acceso-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#FEE2E2" />
            <path d="M32 20v16M32 42v2" stroke="#C0191F" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h1>Acceso Denegado</h1>
        <p>No tienes permisos para acceder a esta página.</p>
        {user && (
          <p className="sin-acceso-role">
            Tu rol actual es: <strong>{user.role}</strong>
          </p>
        )}
        <div className="sin-acceso-actions">
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}