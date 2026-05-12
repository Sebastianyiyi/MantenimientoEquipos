import { useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'

export default function MsalRedirectHandler() {
  const { instance } = useMsal()
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await instance.handleRedirectPromise()
        if (!result) return  // No hubo redirección de Microsoft

        // Intercambiar token de Microsoft por JWT del sistema
        const res = await authApi.post('/auth/microsoft', {
          accessToken: result.accessToken
        })

        const data = res.data
        login(
          {
            nombre: data.fullName,
            email: data.email,
            rol: data.role,
          },
          data.accessToken
        )
        navigate('/dashboard')
      } catch (err) {
        console.error('Error en redirect de Microsoft:', err)
        navigate('/login')
      }
    }

    handleRedirect()
  }, [instance])

  return null
}
