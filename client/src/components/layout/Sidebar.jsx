import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import StatusPicker from '../common/StatusPicker';
import { LogOut } from 'lucide-react';

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
        flexShrink: 0,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 6v12M12 9v9M18 12v6" />
      </svg>
    </div>
  );
}

export default function Sidebar({ links = [], active, onNav, collapsed }) {
  const { user, logout } = useAuth();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo flex items-center gap-3">
        <LogoIcon />
        {!collapsed && <span className="logo-text font-bold text-lg" style={{ color: 'var(--text-primary)' }}>TaskFlow</span>}
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => {
          const isActive = active === link.id;
          return (
            <button
              key={link.id}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => onNav(link.id)}
              title={collapsed ? link.label : undefined}
            >
              <span className="nav-link-icon">{link.icon}</span>
              {!collapsed && <span className="nav-link-label">{link.label}</span>}
              {!collapsed && link.badge && (
                <span className="tf-badge tf-badge-sm" style={{ marginLeft: 'auto' }}>
                  {link.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user flex items-center justify-between">
          <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
            <Avatar user={user} name={user?.name} color={user?.color} status={user?.status || 'Online'} size={34} />
            {!collapsed && (
              <div className="user-info" style={{ minWidth: 0 }}>
                <div className="user-name font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {user?.name || 'User'}
                </div>
                <div className="text-xs text-muted truncate">
                  {user?.role === 'PM' ? 'Project Manager' : user?.role || 'Member'} • {user?.status || 'Online'}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="sidebar-status-picker" style={{ marginTop: 8 }}>
            <StatusPicker />
          </div>
        )}
      </div>
    </aside>
  );
}