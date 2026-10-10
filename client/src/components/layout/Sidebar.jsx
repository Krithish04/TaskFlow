import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { initials, roleClass } from '../../utils';
import StatusDot from '../common/StatusDot';
import StatusPicker from '../common/StatusPicker';
import { LogOut, Layers } from 'lucide-react';

export default function Sidebar({ links, active, onNav, collapsed }) {
  const { user, logout } = useAuth();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon-wrapper">
          <Layers size={22} className="logo-icon" />
        </div>
        {!collapsed && <span className="logo-text">TaskFlow</span>}
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <button
            key={link.id}
            className={`nav-link ${active === link.id ? 'active' : ''}`}
            onClick={() => onNav(link.id)}
            title={collapsed ? link.label : undefined}
          >
            <span className="nav-link-icon">{link.icon}</span>
            {!collapsed && <span className="nav-link-label">{link.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              className="ava ava-md"
              style={{ background: user?.color || '#6366f1', color: '#fff' }}
            >
              {initials(user?.name)}
            </div>
            <StatusDot
              status={user?.status || 'Offline'}
              size={12}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                border: '2px solid var(--bg-sidebar)',
              }}
            />
          </div>

          {!collapsed && (
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <span className={`tf-badge ${roleClass(user?.role)}`}>
                {user?.role}
              </span>
            </div>
          )}

          {!collapsed && (
            <button className="btn-icon" onClick={logout} title="Sign out">
              <LogOut size={16} />
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="sidebar-status-picker">
            <StatusPicker />
          </div>
        )}
      </div>
    </aside>
  );
}