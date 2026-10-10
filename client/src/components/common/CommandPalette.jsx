import React, { useState, useEffect } from 'react';
import { Search, X, CheckSquare, Folder, User as UserIcon, ArrowRight } from 'lucide-react';
import api from '../../api/axios';

export default function CommandPalette({ isOpen, onClose, onSelectTask, onSelectProject }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ tasks: [], projects: [], users: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults({ tasks: [], projects: [], users: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [tasksRes, projectsRes, usersRes] = await Promise.all([
          api.get('/tasks').catch(() => ({ data: [] })),
          api.get('/projects').catch(() => ({ data: [] })),
          api.get('/users').catch(() => ({ data: [] })),
        ]);

        const q = query.toLowerCase();
        const allTasks = Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.data || [];
        const allProjects = Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data?.data || [];
        const allUsers = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || [];

        setResults({
          tasks: allTasks.filter((t) => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)).slice(0, 5),
          projects: allProjects.filter((p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)).slice(0, 5),
          users: allUsers.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)).slice(0, 5),
        });
      } catch (err) {
        console.error('Command palette search error', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const totalResults = results.tasks.length + results.projects.length + results.users.length;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-box" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-input-wrapper">
          <Search className="command-palette-search-icon" size={18} />
          <input
            autoFocus
            className="command-palette-input"
            placeholder="Type a command or search tasks, projects, members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="command-palette-shortcut">ESC</span>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="command-palette-results">
          {loading && <div className="command-palette-loading">Searching...</div>}

          {!loading && query.trim() && totalResults === 0 && (
            <div className="command-palette-empty">No matching tasks, projects, or members found.</div>
          )}

          {!loading && !query.trim() && (
            <div className="command-palette-hint">
              <p>Quick navigation & search</p>
              <div className="command-palette-tips">
                <span><CheckSquare size={14} /> Search tasks by title</span>
                <span><Folder size={14} /> Search active projects</span>
                <span><UserIcon size={14} /> Search team members</span>
              </div>
            </div>
          )}

          {!loading && results.tasks.length > 0 && (
            <div className="command-section">
              <div className="command-section-title">Tasks</div>
              {results.tasks.map((task) => (
                <div
                  key={task._id}
                  className="command-item"
                  onClick={() => {
                    if (onSelectTask) onSelectTask(task);
                    onClose();
                  }}
                >
                  <CheckSquare size={16} className="command-item-icon task" />
                  <span className="command-item-label">{task.title}</span>
                  <span className={`tf-badge tf-badge-sm status-${task.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {task.status}
                  </span>
                  <ArrowRight size={14} className="command-item-arrow" />
                </div>
              ))}
            </div>
          )}

          {!loading && results.projects.length > 0 && (
            <div className="command-section">
              <div className="command-section-title">Projects</div>
              {results.projects.map((proj) => (
                <div
                  key={proj._id}
                  className="command-item"
                  onClick={() => {
                    if (onSelectProject) onSelectProject(proj);
                    onClose();
                  }}
                >
                  <Folder size={16} className="command-item-icon project" />
                  <span className="command-item-label">{proj.title}</span>
                  <span className="tf-badge tf-badge-sm">{proj.status}</span>
                  <ArrowRight size={14} className="command-item-arrow" />
                </div>
              ))}
            </div>
          )}

          {!loading && results.users.length > 0 && (
            <div className="command-section">
              <div className="command-section-title">Team Members</div>
              {results.users.map((user) => (
                <div key={user._id} className="command-item">
                  <UserIcon size={16} className="command-item-icon user" />
                  <span className="command-item-label">{user.name}</span>
                  <span className="text-muted text-xs">{user.email}</span>
                  <span className="tf-badge tf-badge-sm">{user.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
