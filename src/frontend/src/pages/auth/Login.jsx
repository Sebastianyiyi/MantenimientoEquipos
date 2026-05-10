import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../../authConfig'
import api from '../../services/api'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ correo: '', contrasena: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { instance } = useMsal()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleMicrosoft = async () => {
    try {
      await instance.loginRedirect(loginRequest)
    } catch (err) {
      setError('Error al autenticar con Microsoft. Intenta de nuevo.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // --- Reemplazar con llamada real a la API cuando esté lista ---
    try {
      await new Promise(r => setTimeout(r, 800)) // simula delay
      if (form.correo === 'admin@uta.edu.ec' && form.contrasena === '123456') {
        login({ nombre: 'Steven Pallo', rol: 'Administrador' }, 'fake-jwt-token')
        navigate('/dashboard')
      } else {
        setError('Correo o contraseña incorrectos.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#C0191F" />
            <path d="M10 20h20M20 10v20" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="login-brand">FISEI <span>UTA</span></h1>
            <p className="login-subtitle">Sistema de Mantenimiento</p>
          </div>
        </div>

        <hr className="login-divider" />

        <h2 className="login-heading">Iniciar sesión</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="correo">Correo institucional</label>
            <input
              id="correo"
              name="correo"
              type="email"
              placeholder="usuario@uta.edu.ec"
              value={form.correo}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              name="contrasena"
              type="password"
              placeholder="••••••••"
              value={form.contrasena}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="login-separator"><span>o</span></div>

        <button className="btn-microsoft" type="button" onClick={handleMicrosoft}>
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
          </svg>
          Continuar con Microsoft 365
        </button>

      </div>
    </div>
  )
}