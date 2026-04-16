import { useAuth } from '../../context/AuthContext'
import { initials, roleClass } from '../../utils'

const LogoutIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 100-2H4V5h6a1 1 0 100-2H3zm11.707 4.293a1 1 0 010 1.414L13.414 10l1.293 1.293a1 1 0 01-1.414 1.414l-2-2a1 1 0 010-1.414l2-2a1 1 0 011.414 0z" clipRule="evenodd"/>
    <path fillRule="evenodd" d="M13 10a1 1 0 011-1h3a1 1 0 110 2h-3a1 1 0 01-1-1z" clipRule="evenodd"/>
  </svg>
)

const LogoIcon = () => (
  <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
    <rect width="36" height="36" rx="10" fill="url(#lg)"/>
    <rect x="8" y="10" width="20" height="3" rx="1.5" fill="white"/>
    <rect x="8" y="16.5" width="14" height="3" rx="1.5" fill="white" opacity="0.8"/>
    <rect x="8" y="23" width="17" height="3" rx="1.5" fill="white" opacity="0.6"/>
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7c6dfa"/>
        <stop offset="1" stopColor="#2de2c8"/>
      </linearGradient>
    </defs>
  </svg>
)

export default function Sidebar({ links, active, onNav }) {
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <LogoIcon />
        <span className="logo-text">TaskFlow</span>
      </div>

      <nav className="sidebar-nav">
        {links.map(link => (
          <button
            key={link.id}
            className={`nav-link ${active === link.id ? 'active' : ''}`}
            onClick={() => onNav(link.id)}
          >
            {link.icon}
            {link.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div
            className="ava ava-md"
            style={{ background: user?.color || '#7c6dfa', color: '#fff' }}
          >
            {initials(user?.name)}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <span className={`badge ${roleClass(user?.role)}`}>{user?.role}</span>
          </div>
          <button className="btn-icon" onClick={logout} title="Sign out">
            <LogoutIcon />
          </button>
        </div>
      </div>
    </aside>
  )
}
