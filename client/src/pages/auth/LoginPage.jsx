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
    desc: 'Manage users, roles & projects',
    tag: 'Full Access',
    iconColor: '#6366F1',
    bgColor: '#EEF0FF',
  },
  {
    roleKey: 'PM',
    name: 'Manager',
    email: 'apurva@gmail.com',
    pass: 'apurva123',
    icon: Briefcase,
    desc: 'Create projects & assign tasks',
    tag: 'Projects',
    iconColor: '#10B981',
    bgColor: '#D1FAE5',
  },
  {
    roleKey: 'User',
    name: 'Member',
    email: 'sandeep@gmail.com',
    pass: 'sandeep123',
    icon: User,
    desc: 'Execute tasks & track progress',
    tag: 'Tasks',
    iconColor: '#F59E0B',
    bgColor: '#FEF3C7',
  },
];

function LogoIcon() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
      <div className="login-centered-container">
        {/* Header Logo */}
        <div className="login-logo-header">
          <div className="login-logo-brand">
            <LogoIcon />
            <span className="font-bold text-xl" style={{ letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              TaskFlow
            </span>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="login-card-box">
          <div className="login-card-header">
            <h1 className="login-title">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="login-subtitle">
              {mode === 'login'
                ? 'Sign in to pick up where your team left off.'
                : 'Get started with your TaskFlow workspace.'}
            </p>
          </div>

          {err && <div className="login-error-banner">{err}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleSignIn} className="login-form">
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

              <div className="login-remember-row">
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
                className="login-submit-btn"
              >
                Sign in
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="login-form">
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
                className="login-submit-btn"
              >
                Create Account
              </Button>
            </form>
          )}

          {/* Quick Demo Workspace Selector */}
          <div className="demo-divider">
            <span>or quick demo login</span>
          </div>

          <div className="demo-quick-grid">
            {DEMOS.map((demo) => {
              const IconComponent = demo.icon;
              const isSelected = selectedDemo === demo.roleKey;
              return (
                <button
                  key={demo.roleKey}
                  type="button"
                  className={`demo-quick-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectDemo(demo)}
                  title={demo.desc}
                >
                  <IconComponent size={15} style={{ color: demo.iconColor }} />
                  <span className="demo-chip-title">{demo.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Account toggle */}
        <div className="login-footer-section">
          <p className="login-account-toggle">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button
              type="button"
              className="font-semibold"
              style={{ color: 'var(--accent-text)', marginLeft: '4px' }}
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErr('');
              }}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
