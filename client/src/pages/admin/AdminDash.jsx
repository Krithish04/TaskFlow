import { useState, useEffect, useCallback } from 'react';
import AppShell from '../../components/layout/AppShell';
import Drawer from '../../components/common/Drawer';
import StatCard from '../../components/common/StatCard';
import Avatar from '../../components/common/Avatar';
import StatusDot from '../../components/common/StatusDot';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import {
  roleClass,
  priorityClass,
  statusClass,
  formatDate,
  isOverdue,
  initials,
} from '../../utils';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  Plus,
  Trash2,
  Edit,
  Folder,
  Shield,
  Activity,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const LINKS = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'members', label: 'All Members', icon: <Users size={18} /> },
  { id: 'tasks', label: 'All Tasks', icon: <CheckSquare size={18} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
];

export default function AdminDash() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // Modals / Drawers state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'User' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, tasksRes, projectsRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/tasks').catch(() => ({ data: [] })),
        api.get('/projects').catch(() => ({ data: [] })),
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.data || []);
      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data?.data || []);
    } catch (err) {
      toast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser._id}`, { role: userForm.role });
        toast('User role updated successfully', 'success');
      } else {
        await api.post('/auth/register', userForm);
        toast('New member created successfully', 'success');
      }
      setShowUserModal(false);
      setEditingUser(null);
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save user', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast('User deleted', 'success');
      fetchData();
    } catch (err) {
      toast('Failed to delete user', 'error');
    }
  };

  // Analytics Chart Data Preparation
  const taskStatusData = [
    { name: 'Pending', value: tasks.filter((t) => t.status === 'Pending').length, color: '#64748b' },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'In Progress').length, color: '#6366f1' },
    { name: 'In Review', value: tasks.filter((t) => t.status === 'In Review').length, color: '#f59e0b' },
    { name: 'Completed', value: tasks.filter((t) => t.status === 'Completed').length, color: '#10b981' },
  ];

  const memberWorkloadData = users.map((u) => ({
    name: u.name,
    tasks: tasks.filter((t) => t.assignedTo?._id === u._id || t.assignedTo === u._id).length,
  }));

  return (
    <AppShell
      links={LINKS}
      active={activeTab}
      onNav={setActiveTab}
      onSelectTask={setSelectedTask}
      onSelectProject={setSelectedProject}
    >
      {activeTab === 'overview' && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">System Overview</h1>
              <p className="subtitle-text">Global metrics, activity feeds, and system health.</p>
            </div>
            <Button icon={Plus} onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', password: '', role: 'User' }); setShowUserModal(true); }}>
              Add Member
            </Button>
          </div>

          <div className="stats-grid-modern">
            <StatCard label="Total Tasks" value={tasks.length} type="total" sparkline={[3, 5, 8, 12, 10, 15, tasks.length]} />
            <StatCard label="In Progress" value={taskStatusData[1].value} type="progress" sparkline={[1, 3, 4, 6, 8, taskStatusData[1].value]} />
            <StatCard label="Completed" value={taskStatusData[3].value} type="done" sparkline={[0, 2, 4, 7, 9, taskStatusData[3].value]} />
            <StatCard label="Total Members" value={users.length} type="pending" sparkline={[1, 2, 3, 4, users.length]} />
          </div>

          {/* Charts Row */}
          <div className="dashboard-grid-2col">
            <div className="card-panel">
              <div className="card-panel-header">
                <h3>Task Status Distribution</h3>
              </div>
              <div className="chart-container" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4}>
                      {taskStatusData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-panel">
              <div className="card-panel-header">
                <h3>Member Workload</h3>
              </div>
              <div className="chart-container" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberWorkloadData}>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Bar dataKey="tasks" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">Team Members</h1>
              <p className="subtitle-text">Manage member roles, active statuses, and access credentials.</p>
            </div>
            <Button icon={Plus} onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', password: '', role: 'User' }); setShowUserModal(true); }}>
              Add Member
            </Button>
          </div>

          <div className="card-panel no-padding">
            <div className="table-responsive">
              <table className="tf-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{ position: 'relative' }}>
                            <Avatar name={u.name} color={u.color || '#6366f1'} size={36} />
                            <StatusDot status={u.status || 'Offline'} size={10} style={{ position: 'absolute', bottom: 0, right: 0, border: '2px solid var(--bg-surface)' }} />
                          </div>
                          <div>
                            <div className="font-semibold text-primary">{u.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted">{u.email}</td>
                      <td>
                        <span className={`tf-badge ${roleClass(u.role)}`}>{u.role}</span>
                      </td>
                      <td>
                        <StatusDot status={u.status || 'Offline'} showLabel />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button className="btn-icon" onClick={() => { setEditingUser(u); setUserForm({ role: u.role }); setShowUserModal(true); }}>
                            <Edit size={16} />
                          </button>
                          <button className="btn-icon text-danger" onClick={() => handleDeleteUser(u._id)}>
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

      {activeTab === 'tasks' && (
        <div className="page-container animate-fadeIn">
          <div className="page-header-title">
            <div>
              <h1 className="title-text">All Tasks</h1>
              <p className="subtitle-text">Supervise global tasks across all active projects.</p>
            </div>
          </div>

          <div className="card-panel no-padding">
            <div className="table-responsive">
              <table className="tf-table">
                <thead>
                  <tr>
                    <th>Task Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t._id} onClick={() => setSelectedTask(t)} className="clickable-row">
                      <td className="font-semibold">{t.title}</td>
                      <td>
                        <span className={`tf-badge status-${t.status?.toLowerCase().replace(/\s+/g, '-')}`}>{t.status}</span>
                      </td>
                      <td>
                        <span className={`tf-badge priority-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={t.assignedTo?.name || 'Unassigned'} size={24} color={t.assignedTo?.color || '#64748b'} />
                          <span className="text-sm">{t.assignedTo?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className={isOverdue(t.dueDate, t.status) ? 'text-danger font-semibold' : 'text-muted'}>
                        {formatDate(t.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Edit Member Role' : 'Add New Team Member'}</h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!editingUser && (
                <>
                  <div className="field">
                    <label>Full Name</label>
                    <input className="input" value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
                  </div>
                  <div className="field">
                    <label>Email Address</label>
                    <input className="input" type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input className="input" type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                  </div>
                </>
              )}
              <div className="field">
                <label>Role</label>
                <select className="input" value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="User">User (Team Member)</option>
                  <option value="PM">PM (Project Manager)</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="ghost" onClick={() => setShowUserModal(false)}>Cancel</Button>
              <Button onClick={handleSaveUser}>Save Member</Button>
            </div>
          </div>
        </div>
      )}

      {/* Task Drawer */}
      <Drawer isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title || 'Task Details'}>
        {selectedTask && (
          <div className="drawer-task-body">
            <div className="drawer-section">
              <label className="drawer-label">Status & Priority</label>
              <div className="flex gap-2">
                <span className={`tf-badge status-${selectedTask.status?.toLowerCase().replace(/\s+/g, '-')}`}>{selectedTask.status}</span>
                <span className={`tf-badge priority-${selectedTask.priority?.toLowerCase()}`}>{selectedTask.priority}</span>
              </div>
            </div>
            <div className="drawer-section">
              <label className="drawer-label">Description</label>
              <p className="drawer-desc">{selectedTask.description || 'No description provided.'}</p>
            </div>
            <div className="drawer-section">
              <label className="drawer-label">Assignee</label>
              <div className="flex items-center gap-2">
                <Avatar name={selectedTask.assignedTo?.name || 'Unassigned'} size={32} color={selectedTask.assignedTo?.color || '#6366f1'} />
                <span>{selectedTask.assignedTo?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
