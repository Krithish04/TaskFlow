import { useState, useEffect, useCallback } from 'react';
import AppShell from '../../components/layout/AppShell';
import KanbanBoard from '../../components/common/KanbanBoard';
import TaskModal from '../../components/common/TaskModal';
import TaskViewModal from '../../components/common/TaskViewModal';
import StatCard from '../../components/common/StatCard';
import Avatar from '../../components/common/Avatar';
import StatusDot from '../../components/common/StatusDot';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import PMProjects from './PMProjects';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useStatus } from '../../hooks/useStatus';
import { statusClass, priorityClass, formatDate, isOverdue } from '../../utils';
import {
  Kanban,
  PlusCircle,
  CheckSquare,
  Users,
  FolderGit2,
  Plus,
  Trash2,
  Edit,
} from 'lucide-react';

const LINKS = [
  { id: 'kanban', label: 'Kanban Board', icon: <Kanban size={18} /> },
  { id: 'create', label: 'Create Task', icon: <PlusCircle size={18} /> },
  { id: 'mytasks', label: 'My Tasks', icon: <CheckSquare size={18} /> },
  { id: 'team', label: 'Team', icon: <Users size={18} /> },
  { id: 'projects', label: 'Projects', icon: <FolderGit2 size={18} /> },
];

export default function PMDash() {
  useStatus();
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState('kanban');
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
    pending: tasks.filter((t) => t.status === 'Pending').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
  };

  const myTasks = tasks.filter(
    (t) => t.createdBy?._id === user?._id || t.assignedTo?._id === user?._id
  );

  return (
    <AppShell
      links={LINKS}
      active={active}
      onNav={(id) => {
        setActive(id);
        if (id === 'create') setShowCreate(true);
      }}
      onSelectTask={setViewTask}
    >
      {active === 'kanban' && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">Kanban Board</h1>
              <p className="subtitle-text">Manage agile tasks, drag-and-drop workflow, and sprint progress.</p>
            </div>
            <Button icon={Plus} onClick={() => setShowCreate(true)}>
              New Task
            </Button>
          </div>

          <div className="stats-grid-modern">
            <StatCard label="Total Tasks" value={stats.total} type="total" sparkline={[2, 4, 6, 8, stats.total]} />
            <StatCard label="Pending" value={stats.pending} type="pending" sparkline={[1, 2, 3, stats.pending]} />
            <StatCard label="In Progress" value={stats.inProgress} type="progress" sparkline={[0, 2, 4, stats.inProgress]} />
            <StatCard label="Completed" value={stats.completed} type="done" sparkline={[1, 3, 5, stats.completed]} />
          </div>

          <KanbanBoard
            tasks={tasks}
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

      {active === 'create' && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">Create Task</h1>
              <p className="subtitle-text">Assign work items, set deadlines, and specify priority levels.</p>
            </div>
          </div>
          <div className="card-panel">
            <TaskModal
              open={true}
              onClose={() => setActive('kanban')}
              onSave={handleCreate}
              task={null}
              users={users}
              loading={saving}
              inline
            />
          </div>
        </div>
      )}

      {active === 'mytasks' && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">My Assigned Tasks</h1>
              <p className="subtitle-text">Tasks created by or assigned to you.</p>
            </div>
          </div>

          <div className="card-panel no-padding">
            <div className="table-responsive">
              <table className="tf-table">
                <thead>
                  <tr>
                    <th>Task Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myTasks.map((t) => (
                    <tr key={t._id} onClick={() => setViewTask(t)} className="clickable-row">
                      <td className="font-semibold">{t.title}</td>
                      <td>
                        <span className={`tf-badge priority-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                      </td>
                      <td>
                        <span className={`tf-badge status-${t.status?.toLowerCase().replace(/\s+/g, '-')}`}>{t.status}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={t.assignedTo?.name || 'Unassigned'} size={24} color={t.assignedTo?.color || '#6366f1'} />
                          <span className="text-sm">{t.assignedTo?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className={isOverdue(t.dueDate, t.status) ? 'text-danger font-semibold' : 'text-muted'}>
                        {formatDate(t.dueDate)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button className="btn-icon" onClick={() => setEditTask(t)}>
                            <Edit size={16} />
                          </button>
                          <button className="btn-icon text-danger" onClick={() => handleDelete(t._id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {active === 'team' && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">Team Workload & Presence</h1>
              <p className="subtitle-text">Monitor active team member presence and assigned workload.</p>
            </div>
          </div>

          <div className="grid-cards-3col">
            {users.map((u) => {
              const userTasks = tasks.filter((t) => t.assignedTo?._id === u._id);
              const activeCount = userTasks.filter((t) => t.status === 'In Progress').length;
              const doneCount = userTasks.filter((t) => t.status === 'Completed').length;
              return (
                <div key={u._id} className="team-card-modern">
                  <div className="team-card-header">
                    <div style={{ position: 'relative' }}>
                      <Avatar name={u.name} color={u.color || '#6366f1'} size={44} />
                      <StatusDot
                        status={u.status || 'Offline'}
                        size={12}
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          border: '2px solid var(--bg-card)',
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="team-card-name">{u.name}</h4>
                      <p className="team-card-email">{u.email}</p>
                      <span className="tf-badge tf-badge-sm">{u.role}</span>
                    </div>
                  </div>

                  <div className="team-card-stats-row">
                    <div className="stat-box">
                      <span className="stat-num">{userTasks.length}</span>
                      <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-num active">{activeCount}</span>
                      <span className="stat-label">Active</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-num done">{doneCount}</span>
                      <span className="stat-label">Done</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {active === 'projects' && <PMProjects />}

      {/* Task Modal & View Modal */}
      <TaskModal
        open={showCreate && active !== 'create'}
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
      <TaskViewModal
        task={viewTask}
        open={!!viewTask}
        onClose={() => setViewTask(null)}
      />
    </AppShell>
  );
}