import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => localStorage.getItem('token') ?? null)

  // Poll localStorage para cambios (incluso en la misma pestaña)
  useEffect(() => {
    let lastToken = localStorage.getItem('token')
    let lastUser = localStorage.getItem('user')

    const checkStorageChanges = () => {
      const currentToken = localStorage.getItem('token')
      const currentUser = localStorage.getItem('user')

      // Si el token cambió
      if (currentToken !== lastToken) {
        console.log('[AuthContext] Token changed in localStorage:', !!currentToken)
        setToken(currentToken)
        lastToken = currentToken
      }

      // Si el usuario cambió
      if (currentUser !== lastUser) {
        try {
          const newUser = currentUser ? JSON.parse(currentUser) : null
          setUser(newUser)
          console.log('[AuthContext] User changed in localStorage:', newUser?.email)
        } catch (e) {
          setUser(null)
        }
        lastUser = currentUser
      }
    }

    // Check immediate
    checkStorageChanges()

    // Poll every 1000ms (cada 1 segundo, menos agresivo)
    const interval = setInterval(checkStorageChanges, 1000)
    return () => clearInterval(interval)
  }, [])

  // Also listen for cross-tab storage events (entre pestañas)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === null) {
        const newToken = localStorage.getItem('token')
        setToken(newToken)
      }
      if (e.key === 'user' || e.key === null) {
        try {
          const stored = localStorage.getItem('user')
          const newUser = stored ? JSON.parse(stored) : null
          setUser(newUser)
        } catch {
          setUser(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const login = (userData, accessToken) => {
    console.log('[AuthContext] login called with:', { userData, tokenPreview: accessToken?.substring(0, 20) })
    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
  }

  const logout = () => {
    console.log('[AuthContext] logout called')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)