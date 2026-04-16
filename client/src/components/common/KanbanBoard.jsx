import TaskCard from './TaskCard'

const COLS = [
  { key: 'Pending',     dot: 'dot-pending',  label: 'Pending'     },
  { key: 'In Progress', dot: 'dot-progress', label: 'In Progress' },
  { key: 'Completed',   dot: 'dot-done',     label: 'Completed'   },
]

export default function KanbanBoard({ tasks, onView, onEdit, onDelete, canEdit = false }) {
  return (
    <div className="kanban">
      {COLS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key)
        return (
          <div key={col.key} className="kanban-col">
            <div className="kanban-col-hdr">
              <div className="col-title">
                <span className={`col-dot ${col.dot}`} />
                {col.label}
              </div>
              <span className="col-count">{colTasks.length}</span>
            </div>

            {colTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)', fontSize: 12 }}>
                No tasks
              </div>
            ) : (
              colTasks.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canEdit={canEdit}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}
