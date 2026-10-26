"use client";

import * as React from "react";
import type { TaskStatus, TaskPriority } from "@/models/Task";
import { KanbanTask, KanbanUser } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  Calendar,
  User as UserIcon,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

interface DraftTaskState {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string;
  dueDate: string;
}

interface AICreateTaskDialogProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  availableMembers: KanbanUser[];
  onTaskCreated: (task: KanbanTask) => void;
}

const EXAMPLE_PROMPTS = [
  "Assign login bug to Rahul, high priority, due Friday",
  "Design responsive settings page, medium priority, due next Tuesday",
  "Implement database indexing for task comments, low priority",
];

export function AICreateTaskDialog({
  projectId,
  projectName,
  isOpen,
  onClose,
  availableMembers,
  onTaskCreated,
}: AICreateTaskDialogProps) {
  const [prompt, setPrompt] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<DraftTaskState | null>(null);

  const handleClose = React.useCallback(() => {
    setPrompt("");
    setDraft(null);
    setError(null);
    onClose();
  }, [onClose]);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleGenerateDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: prompt.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate draft task");
      }

      const generatedDraft = data.draft || data.task;
      if (!generatedDraft) {
        throw new Error("No draft task was returned by AI");
      }

      setDraft({
        title: generatedDraft.title || "",
        description: generatedDraft.description || "",
        priority: (generatedDraft.priority as TaskPriority) || "medium",
        status: (generatedDraft.status as TaskStatus) || "todo",
        assigneeId: generatedDraft.assigneeId || "",
        dueDate: generatedDraft.dueDate || "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error generating draft task"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.title.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim(),
          status: draft.status,
          priority: draft.priority,
          assignee: draft.assigneeId || null,
          dueDate: draft.dueDate ? new Date(draft.dueDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      const createdTask: KanbanTask = {
        id: data.task._id?.toString() || data.task.id,
        projectId,
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
        createdBy: data.task.createdBy
          ? {
              id: data.task.createdBy._id?.toString() || data.task.createdBy.id,
              name: data.task.createdBy.name,
              email: data.task.createdBy.email,
              role: data.task.createdBy.role,
            }
          : null,
        createdAt: data.task.createdAt || new Date().toISOString(),
      };

      onTaskCreated(createdTask);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error saving task to board"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={handleClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-create-task-title"
          className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                  <Sparkles className="size-3" />
                  Gemini AI Task Generator
                </span>
              </div>
              <h2
                id="ai-create-task-title"
                className="text-xl font-bold tracking-tight text-foreground"
              >
                Create Task from Plain Language
              </h2>
              <p className="text-xs text-muted-foreground">
                Describe the task naturally, review the generated draft, and confirm before saving to &ldquo;{projectName}&rdquo;.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="size-8 p-0 rounded-full shrink-0"
            >
              <X className="size-4" />
              <span className="sr-only">Close dialog</span>
            </Button>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Prompt Input */}
          {!draft && (
            <form onSubmit={handleGenerateDraft} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-task-prompt" className="text-xs font-medium">
                  What would you like to create?
                </Label>
                <textarea
                  id="ai-task-prompt"
                  aria-label="Natural language task description"
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Assign login bug to Rahul, high priority, due Friday"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground resize-none"
                  disabled={isGenerating}
                  autoFocus
                />
              </div>

              {/* Example Prompts */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Try an example:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((example, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(example)}
                      className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                    >
                      &ldquo;{example}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isGenerating}
                  className="text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={!prompt.trim() || isGenerating}
                  className="gap-1.5 text-xs h-9"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Analyzing & Drafting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      Generate Draft
                      <ArrowRight className="size-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Confirmation & Edit Draft Form */}
          {draft && (
            <form onSubmit={handleConfirmAndSave} className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary">
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <span>
                  Draft generated by AI. Review and customize any field below before confirming.
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="draft-title" className="text-xs font-medium">
                    Task Title *
                  </Label>
                  <Input
                    id="draft-title"
                    required
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, title: e.target.value } : null
                      )
                    }
                    disabled={isSaving}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="draft-description" className="text-xs font-medium">
                    Description
                  </Label>
                  <textarea
                    id="draft-description"
                    rows={2}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, description: e.target.value } : null
                      )
                    }
                    disabled={isSaving}
                    placeholder="Details or acceptance criteria..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="draft-priority" className="text-xs font-medium">
                      Priority
                    </Label>
                    <select
                      id="draft-priority"
                      value={draft.priority}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                priority: e.target.value as TaskPriority,
                              }
                            : null
                        )
                      }
                      disabled={isSaving}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="draft-status" className="text-xs font-medium">
                      Column / Status
                    </Label>
                    <select
                      id="draft-status"
                      value={draft.status}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                status: e.target.value as TaskStatus,
                              }
                            : null
                        )
                      }
                      disabled={isSaving}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="draft-assignee" className="text-xs font-medium flex items-center gap-1">
                      <UserIcon className="size-3" />
                      Assignee
                    </Label>
                    <select
                      id="draft-assignee"
                      value={draft.assigneeId}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, assigneeId: e.target.value } : null
                        )
                      }
                      disabled={isSaving}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Unassigned</option>
                      {availableMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="draft-due-date" className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="size-3" />
                      Due Date
                    </Label>
                    <Input
                      id="draft-due-date"
                      type="date"
                      value={draft.dueDate}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, dueDate: e.target.value } : null
                        )
                      }
                      disabled={isSaving}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft(null)}
                  disabled={isSaving}
                  className="gap-1.5 text-xs"
                >
                  <ArrowLeft className="size-3.5" />
                  Edit Prompt
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    disabled={isSaving}
                    className="text-xs"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={!draft.title.trim() || isSaving}
                    className="gap-1.5 text-xs h-9"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Saving to Board...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" />
                        Confirm & Save Task
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
