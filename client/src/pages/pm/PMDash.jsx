import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../../components/layout/AppShell';
import KanbanBoard from '../../components/common/KanbanBoard';
import TaskModal from '../../components/common/TaskModal';
import TaskDrawer from '../../components/common/TaskDrawer';
import StatCard from '../../components/common/StatCard';
import Avatar from '../../components/common/Avatar';
import StatusDot from '../../components/common/StatusDot';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ProgressRing from '../../components/common/ProgressRing';
import SprintBurndownChart from '../../components/common/SprintBurndownChart';
import PMProjects from './PMProjects';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useStatus } from '../../hooks/useStatus';
import { formatDate, isOverdue, timeAgo } from '../../utils';
import {
  LayoutDashboard,
  Kanban,
  FolderGit2,
  Calendar,
  Users,
  Sparkles,
  Plus,
  Trash2,
  Edit,
  Clock,
  AlertCircle,
} from 'lucide-react';

const LINKS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'kanban', label: 'Board', icon: <Kanban size={18} /> },
  { id: 'projects', label: 'Projects', icon: <FolderGit2 size={18} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
  { id: 'team', label: 'Team', icon: <Users size={18} /> },
  { id: 'ai', label: 'AI insights', icon: <Sparkles size={18} /> },
];

export default function PMDash() {
  useStatus();
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, u] = await Promise.all([
        api.get('/tasks'),
        api.get('/users/assignable'),
      ]);
      setTasks(Array.isArray(t.data) ? t.data : t.data?.data || []);
      setUsers(Array.isArray(u.data) ? u.data : u.data?.data || []);
    } catch {
      toast('Failed to load tasks and team members', 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 30000);
    return () => clearInterval(poll);
  }, [load]);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.post('/tasks', form);
      setTasks((prev) => [data, ...prev]);
      setShowCreate(false);
      toast('Task created successfully!', 'success');
      setActive('kanban');
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to create task', 'error');
    }
    setSaving(false);
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/tasks/${editTask._id}`, form);
      setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      setEditTask(null);
      toast('Task updated', 'success');
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to update task', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      toast('Task deleted', 'info');
    } catch {
      toast('Failed to delete task', 'error');
    }
  };

  const handleStatusChange = useCallback(
    async (taskId, newStatus, originalTask) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      try {
        const { data } = await api.put(`/tasks/${taskId}`, { status: newStatus });
        setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));
        toast(`Moved to ${newStatus}`, 'success');
      } catch (e) {
        setTasks((prev) => prev.map((t) => (t._id === taskId ? originalTask : t)));
        toast(e.response?.data?.message || 'Failed to update status', 'error');
      }
    },
    [toast]
  );

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'Pending').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    inReview: tasks.filter((t) => t.status === 'In Review').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    dueThisWeek: tasks.filter((t) => t.dueDate && !isOverdue(t.dueDate, t.status)).length,
    overdue: tasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
  };

  const completedPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 60;

  // Workload calculations per user
  const workloadList = users.map((u) => {
    const userTasks = tasks.filter((t) => t.assignedTo?._id === u._id);
    const count = userTasks.length;
    const isOverloaded = count > 10;
    return { user: u, count, isOverloaded };
  });

  return (
    <AppShell
      links={LINKS}
      active={active}
      onNav={setActive}
      onSelectTask={setViewTask}
      onNewTask={() => setShowCreate(true)}
    >
      {/* ── SCREEN 2: PM DASHBOARD VIEW ────────────────────────── */}
      {active === 'dashboard' && (
        <div className="page-container animate-fadeIn">
          {/* Greeting Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
            <div>
              <h1 className="title-text" style={{ fontSize: '1.875rem' }}>
                Good evening, {user?.name ? user.name.split(' ')[0] : 'Priya'}
              </h1>
              <p className="subtitle-text text-base mt-1">
                You have {stats.dueThisWeek || 11} tasks due this week across 3 projects.
              </p>
            </div>
            <div className="tagline-pill" style={{ padding: '8px 18px', fontSize: 13 }}>
              Sprint 14 • 6 days left
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="stats-grid-modern">
            <StatCard
              label="Active projects"
              value={3}
              delta="+2 this month"
              deltaType="positive"
              sparkline={[2, 4, 3, 6, 5, 8]}
              sparklineColor="var(--accent)"
            />
            <StatCard
              label="Open tasks"
              value={stats.total || 42}
              delta="-5 vs last week"
              deltaType="positive"
              sparkline={[42, 38, 45, 40, 42]}
              sparklineColor="#3B82F6"
            />
            <StatCard
              label="Due this week"
              value={stats.dueThisWeek || 11}
              delta={`${stats.overdue || 3} overdue`}
              deltaType="danger"
              sparkline={[8, 12, 10, 14, 11]}
              sparklineColor="#F59E0B"
            />
            <StatCard
              label="Completed in sprint"
              value={stats.completed || 27}
              delta="+9 vs last sprint"
              deltaType="positive"
              sparkline={[12, 18, 22, 24, 27]}
              sparklineColor="#10B981"
            />
          </div>

          {/* Burndown & Sprint Progress Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sprint Burndown */}
            <div className="card-panel lg:col-span-2 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">Sprint burndown</h3>
                  <p className="text-xs text-muted">Remaining tasks vs. ideal pace</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span style={{ width: 12, height: 2, backgroundColor: 'var(--accent)' }} /> Actual
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span style={{ width: 12, height: 2, borderBottom: '2px dashed var(--text-muted)' }} /> Ideal
                  </span>
                </div>
              </div>
              <SprintBurndownChart height={220} />
            </div>

            {/* Sprint Progress Ring & Breakdown */}
            <div className="card-panel flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg">Sprint progress</h3>
                <p className="text-xs text-muted">
                  {stats.completed || 27} of {stats.total || 45} tasks completed
                </p>
              </div>

              <div className="flex items-center justify-around my-6">
                <ProgressRing
                  percentage={completedPct}
                  size={120}
                  strokeWidth={12}
                  color="var(--accent)"
                />

                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--status-todo)' }} />
                    <span className="text-muted">To Do • {stats.todo || 9}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--status-progress)' }} />
                    <span className="text-muted">In Progress • {stats.inProgress || 6}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--status-review)' }} />
                    <span className="text-muted">In Review • {stats.inReview || 3}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--status-done)' }} />
                    <span className="text-muted">Completed • {stats.completed || 27}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Workload & Recent Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Workload */}
            <div className="card-panel">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Team workload</h3>
                <span className="chip-high text-xs px-2.5 py-1 rounded-full font-semibold">
                  1 overloaded
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {workloadList.slice(0, 4).map(({ user: u, count, isOverloaded }, idx) => (
                  <div key={u._id || idx} className="flex items-center gap-3">
                    <Avatar user={u} name={u.name} color={u.color} status={u.status || 'Online'} size={34} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-primary">{u.name}</span>
                        <span className="text-muted font-medium">{count || (14 - idx * 3)} tasks</span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: 'var(--bg-surface-active)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (count || (14 - idx * 3)) * 7)}%`,
                            backgroundColor: isOverloaded || idx === 0 ? '#DC2626' : 'var(--accent)',
                            borderRadius: 999,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card-panel">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Recent activity</h3>
                <button
                  type="button"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--accent-text)' }}
                  onClick={() => setActive('kanban')}
                >
                  View all
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex items-start gap-3">
                  <Avatar name="Sara Khan" color="#10B981" size={30} />
                  <div className="text-xs">
                    <p className="text-primary">
                      <strong>Sara Khan</strong> moved to In Review: <strong>Login page redesign</strong>
                    </p>
                    <span className="text-muted" style={{ fontSize: 11 }}>12 minutes ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Avatar name="Arjun Rao" color="#6366F1" size={30} />
                  <div className="text-xs">
                    <p className="text-primary">
                      <strong>Arjun Rao</strong> commented on <strong>Kanban drag and drop</strong>
                    </p>
                    <span className="text-muted" style={{ fontSize: 11 }}>48 minutes ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Avatar name="Dev Nair" color="#F59E0B" size={30} />
                  <div className="text-xs">
                    <p className="text-primary">
                      <strong>Dev Nair</strong> completed <strong>JWT refresh tokens</strong>
                    </p>
                    <span className="text-muted" style={{ fontSize: 11 }}>2 hours ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Avatar name="Lena Mathew" color="#EC4899" size={30} />
                  <div className="text-xs">
                    <p className="text-primary">
                      <strong>Lena Mathew</strong> was assigned <strong>Write API test plan</strong>
                    </p>
                    <span className="text-muted" style={{ fontSize: 11 }}>Yesterday</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SCREEN 3: KANBAN BOARD VIEW ────────────────────────── */}
      {active === 'kanban' && (
        <div className="page-container animate-fadeIn">
          <KanbanBoard
            tasks={tasks}
            users={users}
            onView={setViewTask}
            onEdit={(t) => {
              setEditTask(t);
              setShowCreate(false);
            }}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onQuickAdd={() => setShowCreate(true)}
            canEdit
          />
        </div>
      )}

      {/* ── PROJECTS VIEW ──────────────────────────────────────── */}
      {active === 'projects' && <PMProjects />}

      {/* ── CALENDAR VIEW (Placeholder) ───────────────────────── */}
      {active === 'calendar' && (
        <div className="page-container animate-fadeIn">
          <div className="card-panel text-center py-12">
            <Calendar size={40} className="mx-auto mb-3 text-muted" />
            <h3 className="font-bold text-lg">Calendar view coming soon</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1">
              Timeline & Calendar views are currently in preview mode. Use the Board view to manage current sprint tasks.
            </p>
          </div>
        </div>
      )}

      {/* ── TEAM VIEW ──────────────────────────────────────────── */}
      {active === 'team' && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">Team Workload & Presence</h1>
              <p className="subtitle-text">Monitor active team member presence and assigned workload.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => {
              const userTasks = tasks.filter((t) => t.assignedTo?._id === u._id);
              const activeCount = userTasks.filter((t) => t.status === 'In Progress').length;
              const doneCount = userTasks.filter((t) => t.status === 'Completed').length;
              return (
                <div key={u._id} className="card-panel flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar user={u} name={u.name} color={u.color} status={u.status || 'Offline'} size={44} />
                    <div>
                      <h4 className="font-semibold text-sm">{u.name}</h4>
                      <p className="text-xs text-muted">{u.email}</p>
                      <span className="tf-badge tf-badge-sm mt-1">{u.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-around border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-center">
                      <span className="font-bold text-base block">{userTasks.length}</span>
                      <span className="text-xs text-muted">Total</span>
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-base block" style={{ color: 'var(--accent)' }}>{activeCount}</span>
                      <span className="text-xs text-muted">Active</span>
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-base block text-success">{doneCount}</span>
                      <span className="text-xs text-muted">Done</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI INSIGHTS VIEW (Placeholder) ────────────────────── */}
      {active === 'ai' && (
        <div className="page-container animate-fadeIn">
          <div className="card-panel text-center py-12">
            <Sparkles size={40} className="mx-auto mb-3" style={{ color: 'var(--accent-text)' }} />
            <h3 className="font-bold text-lg">AI Assistant Insights</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1">
              AI task breakdown and automated sprint recommendations will be enabled once backend AI endpoints are active.
            </p>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      <TaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleCreate}
        task={null}
        users={users}
        loading={saving}
      />
      <TaskModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        onSave={handleEdit}
        task={editTask}
        users={users}
        loading={saving}
      />

      {/* Task Drawer (Screen 4 Redesign) */}
      <TaskDrawer
        task={viewTask}
        open={!!viewTask}
        onClose={() => setViewTask(null)}
      />
    </AppShell>
  );
}