import React, { useState } from 'react';
import { Search, Bell, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import Avatar from '../common/Avatar';
import StatusPicker from '../common/StatusPicker';
import Button from '../common/Button';

export default function Header({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenCommandPalette,
  onNewTask,
}) {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="btn-icon sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Global Search trigger */}
        <button
          type="button"
          className="header-search-trigger"
          onClick={onOpenCommandPalette}
          aria-label="Search tasks, projects, people"
        >
          <Search size={16} />
          <span className="search-placeholder">Search tasks, projects, people...</span>
          <span className="search-kbd">Ctrl K</span>
        </button>
      </div>

      <div className="header-right">
        {/* Notification Bell */}
        <div className="header-dropdown-wrapper">
          <button
            type="button"
            className="btn-icon notification-btn"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="Notifications"
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
                    <p className="notification-text">Sara moved <strong>Login redesign</strong> to In Review.</p>
                    <span className="notification-time">12 minutes ago</span>
                  </div>
                </div>
                <div className="notification-item">
                  <div>
                    <p className="notification-text">Sprint 14 end date approaching in 6 days.</p>
                    <span className="notification-time">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <ThemeToggle />

        {/* New Task CTA */}
        {onNewTask && (
          <Button icon={Plus} size="sm" onClick={onNewTask}>
            New task
          </Button>
        )}

        {/* User Profile dropdown */}
        <div className="header-dropdown-wrapper">
          <button
            type="button"
            className="header-user-btn"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            aria-label="User profile menu"
          >
            <Avatar user={user} name={user?.name} color={user?.color} status={user?.status || 'Online'} size={32} />
          </button>

          {showProfileMenu && (
            <div className="header-dropdown-menu profile-menu animate-fadeIn">
              <div className="profile-menu-info">
                <p className="profile-menu-name">{user?.name}</p>
                <p className="profile-menu-email">{user?.email}</p>
                <span className="tf-badge tf-badge-sm mt-1">{user?.role}</span>
              </div>
              <div className="profile-menu-divider" />
              <div className="profile-menu-status-section">
                <p className="status-section-label">Presence Status</p>
                <StatusPicker />
              </div>
              <div className="profile-menu-divider" />
              <button
                type="button"
                className="profile-menu-item logout-item"
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
