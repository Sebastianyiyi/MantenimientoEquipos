import { useEffect, useRef } from 'react'
import { useMsal } from '@azure/msal-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'

export default function MsalRedirectHandler() {
  const { instance } = useMsal()
  const { login } = useAuth()
  const navigate = useNavigate()
  const redirectProcessedRef = useRef(false)

  useEffect(() => {
    // Solo procesar UNA VEZ por sesión
    if (redirectProcessedRef.current) {
      return
    }

    const handleRedirect = async () => {
      try {
        const result = await instance.handleRedirectPromise()

        console.log('[MSAL] handleRedirectPromise result:', result)

        if (!result) {
          console.log('[MSAL] No redirect, checking existing session...')
          return
        }

        // Marcar como procesado
        redirectProcessedRef.current = true

        console.log('[MSAL] Microsoft accessToken obtained, exchanging for JWT...')

        const res = await authApi.post('/auth/microsoft', {
          accessToken: result.accessToken
        })

        console.log('[MSAL] Backend response:', res.data)

        const data = res.data
        
        // Save token manually before calling login()
        localStorage.setItem('token', data.accessToken)
        localStorage.setItem('user', JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        }))

        console.log('[MSAL] Token saved to localStorage:', {
          tokenSaved: !!localStorage.getItem('token'),
          userSaved: !!localStorage.getItem('user'),
          role: data.role
        })

        // Also call login() to update React state
        login(
          {
            fullName: data.fullName,
            email: data.email,
            role: data.role,
          },
          data.accessToken
        )

        console.log('[MSAL] Login successful, navigating to dashboard...')
        navigate('/dashboard')
      } catch (err) {
        console.error('[MSAL] Redirect error:', err)
        navigate('/login')
      }
    }

    handleRedirect()
  }, [instance, login, navigate])

  return null
}