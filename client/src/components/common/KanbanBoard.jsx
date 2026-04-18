import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Avatar from './Avatar'
import { formatDate, isOverdue, priorityClass } from '../../utils'

/* ── Column config ──────────────────────────────────── */
const COLS = [
  { key: 'Pending',     dot: 'dot-pending',  label: 'Pending'     },
  { key: 'In Progress', dot: 'dot-progress', label: 'In Progress' },
  { key: 'Completed',   dot: 'dot-done',     label: 'Completed'   },
]

/* ── Drag handle dots icon ──────────────────────────── */
function DragHandle() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"
      style={{ color: 'var(--text-3)', flexShrink: 0, cursor: 'grab' }} aria-hidden>
      <circle cx="5"  cy="4"  r="1.2"/><circle cx="11" cy="4"  r="1.2"/>
      <circle cx="5"  cy="8"  r="1.2"/><circle cx="11" cy="8"  r="1.2"/>
      <circle cx="5"  cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
    </svg>
  )
}

/* ── Pure card content (reused by overlay + sortable) ── */
function CardContent({ task, canEdit, onView, onEdit, onDelete, isDragging = false }) {
  const overdue = isOverdue(task.dueDate, task.status)

  return (
    <div
      className="task-card"
      onClick={() => !isDragging && onView(task)}
      style={{
        opacity:      isDragging ? 0.9 : 1,
        boxShadow:    isDragging ? '0 16px 48px rgba(0,0,0,0.6)' : undefined,
        border:       isDragging ? '1px solid rgba(124,109,250,0.7)' : undefined,
        cursor:       isDragging ? 'grabbing' : 'pointer',
        marginBottom: 0,
        userSelect:   'none',
        transform:    isDragging ? 'rotate(1.5deg)' : undefined,
        transition:   isDragging ? 'none' : undefined,
      }}
    >
      {/* Title row with drag handle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
        <DragHandle />
        <div className="tc-title" style={{ flex: 1 }}>{task.title}</div>
      </div>

      {task.description && (
        <div className="tc-desc" style={{ paddingLeft: 22 }}>{task.description}</div>
      )}

      <div className="tc-meta" style={{ paddingLeft: 22 }}>
        <span className={`tag ${priorityClass(task.priority)}`}>{task.priority}</span>
        {task.assignedTo && (
          <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-2)' }}>
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

      {canEdit && !isDragging && (
        <div className="tc-actions" style={{ paddingLeft: 22 }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-xs" onClick={() => onEdit(task)}>Edit</button>
          <button className="btn btn-danger btn-xs" onClick={() => onDelete(task._id)}>Delete</button>
        </div>
      )}
    </div>
  )
}

/* ── Sortable card wrapper ──────────────────────────── */
function SortableCard({ task, canEdit, onView, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id, data: { task, type: 'card' } })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:    CSS.Transform.toString(transform),
        transition,
        marginBottom: 10,
        opacity:      isDragging ? 0.3 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <CardContent
        task={task} canEdit={canEdit}
        onView={onView} onEdit={onEdit} onDelete={onDelete}
      />
    </div>
  )
}

/* ── Droppable column ───────────────────────────────── */
function DroppableColumn({ col, tasks, isOver, canEdit, onView, onEdit, onDelete }) {
  const { setNodeRef } = useDroppable({ id: col.key })

  return (
    <div
      ref={setNodeRef}
      className="kanban-col"
      style={{
        background:  isOver ? 'rgba(124,109,250,0.07)' : undefined,
        borderColor: isOver ? 'rgba(124,109,250,0.45)'  : undefined,
        transition:  'background 0.15s, border-color 0.15s',
        minHeight:   300,
      }}
    >
      {/* Header */}
      <div className="kanban-col-hdr">
        <div className="col-title">
          <span className={`col-dot ${col.dot}`} />
          {col.label}
        </div>
        <span className="col-count">{tasks.length}</span>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <div style={{
          border:       isOver ? '2px dashed rgba(124,109,250,0.5)' : '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          padding:      '24px 12px',
          textAlign:    'center',
          color:        isOver ? 'var(--accent)' : 'var(--text-3)',
          fontSize:     12,
          fontWeight:   600,
          transition:   'all 0.15s',
          marginBottom: 8,
        }}>
          {isOver ? '✦ Drop here' : 'No tasks — drag one here'}
        </div>
      )}

      {/* Sortable cards */}
      <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
        {tasks.map(task => (
          <SortableCard
            key={task._id} task={task} canEdit={canEdit}
            onView={onView} onEdit={onEdit} onDelete={onDelete}
          />
        ))}
      </SortableContext>

      {/* Drop hint at bottom when column has cards */}
      {isOver && tasks.length > 0 && (
        <div style={{
          height: 4, borderRadius: 4,
          background: 'var(--accent)',
          marginTop: 4,
          opacity: 0.6,
          transition: 'opacity 0.15s',
        }} />
      )}
    </div>
  )
}

/* ── Main export ────────────────────────────────────── */
export default function KanbanBoard({
  tasks,
  onView,
  onEdit,
  onDelete,
  onStatusChange,   // (taskId, newStatus, task) => void  — NEW required prop
  canEdit = false,
}) {
  const [activeTask, setActiveTask] = useState(null)
  const [overColumn, setOverColumn] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const tasksByCol = useCallback((key) => tasks.filter(t => t.status === key), [tasks])

  /* Resolve which column an over.id belongs to */
  const resolveColumn = (overId) => {
    const colKeys = COLS.map(c => c.key)
    if (colKeys.includes(overId)) return overId
    const hovered = tasks.find(t => t._id === overId)
    return hovered ? hovered.status : null
  }

  const handleDragStart = ({ active }) => {
    setActiveTask(tasks.find(t => t._id === active.id) || null)
  }

  const handleDragOver = ({ over }) => {
    setOverColumn(over ? resolveColumn(over.id) : null)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null)
    setOverColumn(null)
    if (!over || !activeTask) return

    const targetStatus = resolveColumn(over.id)
    if (!targetStatus || targetStatus === activeTask.status) return

    // Delegate optimistic update + API call to parent
    onStatusChange(activeTask._id, targetStatus, activeTask)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban">
        {COLS.map(col => (
          <DroppableColumn
            key={col.key}
            col={col}
            tasks={tasksByCol(col.key)}
            isOver={overColumn === col.key}
            canEdit={canEdit}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Floating ghost card while dragging */}
      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
        {activeTask && (
          <CardContent
            task={activeTask} canEdit={false}
            onView={() => {}} onEdit={() => {}} onDelete={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
