import React, { useState, useCallback } from 'react';
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
import AvatarStack from './AvatarStack';
import Badge from './Badge';
import Tabs from './Tabs';
import Button from './Button';
import { formatDate, isOverdue } from '../../utils';
import {
  Plus,
  Sparkles,
  ChevronRight,
  Calendar,
  AlertCircle,
  Filter,
} from 'lucide-react';

/* ── Status Column Configuration ── */
const COLS = [
  { key: 'Pending', label: 'To Do', color: '#94A3B8' },
  { key: 'In Progress', label: 'In Progress', color: '#3B82F6' },
  { key: 'In Review', label: 'In Review', color: '#F59E0B' },
  { key: 'Completed', label: 'Completed', color: '#10B981' },
];

/* ── Pure Card Component ── */
function CardContent({ task, canEdit, onView, onEdit, onDelete, isDragging = false }) {
  const overdue = isOverdue(task.dueDate, task.status);
  const isDone = task.status === 'Completed';

  // Sample label fallback based on task title/category
  const labelText = task.label || (
    task.title.toLowerCase().includes('api') || task.title.toLowerCase().includes('backend') ? 'Backend' :
    task.title.toLowerCase().includes('ui') || task.title.toLowerCase().includes('page') || task.title.toLowerCase().includes('drag') ? 'Frontend' :
    task.title.toLowerCase().includes('test') ? 'QA' :
    task.title.toLowerCase().includes('docker') ? 'DevOps' : 'Design'
  );

  return (
    <div
      className={`task-card-modern ${isDragging ? 'is-dragging' : ''}`}
      onClick={() => !isDragging && onView(task)}
      style={{
        transform: isDragging ? 'rotate(2.5deg)' : undefined,
        boxShadow: isDragging ? '0 18px 40px rgba(79, 70, 229, 0.25)' : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <Badge variant={task.priority?.toLowerCase() || 'medium'}>
          {task.priority || 'Medium'}
        </Badge>
        <span className="text-xs text-muted font-medium">{labelText}</span>
      </div>

      <h4 className="card-title-text font-semibold text-sm">{task.title}</h4>

      <div className="card-footer-row flex items-center justify-between text-xs text-muted mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className={`flex items-center gap-1 ${overdue ? 'text-danger font-semibold' : isDone ? 'text-success' : 'text-muted'}`}>
          {overdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
          <span>
            {isDone ? `Done ${formatDate(task.dueDate)}` : formatDate(task.dueDate)}
          </span>
          <span className="mx-1">•</span>
          <span>{task.subtasksCount || '3/5'} subtasks</span>
        </div>

        {task.assignedTo ? (
          <Avatar user={task.assignedTo} name={task.assignedTo.name} color={task.assignedTo.color} size={22} />
        ) : (
          <span className="text-xs text-muted italic">Unassigned</span>
        )}
      </div>

      {canEdit && !isDragging && (
        <div className="card-hover-actions flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn-action text-xs text-muted" onClick={() => onEdit(task)}>Edit</button>
          <button type="button" className="btn-action text-xs text-danger" onClick={() => onDelete(task._id)}>Delete</button>
        </div>
      )}
    </div>
  );
}

/* ── Sortable Wrapper ── */
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

/* ── Droppable Column ── */
function DroppableColumn({ col, tasks, isOver, canEdit, onView, onEdit, onDelete, onQuickAdd }) {
  const { setNodeRef } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column-modern ${isOver ? 'is-over' : ''}`}
      style={{
        border: isOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
      }}
    >
      <div className="column-header flex items-center justify-between mb-3">
        <div className="column-title-group flex items-center gap-2">
          <span className="column-color-indicator" style={{ backgroundColor: col.color }} />
          <h3 className="column-title font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{col.label}</h3>
          <span className="column-badge-count text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {tasks.length}
          </span>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn-icon btn-sm"
            style={{ width: 28, height: 28 }}
            onClick={() => onQuickAdd && onQuickAdd(col.key)}
            title={`Add task to ${col.label}`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      <div className="column-card-list flex flex-col gap-3 flex-1">
        {tasks.length === 0 && (
          <div className="column-empty-dropzone py-8 text-center border-2 border-dashed rounded-xl text-xs text-muted">
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

      {canEdit && (
        <button
          type="button"
          className="column-quick-add-btn w-full py-2 px-3 mt-3 border border-dashed rounded-xl text-xs text-muted font-medium hover:border-accent hover:text-accent flex items-center justify-center gap-1.5 transition-colors"
          onClick={() => onQuickAdd && onQuickAdd(col.key)}
        >
          <Plus size={14} /> Add task
        </button>
      )}
    </div>
  );
}

/* ── Main Kanban Board Component ── */
export default function KanbanBoard({
  tasks = [],
  users = [],
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onQuickAdd,
  canEdit = false,
}) {
  const [activeTask, setActiveTask] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [viewTab, setViewTab] = useState('board');

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

  const viewTabs = [
    { id: 'board', label: 'Board' },
    { id: 'list', label: 'List', disabled: true, badge: 'Soon' },
    { id: 'calendar', label: 'Calendar', disabled: true, badge: 'Soon' },
    { id: 'timeline', label: 'Timeline', disabled: true, badge: 'Soon' },
  ];

  return (
    <div className="kanban-page-section flex flex-col gap-5">
      {/* ── BREADCRUMB & HEADER ROW ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
            <span>Projects</span>
            <ChevronRight size={12} />
            <span>Mobile app v2</span>
          </div>
          <h1 className="title-text font-bold text-2xl" style={{ letterSpacing: '-0.02em' }}>
            Sprint 14 board
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <AvatarStack users={users.length > 0 ? users : [
            { name: 'Arjun Rao', color: '#6366F1' },
            { name: 'Sara Khan', color: '#10B981' },
            { name: 'Dev Nair', color: '#F59E0B' },
          ]} max={3} size="sm" />

          {canEdit && (
            <Button icon={Plus} size="sm" onClick={() => onQuickAdd && onQuickAdd('Pending')}>
              Add task
            </Button>
          )}
        </div>
      </div>

      {/* ── TOOLBAR (Segmented Tabs | Filters | AI Breakdown CTA) ── */}
      <div className="kanban-toolbar flex items-center justify-between flex-wrap gap-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <Tabs tabs={viewTabs} activeTab={viewTab} onChange={setViewTab} />

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" icon={Filter}>
            Assignee
          </Button>
          <Button variant="secondary" size="sm">
            Priority
          </Button>
          <Button variant="secondary" size="sm">
            Labels
          </Button>

          <Button variant="secondary" size="sm" icon={Sparkles} style={{ color: 'var(--accent-text)' }}>
            Break down with AI
          </Button>
        </div>
      </div>

      {/* ── @dnd-kit KANBAN BOARD ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board-wrapper grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
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

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2,0,0,1)' }}>
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
    </div>
  );
}
