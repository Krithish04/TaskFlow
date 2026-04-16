import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import LoginPage    from './pages/auth/LoginPage'
import AdminDash    from './pages/admin/AdminDash'
import PMDash       from './pages/pm/PMDash'
import UserDash     from './pages/user/UserDash'

function RoleRouter() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="loading-page">
      <div className="spinner spinner-lg" />
      <span>Loading TaskFlow…</span>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'Admin') return <Navigate to="/admin"   replace />
  if (user.role === 'PM')    return <Navigate to="/pm"      replace />
  return                            <Navigate to="/user"     replace />
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-page"><div className="spinner spinner-lg" /></div>
  if (!user)   return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/"      element={<RoleRouter />} />

          <Route path="/admin/*" element={
            <ProtectedRoute roles={['Admin']}>
              <AdminDash />
            </ProtectedRoute>
          } />

          <Route path="/pm/*" element={
            <ProtectedRoute roles={['PM']}>
              <PMDash />
            </ProtectedRoute>
          } />

          <Route path="/user/*" element={
            <ProtectedRoute roles={['User']}>
              <UserDash />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
