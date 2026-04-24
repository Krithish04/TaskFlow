import { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/layout/Sidebar";
import TaskViewModal from "../../components/common/TaskViewModal";
import StatCard from "../../components/common/StatCard";
import Avatar from "../../components/common/Avatar";
import StatusDot from "../../components/common/StatusDot"; // Added
import api from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { useStatus } from "../../hooks/useStatus";
import {
  roleClass,
  priorityClass,
  statusClass,
  formatDate,
  isOverdue,
  initials,
} from "../../utils";

/* Nav Icons and LINKS remain the same... */
const icons = {
  overview: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm8 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm8 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  members: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path
        fillRule="evenodd"
        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
};

const LINKS = [
  { id: "overview", label: "Overview", icon: icons.overview },
  { id: "members", label: "All Members", icon: icons.members },
  { id: "tasks", label: "All Tasks", icon: icons.tasks },
  { id: "reports", label: "Reports", icon: icons.reports },
];

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

/* ── Sub-pages ──────────────────────────────────────── */

function Overview({ tasks, users, onViewTask }) {
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "Pending").length,
    inProgress: tasks.filter((t) => t.status === "In Progress").length,
    completed: tasks.filter((t) => t.status === "Completed").length,
  };

  return (
    <div className="page animate-fadeIn">
      {/* ... Header and Stats remain the same ... */}
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-sub">Full organisation supervision</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Tasks" value={stats.total} type="total" />
        <StatCard label="Pending" value={stats.pending} type="pending" />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          type="progress"
        />
        <StatCard label="Completed" value={stats.completed} type="done" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-hdr">
            <h3>Member Workload</h3>
          </div>
          {users.map((u) => {
            const total = tasks.filter(
              (t) => t.assignedTo?._id === u._id,
            ).length;
            const done = tasks.filter(
              (t) => t.assignedTo?._id === u._id && t.status === "Completed",
            ).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <div key={u._id} className="wl-row">
                {/* UPDATED: Added StatusDot to Avatar */}
                <div style={{ position: "relative", display: "inline-block" }}>
                  <Avatar user={u} size="sm" />
                  <StatusDot
                    status={u.status || "Offline"}
                    size={8}
                    style={{
                      position: "absolute",
                      bottom: -1,
                      right: -1,
                      border: "1px solid var(--bg-card)",
                    }}
                  />
                </div>
                <div className="wl-name">{u.name}</div>
                <div style={{ flex: 1 }}>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="wl-count">
                  {done}/{total} done
                </div>
              </div>
            );
          })}
        </div>
        {/* Recent Tasks Card... */}
        <div className="card">
          <div className="card-hdr">
            <h3>Recent Tasks</h3>
          </div>
          <div className="task-list">
            {tasks.slice(0, 6).map((t) => (
              <div
                key={t._id}
                className="task-row"
                onClick={() => onViewTask(t)}
                style={{ padding: "10px 12px" }}
              >
                <div className="task-row-main">
                  <div className="task-row-title">{t.title}</div>
                  <div className="task-row-meta">
                    <span className={`tag ${statusClass(t.status)}`}>
                      {t.status}
                    </span>
                    <span className={`tag ${priorityClass(t.priority)}`}>
                      {t.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Members({ users, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "User",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) {
      toast("Fill all fields", "err");
      return;
    }
    setSaving(true);
    try {
      await onAdd(form);
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "User" });
    } catch (e) {
      toast(e.response?.data?.message || "Error", "err");
    }
    setSaving(false);
  };

  return (
    <div className="page animate-fadeIn">
      {/* ... Member header and form ... */}
      <div className="page-hdr">
        <div>
          <h1 className="page-title">All Members</h1>
          <p className="page-sub">Manage organisation accounts</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm((s) => !s)}
        >
          + Add Member
        </button>
      </div>

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          {/* ... Form inputs ... */}
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>New Member</h3>
          <div className="input-row" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Jane Smith"
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="jane@co.com"
              />
            </div>
          </div>
          <div className="input-row">
            <div className="field">
              <label>Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="Min 6 chars"
              />
            </div>
            <div className="field">
              <label>Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
              >
                <option value="User">User</option>
                <option value="PM">Project Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? <span className="spinner" /> : "Add Member"}
            </button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>
                  <div className="td-name">
                    {/* UPDATED: Added StatusDot to Table Avatar */}
                    <div
                      style={{ position: "relative", display: "inline-block" }}
                    >
                      <Avatar user={u} size="sm" />
                      <StatusDot
                        status={u.status || "Offline"}
                        size={8}
                        style={{
                          position: "absolute",
                          bottom: -1,
                          right: -1,
                          border: "1px solid var(--bg-card)",
                        }}
                      />
                    </div>
                    {u.name}
                  </div>
                </td>
                <td style={{ color: "var(--text-2)" }}>{u.email}</td>
                <td>
                  <span className={`badge ${roleClass(u.role)}`}>{u.role}</span>
                </td>
                <td>
                  <button
                    className="btn btn-danger btn-xs"
                    onClick={() => onDelete(u._id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* AllTasks and Reports functions remain the same... */
function AllTasks({ tasks, users, onViewTask, onDelete }) {
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fMember, setFMember] = useState("");

  const filtered = tasks.filter(
    (t) =>
      (!search || t.title.toLowerCase().includes(search.toLowerCase())) &&
      (!fStatus || t.status === fStatus) &&
      (!fPriority || t.priority === fPriority) &&
      (!fMember || t.assignedTo?._id === fMember),
  );

  return (
    <div className="page animate-fadeIn">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">All Tasks</h1>
          <p className="page-sub">Monitor every task across the organisation</p>
        </div>
      </div>
      <div className="filter-bar">
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          style={{ width: 200 }}
        />
        <select
          className="input"
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
        <select
          className="input"
          value={fPriority}
          onChange={(e) => setFPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select
          className="input"
          value={fMember}
          onChange={(e) => setFMember(e.target.value)}
        >
          <option value="">All members</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <h4>No tasks match</h4>
        </div>
      ) : (
        <div className="task-list">
          {filtered.map((t) => {
            const overdue = isOverdue(t.dueDate, t.status);
            return (
              <div
                key={t._id}
                className="task-row"
                onClick={() => onViewTask(t)}
              >
                <div className="task-row-main">
                  <div className="task-row-title">{t.title}</div>
                  <div className="task-row-meta">
                    <span className={`tag ${priorityClass(t.priority)}`}>
                      {t.priority}
                    </span>
                    <span className={`tag ${statusClass(t.status)}`}>
                      {t.status}
                    </span>
                    {t.assignedTo && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          color: "var(--text-2)",
                        }}
                      >
                        <Avatar user={t.assignedTo} size="sm" />
                        {t.assignedTo.name}
                      </span>
                    )}
                    {t.dueDate && (
                      <span
                        className={`due-label ${overdue ? "due-overdue" : ""}`}
                      >
                        {formatDate(t.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="task-row-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn btn-danger btn-xs"
                    onClick={() => onDelete(t._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Reports({ tasks, users }) {
  return (
    <div className="page animate-fadeIn">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Productivity & completion analytics</p>
        </div>
      </div>
      <div className="two-col">
        <div className="card">
          <div className="card-hdr">
            <h3>Completion Rate by Member</h3>
          </div>
          {users.map((u) => {
            const total = tasks.filter(
              (t) => t.assignedTo?._id === u._id,
            ).length;
            const done = tasks.filter(
              (t) => t.assignedTo?._id === u._id && t.status === "Completed",
            ).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <div key={u._id} className="bar-item">
                <div className="bar-lbl">
                  <span>{u.name}</span>
                  <span>
                    {pct}% ({done}/{total})
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill bar-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <div className="card-hdr">
            <h3>Priority Breakdown</h3>
          </div>
          {["High", "Medium", "Low"].map((p, i) => {
            const count = tasks.filter((t) => t.priority === p).length;
            const pct = tasks.length
              ? Math.round((count / tasks.length) * 100)
              : 0;
            const cls = ["bar-rose", "bar-amber", "bar-teal"][i];
            return (
              <div key={p} className="bar-item">
                <div className="bar-lbl">
                  <span>{p} Priority</span>
                  <span>
                    {count} tasks ({pct}%)
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${cls}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 24 }}>
            <div className="card-hdr">
              <h3>Status Overview</h3>
            </div>
            {["Pending", "In Progress", "Completed"].map((s, i) => {
              const count = tasks.filter((t) => t.status === s).length;
              const pct = tasks.length
                ? Math.round((count / tasks.length) * 100)
                : 0;
              const cls = ["bar-amber", "bar-accent", "bar-teal"][i];
              return (
                <div key={s} className="bar-item">
                  <div className="bar-lbl">
                    <span>{s}</span>
                    <span>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${cls}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Admin Dashboard ───────────────────────────── */
export default function AdminDash() {
  useStatus(); // Heartbeat for self
  const [active, setActive] = useState("overview");
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [viewTask, setViewTask] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const [t, u] = await Promise.all([api.get("/tasks"), api.get("/users")]);
      setTasks(toArray(t.data));
      setUsers(toArray(u.data));
    } catch {
      toast("Failed to load data", "err");
    }
  }, [toast]);

  useEffect(() => {
    load(); // Initial load

    // UPDATED: Poll every 30 seconds to refresh teammate status dots
    const poll = setInterval(load, 30000);

    return () => clearInterval(poll);
  }, [load]);

  const handleAddUser = async (form) => {
    const { data } = await api.post("/users", form);
    setUsers((prev) => [...prev, data]);
    toast(`${data.name} added`);
  };

  const handleDeleteUser = async (id) => {
    await api.delete(`/users/${id}`);
    setUsers((prev) => prev.filter((u) => u._id !== id));
    toast("Member removed", "err");
  };

  const handleDeleteTask = async (id) => {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t._id !== id));
    toast("Task deleted", "err");
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const { data } = await api.put(`/users/${userId}`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)),
      );
      toast("Role updated successfully");
    } catch (err) {
      toast(err.response?.data?.message || "Failed to update role", "err");
    }
  };

  const pages = {
    overview: <Overview tasks={tasks} users={users} onViewTask={setViewTask} />,
    members: (
      <Members
        users={users}
        onAdd={handleAddUser}
        onDelete={handleDeleteUser}
      />
    ),
    tasks: (
      <AllTasks
        tasks={tasks}
        users={users}
        onViewTask={setViewTask}
        onDelete={handleDeleteTask}
      />
    ),
    reports: <Reports tasks={tasks} users={users} />,
  };

  return (
    <div className="layout">
      <Sidebar links={LINKS} active={active} onNav={setActive} />
      <div className="main">{pages[active]}</div>
      <TaskViewModal
        task={viewTask}
        open={!!viewTask}
        onClose={() => setViewTask(null)}
      />
    </div>
  );
}
