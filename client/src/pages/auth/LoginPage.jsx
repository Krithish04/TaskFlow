import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../../context/AuthContext'
import { useToast }    from '../../context/ToastContext'
import api             from '../../api/axios'

const DEMOS = [
  { label: 'Admin',   email: 'admin@taskflow.io', pass: 'admin123', color: '#7c6dfa' },
  { label: 'PM',      email: 'pm@taskflow.io',    pass: 'pm123',    color: '#2de2c8' },
  { label: 'User',    email: 'priya@taskflow.io', pass: 'user123',  color: '#4ade80' },
]

export default function LoginPage() {
  const { login }    = useAuth()
  const { toast }    = useToast()
  const navigate     = useNavigate()
  const [tab, setTab]     = useState('login')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  const [lForm, setLForm] = useState({ email: '', password: '' })
  const [rForm, setRForm] = useState({ name: '', email: '', password: '' })

  const handleLogin = async () => {
    setErr(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', lForm)
      login({ _id: data._id, name: data.name, email: data.email, role: data.role, color: data.color }, data.token)
      navigate('/')
    } catch (e) {
      setErr(e.response?.data?.message || 'Login failed')
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    setErr(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/register', rForm)
      login({ _id: data._id, name: data.name, email: data.email, role: data.role, color: data.color }, data.token)
      navigate('/')
    } catch (e) {
      setErr(e.response?.data?.message || 'Registration failed')
    }
    setLoading(false)
  }

  const fillDemo = async (email, pass) => {
    setTab('login')
    setLForm({ email, password: pass })
    setErr(''); setLoading(true)
    try {
      // seed if first time
      await api.post('/auth/seed').catch(() => {})
      const { data } = await api.post('/auth/login', { email, password: pass })
      login({ _id: data._id, name: data.name, email: data.email, role: data.role, color: data.color }, data.token)
      navigate('/')
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed')
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Logo */}
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="url(#al)"/>
            <rect x="8" y="10" width="20" height="3" rx="1.5" fill="white"/>
            <rect x="8" y="16.5" width="14" height="3" rx="1.5" fill="white" opacity="0.8"/>
            <rect x="8" y="23" width="17" height="3" rx="1.5" fill="white" opacity="0.6"/>
            <defs>
              <linearGradient id="al" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7c6dfa"/><stop offset="1" stopColor="#2de2c8"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="auth-logo-text">TaskFlow</span>
        </div>
        <p className="auth-subtitle">Your team's command centre</p>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setErr('') }}>Login</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setErr('') }}>Register</button>
        </div>

        {tab === 'login' ? (
          <div className="form-section" style={{ gap: 14 }}>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={lForm.email} onChange={e => setLForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={lForm.password} onChange={e => setLForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            {err && <p className="err-msg">{err}</p>}
            <button className="btn btn-primary w-full" onClick={handleLogin} disabled={loading}>
              {loading ? <span className="spinner" style={{ margin: '0 auto' }} /> : 'Sign In'}
            </button>
          </div>
        ) : (
          <div className="form-section" style={{ gap: 14 }}>
            <div className="field">
              <label>Full Name</label>
              <input className="input" value={rForm.name} onChange={e => setRForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={rForm.email} onChange={e => setRForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={rForm.password} onChange={e => setRForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            </div>
            {err && <p className="err-msg">{err}</p>}
            <button className="btn btn-primary w-full" onClick={handleRegister} disabled={loading}>
              {loading ? <span className="spinner" style={{ margin: '0 auto' }} /> : 'Create Account'}
            </button>
          </div>
        )}

        {/* Demo accounts */}
        <div className="demo-divider"><span>Quick demo login</span></div>
        <div className="demo-grid">
          {DEMOS.map(d => (
            <button key={d.label} className="demo-btn" onClick={() => fillDemo(d.email, d.pass)}>
              <span className="role-dot" style={{ background: d.color }} />
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
