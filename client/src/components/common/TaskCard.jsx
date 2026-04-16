import Avatar from './Avatar'
import { formatDate, isOverdue, priorityClass, statusClass } from '../../utils'

export default function TaskCard({ task, onView, onEdit, onDelete, canEdit = false }) {
  const overdue = isOverdue(task.dueDate, task.status)

  return (
    <div className="task-card" onClick={() => onView(task)}>
      <div className="tc-title">{task.title}</div>
      {task.description && (
        <div className="tc-desc">{task.description}</div>
      )}
      <div className="tc-meta">
        <span className={`tag ${priorityClass(task.priority)}`}>{task.priority}</span>
        {task.assignedTo && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)' }}>
            <Avatar user={task.assignedTo} size="sm" />
            {task.assignedTo.name}
          </span>
        )}
        {task.dueDate && (
          <span className={`due-label ${overdue ? 'due-overdue' : ''}`}>
            {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {canEdit && (
        <div className="tc-actions" onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-xs" onClick={() => onEdit(task)}>Edit</button>
          <button className="btn btn-danger btn-xs" onClick={() => onDelete(task._id)}>Delete</button>
        </div>
      )}
    </div>
  )
}
