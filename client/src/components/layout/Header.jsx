import React, { useState } from 'react';
import { Search, Sun, Moon, Bell, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import StatusDot from '../common/StatusDot';
import StatusPicker from '../common/StatusPicker';
import CommandPalette from '../common/CommandPalette';
import { initials, roleClass } from '../../utils';

export default function Header({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenCommandPalette,
  onSelectTask,
  onSelectProject,
}) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="btn-icon sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Global Search trigger */}
        <button className="header-search-trigger" onClick={onOpenCommandPalette}>
          <Search size={16} />
          <span className="search-placeholder">Search tasks, projects, members...</span>
          <span className="search-kbd">⌘K</span>
        </button>
      </div>

      <div className="header-right">
        {/* Theme switcher */}
        <button
          className="btn-icon theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notification Bell */}
        <div className="header-dropdown-wrapper">
          <button
            className="btn-icon notification-btn"
            onClick={() => setShowNotifications((prev) => !prev)}
            title="Notifications"
          >
            <Bell size={18} />
            <span className="notification-badge-dot" />
          </button>

          {showNotifications && (
            <div className="header-dropdown-menu notification-menu animate-fadeIn">
              <div className="dropdown-header">
                <h4>Notifications</h4>
                <span className="text-xs text-muted">2 new</span>
              </div>
              <div className="dropdown-body">
                <div className="notification-item unread">
                  <div className="notification-dot" />
                  <div>
                    <p className="notification-text">System maintenance scheduled for midnight.</p>
                    <span className="notification-time">10 mins ago</span>
                  </div>
                </div>
                <div className="notification-item">
                  <div>
                    <p className="notification-text">You were assigned to project <strong>TaskFlow v2</strong></p>
                    <span className="notification-time">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User profile dropdown & status ring */}
        <div className="header-dropdown-wrapper">
          <button
            className="header-user-btn"
            onClick={() => setShowProfileMenu((prev) => !prev)}
          >
            <div style={{ position: 'relative' }}>
              <div
                className="ava ava-sm"
                style={{ background: user?.color || '#6366f1', color: '#fff' }}
              >
                {initials(user?.name)}
              </div>
              <StatusDot
                status={user?.status || 'Offline'}
                size={10}
                style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  border: '2px solid var(--bg-surface)',
                }}
              />
            </div>
            <span className="header-user-name">{user?.name}</span>
          </button>

          {showProfileMenu && (
            <div className="header-dropdown-menu profile-menu animate-fadeIn">
              <div className="profile-menu-info">
                <p className="profile-menu-name">{user?.name}</p>
                <p className="profile-menu-email">{user?.email}</p>
                <span className={`tf-badge ${roleClass(user?.role)}`}>{user?.role}</span>
              </div>
              <div className="profile-menu-divider" />
              <div className="profile-menu-status-section">
                <p className="status-section-label">Presence Status</p>
                <StatusPicker />
              </div>
              <div className="profile-menu-divider" />
              <button className="profile-menu-item logout-item" onClick={logout}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
