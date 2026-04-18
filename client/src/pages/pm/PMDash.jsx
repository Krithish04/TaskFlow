import { useState, useEffect, useCallback } from 'react'
import Sidebar       from '../../components/layout/Sidebar'
import KanbanBoard   from '../../components/common/KanbanBoard'
import TaskModal     from '../../components/common/TaskModal'
import TaskViewModal from '../../components/common/TaskViewModal'
import StatCard      from '../../components/common/StatCard'
import Avatar        from '../../components/common/Avatar'
import api           from '../../api/axios'
import { useAuth }   from '../../context/AuthContext'
import { useToast }  from '../../context/ToastContext'
import { statusClass, priorityClass, formatDate, isOverdue } from '../../utils'

const LINKS = [
  { id: 'kanban',   label: 'Kanban Board', icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm8 0a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm8 0a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z"/></svg> },
  { id: 'create',   label: 'Create Task',  icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg> },
  { id: 'mytasks',  label: 'My Tasks',     icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> },
  { id: 'team',     label: 'Team',         icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg> },
]

export default function PMDash() {
  const { user }  = useAuth()
  const { toast } = useToast()
  const [active, setActive]     = useState('kanban')
  const [tasks,  setTasks]      = useState([])
  const [users,  setUsers]      = useState([])
  const [viewTask, setViewTask] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    try {
      const [t, u] = await Promise.all([api.get('/tasks'), api.get('/users/assignable')])
      setTasks(t.data); setUsers(u.data)
    } catch { toast('Failed to load', 'err') }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (form) => {
    setSaving(true)
    try {
      const { data } = await api.post('/tasks', form)
      setTasks(prev => [data, ...prev])
      setShowCreate(false)
      toast('Task created!')
      setActive('kanban')
    } catch (e) { toast(e.response?.data?.message || 'Error', 'err') }
    setSaving(false)
  }

  const handleEdit = async (form) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/tasks/${editTask._id}`, form)
      setTasks(prev => prev.map(t => t._id === data._id ? data : t))
      setEditTask(null)
      toast('Task updated')
    } catch (e) { toast(e.response?.data?.message || 'Error', 'err') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await api.delete(`/tasks/${id}`)
    setTasks(prev => prev.filter(t => t._id !== id))
    toast('Task deleted', 'err')
  }

  // Drag & drop status change — optimistic update with rollback on error
  const handleStatusChange = useCallback(async (taskId, newStatus, originalTask) => {
    // 1. Optimistically update UI immediately
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t))
    try {
      // 2. Persist to MongoDB
      const { data } = await api.put(`/tasks/${taskId}`, { status: newStatus })
      // 3. Sync with server response (keeps populated fields intact)
      setTasks(prev => prev.map(t => t._id === data._id ? data : t))
      toast(`Moved to ${newStatus}`)
    } catch (e) {
      // 4. Roll back on failure
      setTasks(prev => prev.map(t => t._id === taskId ? originalTask : t))
      toast(e.response?.data?.message || 'Failed to update status', 'err')
    }
  }, [])

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
  }

  const myTasks = tasks.filter(t => t.createdBy?._id === user?._id || t.assignedTo?._id === user?._id)

  return (
    <div className="layout">
      <Sidebar links={LINKS} active={active} onNav={id => { setActive(id); if(id==='create') setShowCreate(true) }} />

      <div className="main">
        {/* Kanban */}
        {active === 'kanban' && (
          <div className="page animate-fadeIn">
            <div className="page-hdr">
              <div><h1 className="page-title">Kanban Board</h1><p className="page-sub">Manage all tasks across the team</p></div>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Task</button>
            </div>
            <div className="stats-grid">
              <StatCard label="Total"       value={stats.total}      type="total"    />
              <StatCard label="Pending"     value={stats.pending}    type="pending"  />
              <StatCard label="In Progress" value={stats.inProgress} type="progress" />
              <StatCard label="Completed"   value={stats.completed}  type="done"     />
            </div>
            <KanbanBoard tasks={tasks} onView={setViewTask} onEdit={t => { setEditTask(t); setShowCreate(false) }} onDelete={handleDelete} onStatusChange={handleStatusChange} canEdit />
          </div>
        )}

        {/* Create task */}
        {active === 'create' && (
          <div className="page animate-fadeIn">
            <div className="page-hdr">
              <div><h1 className="page-title">Create Task</h1><p className="page-sub">Assign work to team members</p></div>
            </div>
            <div className="form-card">
              <TaskModal
                open={true} onClose={() => setActive('kanban')} onSave={handleCreate}
                task={null} users={users} loading={saving}
                inline
              />
            </div>
          </div>
        )}

        {/* My Tasks */}
        {active === 'mytasks' && (
          <div className="page animate-fadeIn">
            <div className="page-hdr">
              <div><h1 className="page-title">My Tasks</h1><p className="page-sub">Tasks you created or are assigned to you</p></div>
            </div>
            {myTasks.length === 0 ? (
              <div className="empty"><div className="empty-icon">📋</div><h4>No tasks yet</h4></div>
            ) : (
              <div className="task-list">
                {myTasks.map(t => (
                  <div key={t._id} className="task-row" onClick={() => setViewTask(t)}>
                    <div className="task-row-main">
                      <div className="task-row-title">{t.title}</div>
                      <div className="task-row-meta">
                        <span className={`tag ${priorityClass(t.priority)}`}>{t.priority}</span>
                        <span className={`tag ${statusClass(t.status)}`}>{t.status}</span>
                        {t.assignedTo && <span style={{ fontSize:11, color:'var(--text-2)', display:'flex', alignItems:'center', gap:5 }}><Avatar user={t.assignedTo} size="sm"/>{t.assignedTo.name}</span>}
                      </div>
                    </div>
                    <div className="task-row-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setEditTask(t)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => handleDelete(t._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team */}
        {active === 'team' && (
          <div className="page animate-fadeIn">
            <div className="page-hdr">
              <div><h1 className="page-title">Team</h1><p className="page-sub">Member workload overview</p></div>
            </div>
            <div className="team-grid">
              {users.map(u => {
                const ut       = tasks.filter(t => t.assignedTo?._id === u._id)
                const pending  = ut.filter(t => t.status === 'Pending').length
                const active_t = ut.filter(t => t.status === 'In Progress').length
                const done     = ut.filter(t => t.status === 'Completed').length
                return (
                  <div key={u._id} className="team-card">
                    <div className="team-card-top">
                      <Avatar user={u} size="lg" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{u.email}</div>
                        <span className={`badge badge-${u.role.toLowerCase()}`}>{u.role}</span>
                      </div>
                    </div>
                    <div className="team-stats">
                      <div className="team-stat"><div className="ts-num">{ut.length}</div><div className="ts-lbl">Total</div></div>
                      <div className="team-stat"><div className="ts-num" style={{ color:'var(--accent)' }}>{active_t}</div><div className="ts-lbl">Active</div></div>
                      <div className="team-stat"><div className="ts-num" style={{ color:'var(--teal)' }}>{done}</div><div className="ts-lbl">Done</div></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TaskModal open={showCreate && active !== 'create'} onClose={() => setShowCreate(false)} onSave={handleCreate} task={null} users={users} loading={saving} />
      <TaskModal open={!!editTask} onClose={() => setEditTask(null)} onSave={handleEdit} task={editTask} users={users} loading={saving} />
      <TaskViewModal task={viewTask} open={!!viewTask} onClose={() => setViewTask(null)} />
    </div>
  )
}
