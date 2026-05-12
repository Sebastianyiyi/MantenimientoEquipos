import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../../authConfig'
import heroImg from '../../assets/WhatsApp_Image_2026-05-05_at_10_26_48-removebg-preview.png'
import utaLogo from '../../assets/uta_logo-removebg-preview.png'
import fiseiLogo from '../../assets/images_fisei-removebg-preview.png'
import gearIcon from '../../assets/gear-wrench-icon-representing-maintenance-260nw-2626116573-removebg-preview.png'
import './Login.css'

export default function Login() {
  const { instance } = useMsal()
  const [error, setError] = useState('')

  const handleMicrosoft = async () => {
    setError('')
    try {
      await instance.loginRedirect(loginRequest)
    } catch (err) {
      setError('Error al autenticar con Microsoft. Intenta de nuevo.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-header">
          <div className="login-left-brand">
            <img src={gearIcon} alt="icono" className="login-gear-icon" />
            <span className="login-left-title">Mantenimiento</span>
          </div>
        </div>
        <div className="login-left-hero">
          <img src={heroImg} alt="Sistema de mantenimiento" />
        </div>
      </div>

      <div className="login-right">
        <div className="login-right-logos">
          <img src={utaLogo} alt="UTA" className="login-uni-logo" />
          <img src={fiseiLogo} alt="FISEI" className="login-uni-logo" />
        </div>

        <div className="login-right-content">
          <h1 className="login-welcome">
            Bienvenido al sistema de mantenimiento
          </h1>

          {error && <p className="login-error">{error}</p>}

          <button className="btn-microsoft" type="button" onClick={handleMicrosoft}>
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Microsoft Office 365
          </button>
        </div>
      </div>
    </div>
  )
}