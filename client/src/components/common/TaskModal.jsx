import { useState, useEffect } from 'react'

export default function TaskModal({ open, onClose, onSave, task, users, loading }) {
  const [form, setForm] = useState({
    title: '', description: '', assignedTo: '', priority: 'Medium', status: 'Pending', dueDate: ''
  })

  useEffect(() => {
    if (task) {
      setForm({
        title:       task.title || '',
        description: task.description || '',
        assignedTo:  task.assignedTo?._id || task.assignedTo || '',
        priority:    task.priority || 'Medium',
        status:      task.status   || 'Pending',
        dueDate:     task.dueDate  ? task.dueDate.slice(0, 10) : ''
      })
    } else {
      setForm({ title: '', description: '', assignedTo: users[0]?._id || '', priority: 'Medium', status: 'Pending', dueDate: '' })
    }
  }, [task, open, users])

  if (!open) return null

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3>{task ? 'Edit Task' : 'Create Task'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-section">
          <div className="field">
            <label>Title *</label>
            <input className="input" name="title" value={form.title} onChange={handle} placeholder="e.g. Build authentication API" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="input" name="description" value={form.description} onChange={handle} placeholder="Describe the task…" />
          </div>
          <div className="field">
            <label>Assign To *</label>
            <select className="input" name="assignedTo" value={form.assignedTo} onChange={handle}>
              <option value="">— Select member —</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div className="input-row3">
            <div className="field">
              <label>Priority</label>
              <select className="input" name="priority" value={form.priority} onChange={handle}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select className="input" name="status" value={form.status} onChange={handle}>
                <option>Pending</option><option>In Progress</option><option>Completed</option>
              </select>
            </div>
            <div className="field">
              <label>Due Date</label>
              <input className="input" type="date" name="dueDate" value={form.dueDate} onChange={handle} />
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={loading || !form.title || !form.assignedTo}>
            {loading ? <span className="spinner" /> : (task ? 'Save Changes' : 'Create Task')}
          </button>
        </div>
      </div>
    </div>
  )
}
