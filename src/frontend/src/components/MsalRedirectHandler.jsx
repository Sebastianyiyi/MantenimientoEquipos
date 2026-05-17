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
    if (redirectProcessedRef.current) return

    const handleRedirect = async () => {
      try {
        const result = await instance.handleRedirectPromise()

        console.log('[MSAL] handleRedirectPromise result:', result)

        if (!result) {
          const accounts = instance.getAllAccounts()

          if (accounts.length > 0 && !instance.getActiveAccount()) {
            instance.setActiveAccount(accounts[0])
          }

          return
        }

        redirectProcessedRef.current = true

        if (result.account) {
          instance.setActiveAccount(result.account)
        }

        console.log('[MSAL] Microsoft accessToken obtained, exchanging for JWT...')

        const res = await authApi.post('/auth/microsoft', {
          accessToken: result.accessToken
        })

        console.log('[MSAL] Backend response:', res.data)

        const data = res.data

        login(
          {
            fullName: data.fullName,
            email: data.email,
            role: data.role,
          },
          data.accessToken
        )

        console.log('[MSAL] Login successful, navigating to dashboard...')
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('[MSAL] Redirect error:', err)
        navigate('/login', { replace: true })
      }
    }

    handleRedirect()
  }, [instance, login, navigate])

  return null
}