import { useState, useEffect, useCallback } from 'react';
import AppShell from '../../components/layout/AppShell';
import KanbanBoard from '../../components/common/KanbanBoard';
import TaskViewModal from '../../components/common/TaskViewModal';
import StatCard from '../../components/common/StatCard';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import MyProjects from './MyProjects';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useStatus } from '../../hooks/useStatus';
import { priorityClass, statusClass, formatDate, isOverdue } from '../../utils';
import {
  Kanban,
  Clock,
  Activity,
  CheckCircle2,
  FolderGit2,
  MessageSquare,
} from 'lucide-react';

const LINKS = [
  { id: 'board', label: 'My Board', icon: <Kanban size={18} /> },
  { id: 'pending', label: 'Pending Tasks', icon: <Clock size={18} /> },
  { id: 'inprogress', label: 'In Progress', icon: <Activity size={18} /> },
  { id: 'completed', label: 'Completed', icon: <CheckCircle2 size={18} /> },
  { id: 'projects', label: 'My Projects', icon: <FolderGit2 size={18} /> },
];

export default function UserDash() {
  useStatus();
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState('board');
  const [tasks, setTasks] = useState([]);
  const [viewTask, setViewTask] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/tasks');
      setTasks(Array.isArray(data) ? data : data?.data || []);
    } catch {
      toast('Failed to load tasks', 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = useCallback(
    async (taskId, newStatus, originalTask) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      try {
        const { data } = await api.put(`/tasks/${taskId}`, { status: newStatus });
        setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));
        toast(`Task moved to ${newStatus}`, 'success');
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

  const byStatus = (s) => tasks.filter((t) => t.status === s);

  return (
    <AppShell links={LINKS} active={active} onNav={setActive} onSelectTask={setViewTask}>
      {active === 'board' && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">My Personal Board</h1>
              <p className="subtitle-text">Drag and drop tasks to update progress in real time.</p>
            </div>
          </div>

          <div className="stats-grid-modern">
            <StatCard label="Assigned Tasks" value={stats.total} type="total" sparkline={[1, 2, 4, stats.total]} />
            <StatCard label="Pending" value={stats.pending} type="pending" sparkline={[0, 1, stats.pending]} />
            <StatCard label="In Progress" value={stats.inProgress} type="progress" sparkline={[1, 3, stats.inProgress]} />
            <StatCard label="Completed" value={stats.completed} type="done" sparkline={[0, 2, stats.completed]} />
          </div>

          <KanbanBoard
            tasks={tasks}
            onView={setViewTask}
            onEdit={() => {}}
            onDelete={() => {}}
            onStatusChange={handleStatusChange}
            canEdit={false}
          />
        </div>
      )}

      {(active === 'pending' || active === 'inprogress' || active === 'completed') && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">
                {active === 'pending'
                  ? 'Pending Tasks'
                  : active === 'inprogress'
                  ? 'In Progress Work'
                  : 'Completed Tasks'}
              </h1>
              <p className="subtitle-text">
                {active === 'pending'
                  ? 'Tasks queued for execution'
                  : active === 'inprogress'
                  ? 'Active work items in your queue'
                  : 'Finished tasks'}
              </p>
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
                    <th>Due Date</th>
                    <th>Discussion</th>
                  </tr>
                </thead>
                <tbody>
                  {byStatus(
                    active === 'pending'
                      ? 'Pending'
                      : active === 'inprogress'
                      ? 'In Progress'
                      : 'Completed'
                  ).map((t) => (
                    <tr key={t._id} onClick={() => setViewTask(t)} className="clickable-row">
                      <td className="font-semibold">{t.title}</td>
                      <td>
                        <span className={`tf-badge priority-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                      </td>
                      <td>
                        <span className={`tf-badge status-${t.status?.toLowerCase().replace(/\s+/g, '-')}`}>{t.status}</span>
                      </td>
                      <td className={isOverdue(t.dueDate, t.status) ? 'text-danger font-semibold' : 'text-muted'}>
                        {formatDate(t.dueDate)}
                      </td>
                      <td>
                        <Button size="sm" variant="ghost" icon={MessageSquare} onClick={() => setViewTask(t)}>
                          Open Drawer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {active === 'projects' && <MyProjects />}

      <TaskViewModal
        task={viewTask}
        open={!!viewTask}
        onClose={() => setViewTask(null)}
      />
    </AppShell>
  );
}