import axios from 'axios'

const api = axios.create({
  // UPDATED: Points to the full backend URL to prevent 404s
  // In production, process.env.VITE_API_URL should be used
  baseURL: 'https://taskflow-bv8m.onrender.com/api'|| 'http://localhost:5000/api', 
  headers: { 'Content-Type': 'application/json' }
})

// Attach token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('tf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Clear all status tracking on forced logout
      localStorage.removeItem('tf_user')
      localStorage.removeItem('tf_token')
    }
    return Promise.reject(err)
  }
)

export default api