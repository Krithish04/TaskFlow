"use client";

import * as React from "react";
import type { TaskStatus, TaskPriority } from "@/models/Task";
import { KanbanTask, KanbanUser } from "./types";
import { TaskComments } from "./task-comments";
import { TaskAttachments } from "./task-attachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Calendar,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit3,
} from "lucide-react";

interface TaskDrawerProps {
  task: KanbanTask | null;
  isOpen: boolean;
  onClose: () => void;
  isOwnerOrAdmin: boolean;
  availableMembers: KanbanUser[];
  projectKey?: string;
  onTaskUpdated: (updatedTask: KanbanTask) => void;
  onTaskDeleted: (taskId: string) => void;
}

const PRIORITY_BADGES = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export function TaskDrawer(props: TaskDrawerProps) {
  const { isOpen, onClose, task } = props;

  // Handle Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  return <TaskDrawerContent key={task.id} {...props} task={task} />;
}

function TaskDrawerContent({
  task,
  onClose,
  isOwnerOrAdmin,
  availableMembers,
  projectKey,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDrawerProps & { task: KanbanTask }) {
  const [formData, setFormData] = React.useState<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
  }>({
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    assigneeId: task.assignee?.id || "",
    dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          status: formData.status,
          priority: formData.priority,
          assignee: formData.assigneeId || null,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");

      const updated: KanbanTask = {
        ...task,
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
      };

      onTaskUpdated(updated);
      setStatusMessage({
        type: "success",
        text: "Task details updated successfully.",
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving task",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;

    setIsDeleting(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete task");

      onTaskDeleted(task.id);
      onClose();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error deleting task",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-background border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-2 flex-wrap">
              {projectKey && task.number !== undefined && (
                <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded border border-border tracking-wider">
                  {projectKey}-{task.number}
                </span>
              )}
              <Badge
                variant={
                  task.priority === "high"
                    ? "priority-high"
                    : task.priority === "medium"
                    ? "priority-medium"
                    : "priority-low"
                }
                size="sm"
                dot
              >
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </Badge>
              <Badge variant="outline" size="sm">
                Column: {STATUS_LABELS[task.status]}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 rounded-full"
            >
              <X className="size-4" />
              <span className="sr-only">Close drawer</span>
            </Button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {statusMessage && (
              <div
                role="alert"
                className={`flex items-center gap-2 rounded-lg p-3 text-sm border ${
                  statusMessage.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {isOwnerOrAdmin ? (
              /* Editable Form for Admin / PM */
              <form id="task-edit-form" onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Edit3 className="size-3.5" />
                  <span>Edit Task Details (Manager Mode)</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="drawerTaskTitle">Title *</Label>
                  <Input
                    id="drawerTaskTitle"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="drawerTaskDesc">Description</Label>
                  <textarea
                    id="drawerTaskDesc"
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Task details and instructions..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="drawerTaskStatus">Status</Label>
                    <select
                      id="drawerTaskStatus"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as TaskStatus,
                        }))
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      disabled={isSaving}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="drawerTaskPriority">Priority</Label>
                    <select
                      id="drawerTaskPriority"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          priority: e.target.value as TaskPriority,
                        }))
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      disabled={isSaving}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="drawerTaskAssignee">Assignee</Label>
                  <select
                    id="drawerTaskAssignee"
                    value={formData.assigneeId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        assigneeId: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    disabled={isSaving}
                  >
                    <option value="">Unassigned</option>
                    {availableMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="drawerTaskDueDate">Due Date</Label>
                  <Input
                    id="drawerTaskDueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>
              </form>
            ) : (
              /* Read-only View for Regular Users */
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {task.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        PRIORITY_BADGES[task.priority]
                      }`}
                    >
                      {task.priority} Priority
                    </span>
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border">
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Description
                  </h3>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap">
                    {task.description || (
                      <span className="italic text-muted-foreground">
                        No description provided for this task.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <span className="text-xs text-muted-foreground block mb-1">
                      Assignee
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                        {task.assignee ? task.assignee.name[0] : "?"}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">
                        {task.assignee ? task.assignee.name : "Unassigned"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-3">
                    <span className="text-xs text-muted-foreground block mb-1">
                      Due Date
                    </span>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span>
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : "None"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Footer Card */}
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Created By</span>
                <span className="font-medium text-foreground">
                  {task.createdBy ? task.createdBy.name : "System"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Created Date</span>
                <span>{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Task Files / Attachments */}
            <TaskAttachments
              taskId={task.id}
              projectId={task.projectId}
              canEdit={true}
            />

            {/* Comment Thread with 5s Polling */}
            <TaskComments taskId={task.id} />
          </div>

          {/* Footer Controls */}
          {isOwnerOrAdmin && (
            <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
                className="gap-1.5 text-xs"
              >
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Delete Task
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="task-edit-form"
                  size="sm"
                  disabled={isSaving || isDeleting}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
