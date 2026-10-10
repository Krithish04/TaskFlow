import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Checkbox from '../../components/common/Checkbox';
import ProgressRing from '../../components/common/ProgressRing';
import AvatarStack from '../../components/common/AvatarStack';
import Badge from '../../components/common/Badge';
import {
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Briefcase,
  User,
  ChevronRight,
  Sparkles,
  Sun,
  ShieldCheck,
} from 'lucide-react';

const DEMOS = [
  {
    roleKey: 'Admin',
    name: 'Admin',
    email: 'krithish@gmail.com',
    pass: 'krithish123',
    icon: ShieldCheck,
    desc: 'Manage users, roles and all projects',
    iconColor: '#6366F1',
    bgColor: '#EEF0FF',
  },
  {
    roleKey: 'PM',
    name: 'Project Manager',
    email: 'apurva@gmail.com',
    pass: 'apurva123',
    icon: Briefcase,
    desc: 'Create projects and assign tasks',
    iconColor: '#10B981',
    bgColor: '#D1FAE5',
  },
  {
    roleKey: 'User',
    name: 'Team Member',
    email: 'sandeep@gmail.com',
    pass: 'sandeep123',
    icon: User,
    desc: 'See your tasks and update progress',
    iconColor: '#F59E0B',
    bgColor: '#FEF3C7',
  },
];

function LogoIcon() {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        boxShadow: '0 6px 20px rgba(79, 70, 229, 0.35)',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 6v12M12 9v9M18 12v6" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [lForm, setLForm] = useState({ email: '', password: '' });
  const [rForm, setRForm] = useState({ name: '', email: '', password: '' });

  const handleSelectDemo = (demo) => {
    setSelectedDemo(demo.roleKey);
    setLForm({ email: demo.email, password: demo.pass });
    setErr('');
  };

  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      // Seed backend if demo workspace credentials selected
      if (selectedDemo) {
        await api.post('/auth/seed').catch(() => {});
      }

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
      setErr(e.response?.data?.message || 'Invalid email or password');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
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
      setErr(e.response?.data?.message || 'Failed to create account');
    }
    setLoading(false);
  };

  return (
    <div className="login-page-centered dot-grid-bg flex flex-col items-center justify-between min-h-screen py-10 px-4">
      {/* ── FLOATING DECORATIVE CARDS (Desktop >= 1280px, aria-hidden) ── */}
      <div className="login-floating-layer" aria-hidden="true">
        {/* Top-Left Floating Task Card */}
        <div className="floating-card float-card-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant="medium">Medium</Badge>
            <span className="text-xs text-muted font-medium">Frontend</span>
          </div>
          <h4 className="font-semibold text-sm mb-3">Kanban drag and drop with dnd-kit</h4>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Due Oct 15 • 3/5 subtasks</span>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: '#10B981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              SK
            </div>
          </div>
        </div>

        {/* Mid-Left Floating Sprint Ring Card */}
        <div className="floating-card float-card-2">
          <ProgressRing percentage={60} size={54} strokeWidth={6} label="60%" sublabel="Sprint 14 progress" />
        </div>

        {/* Bottom-Left Floating Presence Pill */}
        <div className="floating-card float-card-3 flex items-center gap-3">
          <AvatarStack
            users={[
              { name: 'Arjun Rao', color: '#6366F1', status: 'Online' },
              { name: 'Sara Khan', color: '#10B981', status: 'Online' },
              { name: 'Dev Nair', color: '#F59E0B', status: 'Online' },
            ]}
            size={24}
          />
          <span className="text-xs font-medium">3 teammates online</span>
        </div>

        {/* Top-Right Floating Activity Notification Card */}
        <div className="floating-card float-card-4 flex items-start gap-3">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#10B981',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            SK
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
              <strong>Sara</strong> moved <strong>Login redesign</strong> to In Review
            </p>
            <span className="text-xs text-muted" style={{ fontSize: 11 }}>12 minutes ago</span>
          </div>
        </div>

        {/* Bottom-Right Floating AI Suggestion Card */}
        <div className="floating-card float-card-5 flex flex-col gap-2">
          <div className="flex items-center gap-2" style={{ color: 'var(--accent-text)' }}>
            <Sparkles size={14} />
            <span className="text-xs font-semibold">AI suggestion</span>
          </div>
          <p className="text-xs text-secondary">
            Split "Refresh token rotation" into 3 subtasks to finish before Oct 13.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Button size="sm" variant="primary" style={{ padding: '4px 12px', minHeight: 28, fontSize: 11 }}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" style={{ padding: '4px 12px', minHeight: 28, fontSize: 11 }}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>

      {/* ── MAIN CENTERED LOGIN COLUMN ────────────────────────────── */}
      <div className="login-centered-container flex flex-col items-center w-full max-w-md my-auto">
        {/* Header Logo + Tagline */}
        <div className="login-logo-header flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-3 mb-3">
            <LogoIcon />
            <span className="font-bold text-2xl" style={{ letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              TaskFlow
            </span>
          </div>
          <div className="tagline-pill">
            Project management for agile teams
          </div>
        </div>

        {/* Main Form Card */}
        <div className="login-card-box w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-sm text-muted">
              {mode === 'login'
                ? 'Sign in to pick up where your team left off.'
                : 'Get started with your TaskFlow workspace.'}
            </p>
          </div>

          {err && <div className="login-error-banner mb-4">{err}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                icon={Mail}
                placeholder="you@company.com"
                value={lForm.email}
                onChange={(e) => {
                  setLForm({ ...lForm, email: e.target.value });
                  setSelectedDemo(null);
                }}
                required
              />

              <Input
                label="Password"
                type="password"
                icon={Lock}
                placeholder="Enter your password"
                value={lForm.password}
                onChange={(e) => {
                  setLForm({ ...lForm, password: e.target.value });
                  setSelectedDemo(null);
                }}
                required
              />

              <div className="flex items-center justify-between text-xs">
                <Checkbox
                  label="Remember me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset link will be sent to your registered email.');
                  }}
                  className="font-medium"
                  style={{ color: 'var(--accent-text)' }}
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                icon={ArrowRight}
                iconPosition="right"
                loading={loading}
                className="mt-2"
              >
                Sign in
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="Alex Rivera"
                value={rForm.name}
                onChange={(e) => setRForm({ ...rForm, name: e.target.value })}
                required
              />

              <Input
                label="Work Email"
                type="email"
                icon={Mail}
                placeholder="alex@company.com"
                value={rForm.email}
                onChange={(e) => setRForm({ ...rForm, email: e.target.value })}
                required
              />

              <Input
                label="Password"
                type="password"
                icon={Lock}
                placeholder="Min 6 characters"
                value={rForm.password}
                onChange={(e) => setRForm({ ...rForm, password: e.target.value })}
                required
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                icon={ArrowRight}
                iconPosition="right"
                loading={loading}
                className="mt-2"
              >
                Create Account
              </Button>
            </form>
          )}

          {/* Demo Workspace Selector */}
          <div className="demo-divider my-6">
            <span>or explore a demo workspace</span>
          </div>

          <div className="demo-role-list flex flex-col gap-3">
            {DEMOS.map((demo) => {
              const IconComponent = demo.icon;
              const isSelected = selectedDemo === demo.roleKey;
              return (
                <div
                  key={demo.roleKey}
                  className={`demo-role-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectDemo(demo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectDemo(demo)}
                >
                  <div
                    className="demo-icon-square"
                    style={{ backgroundColor: demo.bgColor, color: demo.iconColor }}
                  >
                    <IconComponent size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-primary">{demo.name}</h4>
                    <p className="text-xs text-muted truncate">{demo.desc}</p>
                  </div>
                  <ChevronRight size={18} className="demo-chevron" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Account toggle & feature highlights below card */}
        <div className="flex flex-col items-center text-center mt-6 gap-4">
          <p className="text-sm text-muted">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button
              type="button"
              className="font-semibold"
              style={{ color: 'var(--accent-text)' }}
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErr('');
              }}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>

          <div className="flex items-center justify-center gap-6 text-xs text-muted flex-wrap">
            <span className="flex items-center gap-1.5">
              <Shield size={14} /> Role-based access
            </span>
            <span className="flex items-center gap-1.5">
              <Sun size={14} /> Live presence
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} /> AI assistant
            </span>
          </div>

          <footer className="flex items-center gap-4 text-xs text-muted mt-2">
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a>
            <span>•</span>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
            <span>•</span>
            <a href="#help" onClick={(e) => e.preventDefault()}>Help</a>
          </footer>
        </div>
      </div>
    </div>
  );
}
