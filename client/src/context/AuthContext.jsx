import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // client/src/context/AuthContext.jsx

useEffect(() => {
  const initAuth = async () => {
    const token = localStorage.getItem('tf_token');
    if (token) {
      try {
        // Fetch fresh user data (including status) from the backend
        const { data } = await api.get('/auth/me');
        setUser(data);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        // If token is invalid, clear it
        logout();
      }
    }
    setLoading(false);
  };

  initAuth();
}, []);

  const login = (userData, token) => {
  // Ensure userData contains the status: 'Online' sent from backend
  localStorage.setItem('tf_user', JSON.stringify(userData));
  localStorage.setItem('tf_token', token);
  
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  // This update is what makes the Sidebar dot turn green immediately
  setUser(userData); 
};

  // UPDATED: Now async to call the backend logout route
  const logout = async () => {
    try { 
      // Notify server to set status to 'Offline'
      await api.post('/auth/logout') 
    } catch (err) { 
      // Silent catch: ensure frontend logout still happens even if API fails
      console.error("Logout status sync failed", err) 
    }

    localStorage.removeItem('tf_user')
    localStorage.removeItem('tf_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    // UPDATED: Added setUser to the provider value
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)