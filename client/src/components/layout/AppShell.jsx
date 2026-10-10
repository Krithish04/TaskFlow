import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '../common/CommandPalette';

export default function AppShell({
  links,
  active,
  onNav,
  children,
  onSelectTask,
  onSelectProject,
  onNewTask,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        links={links}
        active={active}
        onNav={onNav}
        collapsed={sidebarCollapsed}
      />

      <div className="app-main">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onNewTask={onNewTask}
        />

        <main className="app-content">{children}</main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectTask={onSelectTask}
        onSelectProject={onSelectProject}
      />
    </div>
  );
}
