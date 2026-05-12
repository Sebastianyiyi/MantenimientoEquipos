import { useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'

export default function MsalRedirectHandler() {
  const { instance } = useMsal()
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await instance.handleRedirectPromise()

        // ← LOG TEMPORAL para confirmar que llega aquí
        console.log('[MSAL] handleRedirectPromise result:', result)

        if (!result) {
          console.log('[MSAL] No hubo redirect, revisando si ya hay sesión...')
          return
        }

        console.log('[MSAL] accessToken de Microsoft obtenido, intercambiando por JWT...')

        const res = await authApi.post('/auth/microsoft', {
          accessToken: result.accessToken
        })

        console.log('[MSAL] Respuesta del backend:', res.data)

        const data = res.data
        login(
          {
            fullName: data.fullName,
            email: data.email,
            role: data.role,
          },
          data.accessToken
        )

        console.log('[MSAL] Login exitoso, navegando a dashboard...')
        navigate('/dashboard')
      } catch (err) {
        console.error('[MSAL] Error en redirect:', err)
        navigate('/login')
      }
    }

    handleRedirect()
  }, [instance, login, navigate])

  return null
}