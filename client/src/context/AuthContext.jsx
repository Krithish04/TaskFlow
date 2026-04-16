import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('tf_user')
    const token  = localStorage.getItem('tf_token')
    if (stored && token) {
      setUser(JSON.parse(stored))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('tf_user',  JSON.stringify(userData))
    localStorage.setItem('tf_token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('tf_user')
    localStorage.removeItem('tf_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
