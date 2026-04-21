import { useState, useEffect, useCallback } from 'react'
import Sidebar       from '../../components/layout/Sidebar'
import KanbanBoard   from '../../components/common/KanbanBoard'
import TaskViewModal from '../../components/common/TaskViewModal'
import StatCard      from '../../components/common/StatCard'
import Avatar        from '../../components/common/Avatar'
import MyProjects    from './MyProjects'
import api           from '../../api/axios'
import { useAuth }   from '../../context/AuthContext'
import { useToast }  from '../../context/ToastContext'
import { priorityClass, statusClass, formatDate, isOverdue } from '../../utils'
import { useStatus } from '../../hooks/useStatus'
import { use } from 'react'

const LINKS = [
  { id: 'board',      label: 'My Board',     icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm8 0a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm8 0a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z"/></svg> },
  { id: 'pending',    label: 'Pending',      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg> },
  { id: 'inprogress', label: 'In Progress',  icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg> },
  { id: 'completed',  label: 'Completed',    icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> },
  { id: 'projects',   label: 'My Projects',  icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg> },
]

/* Status update inline modal */
function StatusModal({ task, onClose, onSave }) {
  const [status, setStatus] = useState(task?.status || 'Pending')
  if (!task) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-hdr"><h3>Update Status</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>{task.title}</p>
        <div className="field">
          <label>New Status</label>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option>Pending</option><option>In Progress</option><option>Completed</option>
          </select>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(status)}>Update</button>
        </div>
      </div>
    </div>
  )
}

export default function UserDash() {
  useStatus()
  const { user }  = useAuth()
  const { toast } = useToast()
  const [active, setActive]         = useState('board')
  const [tasks,  setTasks]          = useState([])
  const [viewTask,   setViewTask]   = useState(null)
  const [statusTask, setStatusTask] = useState(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/tasks')
      setTasks(data)
    } catch { toast('Failed to load tasks', 'err') }
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatusSave = async (newStatus) => {
    try {
      const { data } = await api.put(`/tasks/${statusTask._id}`, { status: newStatus })
      setTasks(prev => prev.map(t => t._id === data._id ? data : t))
      setStatusTask(null)
      toast(`Status updated to ${newStatus}`)
    } catch { toast('Update failed', 'err') }
  }

  const handleStatusChange = useCallback(async (taskId, newStatus, originalTask) => {
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t))
    try {
      const { data } = await api.put(`/tasks/${taskId}`, { status: newStatus })
      setTasks(prev => prev.map(t => t._id === data._id ? data : t))
      toast(`Moved to ${newStatus}`)
    } catch (e) {
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

  const byStatus = (s) => tasks.filter(t => t.status === s)

  const TaskListPage = ({ status, title, sub }) => {
    const filtered = byStatus(status)
    return (
      <div className="page animate-fadeIn">
        <div className="page-hdr">
          <div><h1 className="page-title">{title}</h1><p className="page-sub">{sub}</p></div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon">{status==='Completed'?'✅':'📋'}</div><h4>No {status.toLowerCase()} tasks</h4></div>
        ) : (
          <div className="task-list">
            {filtered.map(t => {
              const overdue = isOverdue(t.dueDate, t.status)
              return (
                <div key={t._id} className="task-row" onClick={() => setViewTask(t)}>
                  <div className="task-row-main">
                    <div className="task-row-title">{t.title}</div>
                    <div className="task-row-meta">
                      <span className={`tag ${priorityClass(t.priority)}`}>{t.priority}</span>
                      <span className={`tag ${statusClass(t.status)}`}>{t.status}</span>
                      {t.dueDate && <span className={`due-label ${overdue?'due-overdue':''}`}>{overdue?'⚠ ':''}{formatDate(t.dueDate)}</span>}
                    </div>
                  </div>
                  <div className="task-row-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-xs" onClick={() => setStatusTask(t)}>Update Status</button>
                    <button className="btn btn-teal btn-xs" onClick={() => setViewTask(t)}>💬 Comment</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="layout">
      <Sidebar links={LINKS} active={active} onNav={setActive} />

      <div className="main">
        {active === 'board' && (
          <div className="page animate-fadeIn">
            <div className="page-hdr">
              <div><h1 className="page-title">My Board</h1><p className="page-sub">All tasks assigned to you</p></div>
            </div>
            <div className="stats-grid">
              <StatCard label="Assigned to Me" value={stats.total}      type="total"    />
              <StatCard label="Pending"         value={stats.pending}    type="pending"  />
              <StatCard label="In Progress"     value={stats.inProgress} type="progress" />
              <StatCard label="Completed"       value={stats.completed}  type="done"     />
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

        {active === 'pending'    && <TaskListPage status="Pending"     title="Pending Tasks"   sub="Tasks not yet started" />}
        {active === 'inprogress' && <TaskListPage status="In Progress" title="In Progress"     sub="Tasks currently being worked on" />}
        {active === 'completed'  && <TaskListPage status="Completed"   title="Completed Tasks" sub="Tasks you've finished" />}

        {/* My Projects */}
        {active === 'projects' && <MyProjects />}
      </div>

      <TaskViewModal task={viewTask} open={!!viewTask} onClose={() => setViewTask(null)} />
      <StatusModal task={statusTask} onClose={() => setStatusTask(null)} onSave={handleStatusSave} />
    </div>
  )
}