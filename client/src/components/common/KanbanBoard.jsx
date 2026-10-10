import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Avatar from './Avatar';
import Badge from './Badge';
import { formatDate, isOverdue, priorityClass } from '../../utils';
import { Plus, GripVertical, AlertCircle, Calendar } from 'lucide-react';

/* ── Column config ──────────────────────────────────── */
const COLS = [
  { key: 'Pending', label: 'To Do', color: 'var(--column-todo)', dot: 'dot-pending' },
  { key: 'In Progress', label: 'In Progress', color: 'var(--column-progress)', dot: 'dot-progress' },
  { key: 'In Review', label: 'In Review', color: 'var(--column-review)', dot: 'dot-review' },
  { key: 'Completed', label: 'Completed', color: 'var(--column-done)', dot: 'dot-done' },
];

/* ── Pure card content ── */
function CardContent({ task, canEdit, onView, onEdit, onDelete, isDragging = false }) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div
      className={`task-card-modern ${isDragging ? 'is-dragging' : ''}`}
      onClick={() => !isDragging && onView(task)}
    >
      <div className="card-top-row">
        <GripVertical className="drag-handle-icon" size={14} />
        <span className={`tf-badge tf-badge-sm priority-${task.priority?.toLowerCase()}`}>
          {task.priority}
        </span>
      </div>

      <h4 className="card-title-text">{task.title}</h4>

      {task.description && (
        <p className="card-desc-text">{task.description}</p>
      )}

      <div className="card-footer-row">
        {task.assignedTo ? (
          <div className="card-assignee" title={`Assigned to ${task.assignedTo.name}`}>
            <Avatar user={task.assignedTo} name={task.assignedTo.name} color={task.assignedTo.color || '#6366f1'} size={22} />
            <span className="assignee-name">{task.assignedTo.name}</span>
          </div>
        ) : (
          <span className="unassigned-tag">Unassigned</span>
        )}

        {task.dueDate && (
          <div className={`card-due-badge ${overdue ? 'overdue' : ''}`}>
            {overdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>

      {canEdit && !isDragging && (
        <div className="card-hover-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn-action" onClick={() => onEdit(task)}>Edit</button>
          <button className="btn-action text-danger" onClick={() => onDelete(task._id)}>Delete</button>
        </div>
      )}
    </div>
  );
}

/* ── Sortable card wrapper ── */
function SortableCard({ task, canEdit, onView, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id, data: { task, type: 'card' } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <CardContent
        task={task}
        canEdit={canEdit}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

/* ── Droppable column ── */
function DroppableColumn({ col, tasks, isOver, canEdit, onView, onEdit, onDelete, onQuickAdd }) {
  const { setNodeRef } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column-modern ${isOver ? 'is-over' : ''}`}
    >
      <div className="column-header">
        <div className="column-title-group">
          <span className="column-color-indicator" style={{ background: col.color }} />
          <h3 className="column-title">{col.label}</h3>
          <span className="column-badge-count">{tasks.length}</span>
        </div>
        {canEdit && onQuickAdd && (
          <button
            className="btn-icon btn-sm"
            onClick={() => onQuickAdd(col.key)}
            title={`Add task to ${col.label}`}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="column-card-list">
        {tasks.length === 0 && (
          <div className="column-empty-dropzone">
            {isOver ? '✦ Drop task here' : 'No tasks in this column'}
          </div>
        )}

        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableCard
              key={task._id}
              task={task}
              canEdit={canEdit}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

/* ── Main Export ── */
export default function KanbanBoard({
  tasks,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onQuickAdd,
  canEdit = false,
}) {
  const [activeTask, setActiveTask] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasksByCol = useCallback((key) => tasks.filter((t) => t.status === key), [tasks]);

  const resolveColumn = (overId) => {
    const colKeys = COLS.map((c) => c.key);
    if (colKeys.includes(overId)) return overId;
    const hovered = tasks.find((t) => t._id === overId);
    return hovered ? hovered.status : null;
  };

  const handleDragStart = ({ active }) => {
    setActiveTask(tasks.find((t) => t._id === active.id) || null);
  };

  const handleDragOver = ({ over }) => {
    setOverColumn(over ? resolveColumn(over.id) : null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null);
    setOverColumn(null);
    if (!over || !activeTask) return;

    const targetStatus = resolveColumn(over.id);
    if (!targetStatus || targetStatus === activeTask.status) return;

    onStatusChange(activeTask._id, targetStatus, activeTask);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board-wrapper">
        {COLS.map((col) => (
          <DroppableColumn
            key={col.key}
            col={col}
            tasks={tasksByCol(col.key)}
            isOver={overColumn === col.key}
            canEdit={canEdit}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.2,0,0,1)' }}>
        {activeTask && (
          <CardContent
            task={activeTask}
            canEdit={false}
            onView={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
