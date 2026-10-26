"use client";

import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  closestCorners,
} from "@dnd-kit/core";
import type { TaskStatus, TaskPriority } from "@/models/Task";
import { KanbanProject, KanbanTask, KanbanUser, COLUMNS } from "./types";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { TaskDrawer } from "./task-drawer";
import { AIBreakdownDialog } from "./ai-breakdown-dialog";
import { AICreateTaskDialog } from "./ai-create-task-dialog";
import { AIAssistantPanel } from "./ai-assistant-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Bot,
} from "lucide-react";

interface KanbanBoardProps {
  project: KanbanProject;
  initialTasks: KanbanTask[];
  currentUserId: string;
  currentUserRole: string;
  availableMembers: KanbanUser[];
}

export function KanbanBoard({
  project,
  initialTasks,
  currentUserId,
  currentUserRole,
  availableMembers,
}: KanbanBoardProps) {
  const [tasks, setTasks] = React.useState<KanbanTask[]>(initialTasks);
  const [activeTask, setActiveTask] = React.useState<KanbanTask | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<KanbanTask | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [isCreatingTask, setIsCreatingTask] = React.useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = React.useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = React.useState(false);
  const [isAICreateOpen, setIsAICreateOpen] = React.useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleAITasksCreated = (newTasks: KanbanTask[]) => {
    setTasks((prev) => [...prev, ...newTasks]);
  };

  const handleAITaskCreated = (newTask: KanbanTask) => {
    setTasks((prev) => [...prev, newTask]);
  };

  const handleSelectTask = (task: KanbanTask) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleTaskUpdated = (updated: KanbanTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  };

  const handleTaskDeleted = (deletedId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
    setIsDrawerOpen(false);
    setSelectedTask(null);
  };

  // New task form state
  const [newTaskData, setNewTaskData] = React.useState<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
  }>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigneeId: "",
    dueDate: "",
  });

  const isOwnerOrAdmin =
    currentUserRole === "admin" || project.owner.id === currentUserId;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !t.assignee) ||
        (assigneeFilter === "mine" && t.assignee?.id === currentUserId) ||
        t.assignee?.id === assigneeFilter;

      const matchesPriority =
        priorityFilter === "all" || t.priority === priorityFilter;

      return matchesSearch && matchesAssignee && matchesPriority;
    });
  }, [tasks, searchQuery, assigneeFilter, priorityFilter, currentUserId]);

  // Tasks grouped by column status
  const columnsTasks = React.useMemo(() => {
    const map: Record<TaskStatus, KanbanTask[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    filteredTasks.forEach((t) => {
      if (map[t.status]) {
        map[t.status].push(t);
      }
    });

    // Ensure order is respected
    Object.keys(map).forEach((key) => {
      map[key as TaskStatus].sort((a, b) => a.order - b.order);
    });

    return map;
  }, [filteredTasks]);

  // Snapshot for drag rollback
  const previousTasksRef = React.useRef<KanbanTask[]>(tasks);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      previousTasksRef.current = tasks;
      setActiveTask(task);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTaskObj = tasks.find((t) => t.id === activeId);
    if (!activeTaskObj) return;

    // Check if dragging over a column container
    const isOverColumn = COLUMNS.some((col) => col.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    const targetStatus: TaskStatus = isOverColumn
      ? (overId as TaskStatus)
      : overTask
      ? overTask.status
      : activeTaskObj.status;

    if (activeTaskObj.status !== targetStatus) {
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const newTasks = [...prev];
        newTasks[activeIndex] = {
          ...activeTaskObj,
          status: targetStatus,
        };
        return newTasks;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskObj = tasks.find((t) => t.id === activeId);
    if (!activeTaskObj) return;

    const isOverColumn = COLUMNS.some((col) => col.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    const targetStatus: TaskStatus = isOverColumn
      ? (overId as TaskStatus)
      : overTask
      ? overTask.status
      : activeTaskObj.status;

    // Determine target column tasks and new order index
    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== activeId)
      .sort((a, b) => a.order - b.order);

    let targetIndex = columnTasks.length;
    if (!isOverColumn && overTask) {
      const idx = columnTasks.findIndex((t) => t.id === overId);
      targetIndex = idx !== -1 ? idx : columnTasks.length;
    }

    const updatedTask = {
      ...activeTaskObj,
      status: targetStatus,
      order: targetIndex,
    };

    // Optimistically reorder tasks in state
    setTasks((prev) => {
      const withoutActive = prev.filter((t) => t.id !== activeId);
      const targetCol = withoutActive
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.order - b.order);

      targetCol.splice(targetIndex, 0, updatedTask);

      // Re-assign order numbers for column
      const reorderedCol = targetCol.map((t, idx) => ({ ...t, order: idx }));

      const others = withoutActive.filter((t) => t.status !== targetStatus);
      return [...others, ...reorderedCol];
    });

    // Persist via POST /api/tasks/[id]/move
    try {
      const res = await fetch(`/api/tasks/${activeId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          order: targetIndex,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to move task");
      }
    } catch (err) {
      // Rollback to previous snapshot
      setTasks(previousTasksRef.current);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "You do not have permission to move this task"
      );
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title.trim()) return;

    setIsSubmittingTask(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskData.title.trim(),
          description: newTaskData.description.trim(),
          status: newTaskData.status,
          priority: newTaskData.priority,
          assignee: newTaskData.assigneeId || null,
          dueDate: newTaskData.dueDate ? new Date(newTaskData.dueDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      const created: KanbanTask = {
        id: data.task._id?.toString() || data.task.id,
        projectId: project.id,
        title: data.task.title,
        description: data.task.description || "",
        status: data.task.status,
        priority: data.task.priority,
        order: data.task.order,
        assignee: data.task.assignee
          ? {
              id: data.task.assignee._id?.toString() || data.task.assignee.id,
              name: data.task.assignee.name,
              email: data.task.assignee.email,
              role: data.task.assignee.role,
            }
          : null,
        dueDate: data.task.dueDate,
        createdAt: data.task.createdAt || new Date().toISOString(),
      };

      setTasks((prev) => [...prev, created]);
      setIsCreatingTask(false);
      setNewTaskData({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assigneeId: "",
        dueDate: "",
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error creating task"
      );
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Project Navigation & Meta */}
      <div className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${
                project.status === "active"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : project.status === "completed"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {project.status}
            </span>
            <span className="text-xs text-muted-foreground">
              Lead: {project.owner.name}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              onClick={() => setIsAssistantOpen(true)}
              className="gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/5 text-xs h-9"
              id="ai-assistant-button"
            >
              <Bot className="size-3.5 text-primary" />
              AI Assistant
            </Button>
            {isOwnerOrAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsAICreateOpen(true)}
                  className="gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/5 text-xs h-9"
                >
                  <Sparkles className="size-3.5 text-primary" />
                  AI Task
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsBreakdownOpen(true)}
                  className="gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/5 text-xs h-9"
                >
                  <Sparkles className="size-3.5 text-primary" />
                  AI Breakdown
                </Button>
                <Button
                  onClick={() => setIsCreatingTask(true)}
                  className="gap-1.5 font-medium text-xs h-9"
                >
                  <Plus className="size-3.5" />
                  Add Task
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Task Creation Modal / Form */}
      {isCreatingTask && (
        <Card className="border-primary/40 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Create New Task</CardTitle>
              <CardDescription className="text-xs">
                Add a task card to this project board.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreatingTask(false);
                  setIsAICreateOpen(true);
                }}
                className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Sparkles className="size-3 text-primary" />
                Use AI Draft
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingTask(false)}
                className="size-8 p-0"
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <form onSubmit={handleCreateTask}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  required
                  placeholder="e.g. Implement user login session"
                  value={newTaskData.title}
                  onChange={(e) =>
                    setNewTaskData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={isSubmittingTask}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="taskDescription">Description</Label>
                <textarea
                  id="taskDescription"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Details, acceptance criteria..."
                  value={newTaskData.description}
                  onChange={(e) =>
                    setNewTaskData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  disabled={isSubmittingTask}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="taskStatus">Column</Label>
                  <select
                    id="taskStatus"
                    value={newTaskData.status}
                    onChange={(e) =>
                      setNewTaskData((prev) => ({
                        ...prev,
                        status: e.target.value as TaskStatus,
                      }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    disabled={isSubmittingTask}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="taskPriority">Priority</Label>
                  <select
                    id="taskPriority"
                    value={newTaskData.priority}
                    onChange={(e) =>
                      setNewTaskData((prev) => ({
                        ...prev,
                        priority: e.target.value as TaskPriority,
                      }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    disabled={isSubmittingTask}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="taskAssignee">Assignee</Label>
                  <select
                    id="taskAssignee"
                    value={newTaskData.assigneeId}
                    onChange={(e) =>
                      setNewTaskData((prev) => ({
                        ...prev,
                        assigneeId: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    disabled={isSubmittingTask}
                  >
                    <option value="">Unassigned</option>
                    {availableMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="taskDueDate">Due Date</Label>
                <Input
                  id="taskDueDate"
                  type="date"
                  value={newTaskData.dueDate}
                  onChange={(e) =>
                    setNewTaskData((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                  disabled={isSubmittingTask}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreatingTask(false)}
                  disabled={isSubmittingTask}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingTask}>
                  {isSubmittingTask ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Task"
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="size-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Assignees</option>
            <option value="mine">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
            {availableMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <span className="text-xs text-muted-foreground ml-2">
            {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      {/* 4-Column Drag and Drop Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex overflow-x-auto pb-4 gap-4 items-start lg:grid lg:grid-cols-4 lg:overflow-visible snap-x snap-mandatory">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              accentClass={col.accentClass}
              badgeClass={col.badgeClass}
              tasks={columnsTasks[col.id] || []}
              currentUserId={currentUserId}
              projectKey={project.key}
              onTaskClick={handleSelectTask}
            />
          ))}
        </div>

        {/* Drag Overlay for smooth preview */}
        <DragOverlay>
          {activeTask ? (
            <KanbanCard
              task={activeTask}
              currentUserId={currentUserId}
              projectKey={project.key}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Drawer for details view and editing */}
      <TaskDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        isOwnerOrAdmin={isOwnerOrAdmin}
        availableMembers={availableMembers}
        projectKey={project.key}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />

      {/* AI Task Breakdown Dialog */}
      <AIBreakdownDialog
        projectId={project.id}
        projectName={project.name}
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        onTasksCreated={handleAITasksCreated}
      />

      {/* AI Create Task from Plain Language Dialog */}
      <AICreateTaskDialog
        projectId={project.id}
        projectName={project.name}
        isOpen={isAICreateOpen}
        onClose={() => setIsAICreateOpen(false)}
        availableMembers={availableMembers}
        onTaskCreated={handleAITaskCreated}
      />

      {/* AI Assistant Chat Panel */}
      <AIAssistantPanel
        projectId={project.id}
        projectName={project.name}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
}
