import { useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function MsalRedirectHandler() {
  const { instance } = useMsal()
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    instance.handleRedirectPromise().then(async (response) => {
      if (!response?.accessToken) return

      try {
        const res = await api.post('/Auth/microsoft', {
          accessToken: response.accessToken
        })
        const data = res.data
        login(
          { nombre: data.fullName, rol: data.role, email: data.email },
          data.accessToken
        )
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Error backend:', err)
        navigate('/login', { replace: true })
      }
    })
  }, [])

  return null
}