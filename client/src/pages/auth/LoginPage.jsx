import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/axios';
import { ShieldCheck, Briefcase, UserCheck, Layers, CheckCircle2, ArrowRight } from 'lucide-react';

const DEMOS = [
  {
    label: 'Admin Workspace',
    role: 'Admin',
    email: 'krithish@gmail.com',
    pass: 'krithish123',
    color: '#6366f1',
    icon: ShieldCheck,
    desc: 'Full system metrics, member management & security control',
  },
  {
    label: 'Project Manager',
    role: 'PM',
    email: 'apurva@gmail.com',
    pass: 'apurva123',
    color: '#06b6d4',
    icon: Briefcase,
    desc: 'Sprint planning, project creation & task assignment',
  },
  {
    label: 'Team Member',
    role: 'User',
    email: 'sandeep@gmail.com',
    pass: 'sandeep123',
    color: '#10b981',
    icon: UserCheck,
    desc: 'Kanban task execution, comments & presence status',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [lForm, setLForm] = useState({ email: '', password: '' });
  const [rForm, setRForm] = useState({ name: '', email: '', password: '' });

  const handleLogin = async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', lForm);
      login(
        {
          _id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          color: data.color,
          status: data.status,
        },
        data.token
      );
      navigate('/');
    } catch (e) {
      setErr(e.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', rForm);
      login(
        {
          _id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          color: data.color,
          status: data.status,
        },
        data.token
      );
      navigate('/');
    } catch (e) {
      setErr(e.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  const fillDemo = async (email, pass) => {
    setTab('login');
    setLForm({ email, password: pass });
    setErr('');
    setLoading(true);
    try {
      await api.post('/auth/seed').catch(() => {});
      const { data } = await api.post('/auth/login', { email, password: pass });
      login(
        {
          _id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          color: data.color,
          status: data.status,
        },
        data.token
      );
      navigate('/');
    } catch (e) {
      setErr(e.response?.data?.message || 'Demo login failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page-split">
      {/* Left Branding Showcase */}
      <div className="auth-branding-panel">
        <div className="branding-header">
          <div className="branding-logo">
            <div className="branding-logo-icon">
              <Layers size={28} />
            </div>
            <span className="branding-logo-text">TaskFlow</span>
          </div>
          <span className="tf-badge tf-badge-purple">Enterprise v2.0</span>
        </div>

        <div className="branding-content">
          <h1 className="branding-headline">
            Streamline your agile project workflows with precision.
          </h1>
          <p className="branding-subtext">
            TaskFlow combines drag-and-drop Kanban execution, role-based dashboards, and live team presence in a unified workspace.
          </p>

          <div className="branding-feature-list">
            <div className="branding-feature-item">
              <CheckCircle2 size={20} className="feature-icon" />
              <div>
                <strong>3 Role-Based Workspaces</strong>
                <p>Tailored dashboards for Admins, Project Managers, and Engineers.</p>
              </div>
            </div>
            <div className="branding-feature-item">
              <CheckCircle2 size={20} className="feature-icon" />
              <div>
                <strong>Interactive @dnd-kit Kanban</strong>
                <p>WIP limits, priority tags, overdue alerts, and drop zone indicators.</p>
              </div>
            </div>
            <div className="branding-feature-item">
              <CheckCircle2 size={20} className="feature-icon" />
              <div>
                <strong>Real-Time Presence Tracking</strong>
                <p>Automated idle detection and daily leave status cleanup.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="branding-footer">
          <p>© 2026 TaskFlow Inc. Built with MERN Stack + Docker + Kubernetes.</p>
        </div>
      </div>

      {/* Right Form & Quick Demo Area */}
      <div className="auth-form-panel">
        <div className="auth-box-modern">
          <div className="auth-header">
            <h2>Welcome back</h2>
            <p className="auth-subtitle">Sign in to your workspace or try a quick demo login</p>
          </div>

          {/* Tabs */}
          <div className="auth-tabs-modern">
            <button
              className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setTab('login');
                setErr('');
              }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setTab('register');
                setErr('');
              }}
            >
              Create Account
            </button>
          </div>

          {tab === 'login' ? (
            <div className="form-section" style={{ gap: 16 }}>
              <div className="field">
                <label>Email Address</label>
                <input
                  className="input"
                  type="email"
                  value={lForm.email}
                  onChange={(e) => setLForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@company.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  className="input"
                  type="password"
                  value={lForm.password}
                  onChange={(e) => setLForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              {err && <div className="err-banner">{err}</div>}
              <button
                className="btn btn-primary w-full"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? <span className="btn-spinner" /> : 'Sign In to Workspace'}
              </button>
            </div>
          ) : (
            <div className="form-section" style={{ gap: 16 }}>
              <div className="field">
                <label>Full Name</label>
                <input
                  className="input"
                  value={rForm.name}
                  onChange={(e) => setRForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Alex Rivera"
                />
              </div>
              <div className="field">
                <label>Work Email</label>
                <input
                  className="input"
                  type="email"
                  value={rForm.email}
                  onChange={(e) => setRForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="alex@company.com"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  className="input"
                  type="password"
                  value={rForm.password}
                  onChange={(e) => setRForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                />
              </div>
              {err && <div className="err-banner">{err}</div>}
              <button
                className="btn btn-primary w-full"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? <span className="btn-spinner" /> : 'Create Account'}
              </button>
            </div>
          )}

          {/* Quick Demo Section */}
          <div className="demo-divider-modern">
            <span>Or explore with a Quick Demo Account</span>
          </div>

          <div className="demo-cards-stack">
            {DEMOS.map((d) => {
              const IconComp = d.icon;
              return (
                <div
                  key={d.label}
                  className="demo-card-item"
                  onClick={() => fillDemo(d.email, d.pass)}
                >
                  <div className="demo-card-icon" style={{ background: d.color }}>
                    <IconComp size={20} color="#fff" />
                  </div>
                  <div className="demo-card-info">
                    <div className="demo-card-header">
                      <span className="demo-card-title">{d.label}</span>
                      <span className="tf-badge tf-badge-sm">{d.role}</span>
                    </div>
                    <p className="demo-card-desc">{d.desc}</p>
                  </div>
                  <ArrowRight size={18} className="demo-card-arrow" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
