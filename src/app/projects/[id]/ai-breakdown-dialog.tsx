"use client";

import * as React from "react";
import { KanbanTask } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Clock,
  X,
  Plus,
} from "lucide-react";

interface BreakdownTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
}

interface AIBreakdownDialogProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onTasksCreated: (tasks: KanbanTask[]) => void;
}

export function AIBreakdownDialog({
  projectId,
  projectName,
  isOpen,
  onClose,
  onTasksCreated,
}: AIBreakdownDialogProps) {
  const [instructions, setInstructions] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [generatedTasks, setGeneratedTasks] = React.useState<BreakdownTask[]>([]);
  const [selectedIndices, setSelectedIndices] = React.useState<Set<number>>(new Set());
  const [error, setError] = React.useState<string | null>(null);

  // Close on Escape key
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

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          instructions: instructions.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate task breakdown");
      }

      const tasks: BreakdownTask[] = data.tasks || [];
      setGeneratedTasks(tasks);
      setSelectedIndices(new Set(tasks.map((_, i) => i)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error generating task breakdown"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSaveSelected = async () => {
    const selectedTaskEntries = generatedTasks
      .map((t, idx) => ({ t, idx }))
      .filter(({ idx }) => selectedIndices.has(idx));

    if (selectedTaskEntries.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      for (const { t, idx } of selectedTaskEntries) {
        const descriptionWithEstimate = t.estimatedHours
          ? `[Estimate: ${t.estimatedHours}h]${t.description ? `\n\n${t.description}` : ""}`
          : t.description;

        const res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.title,
            description: descriptionWithEstimate,
            priority: t.priority,
            status: "todo",
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to save task to project");
        }

        const createdTask: KanbanTask = {
          id: data.task._id?.toString() || data.task.id,
          projectId,
          title: data.task.title,
          description: data.task.description || "",
          status: data.task.status,
          priority: data.task.priority,
          order: data.task.order,
          assignee: null,
          dueDate: null,
          createdAt: data.task.createdAt || new Date().toISOString(),
        };

        // Notify parent incrementally
        onTasksCreated([createdTask]);

        // Remove saved task from selectedIndices
        setSelectedIndices((prev) => {
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      }

      setGeneratedTasks([]);
      setSelectedIndices(new Set());
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Encountered an error while saving tasks to the board"
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
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-breakdown-title"
          className="relative w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                  <Sparkles className="size-3" />
                  Gemini AI Assistant
                </span>
              </div>
              <h2 id="ai-breakdown-title" className="text-xl font-bold tracking-tight text-foreground">
                AI Task Breakdown
              </h2>
              <p className="text-xs text-muted-foreground">
                Automatically generate structured subtasks with priorities and hourly estimates for &ldquo;{projectName}&rdquo;.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 rounded-full shrink-0"
            >
              <X className="size-4" />
              <span className="sr-only">Close dialog</span>
            </Button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Prompt / Custom guidance input */}
          <form onSubmit={handleGenerate} className="space-y-3">
            <label htmlFor="ai-breakdown-guidance" className="text-xs font-medium text-foreground block">
              Additional Instructions (Optional)
            </label>
            <textarea
              id="ai-breakdown-guidance"
              aria-label="Additional instructions for AI task breakdown"
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on database schemas first, prioritize mobile responsiveness, etc."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none placeholder:text-muted-foreground"
              disabled={isGenerating || isSaving}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={isGenerating || isSaving}
                className="gap-1.5 text-xs h-9"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Generating subtasks...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    {generatedTasks.length > 0 ? "Regenerate Breakdown" : "Generate Breakdown"}
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Generated Tasks Preview List */}
          {generatedTasks.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Generated Subtasks ({selectedIndices.size} of {generatedTasks.length} selected)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIndices.size === generatedTasks.length) {
                      setSelectedIndices(new Set());
                    } else {
                      setSelectedIndices(new Set(generatedTasks.map((_, i) => i)));
                    }
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {selectedIndices.size === generatedTasks.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {generatedTasks.map((task, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      className={`cursor-pointer rounded-lg border p-3 text-xs transition-colors space-y-1.5 ${
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-card/60 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="size-3.5 rounded border-input text-primary focus:ring-primary"
                          />
                          <span className="font-semibold text-foreground text-sm">
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant={
                              task.priority === "high"
                                ? "priority-high"
                                : task.priority === "medium"
                                ? "priority-medium"
                                : "priority-low"
                            }
                            size="sm"
                          >
                            {task.priority}
                          </Badge>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                            <Clock className="size-2.5" />
                            {task.estimatedHours}h
                          </span>
                        </div>
                      </div>

                      <p className="text-muted-foreground pl-5 text-xs leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Action footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isSaving}
                  className="text-xs"
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveSelected}
                  disabled={selectedIndices.size === 0 || isSaving}
                  className="gap-1.5 text-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Adding tasks to board...
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" />
                      Add {selectedIndices.size} {selectedIndices.size === 1 ? "Task" : "Tasks"} to Board
                    </>
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
