"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanTask } from "./types";
import { Calendar, GripVertical, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  task: KanbanTask;
  currentUserId: string;
  projectKey?: string;
  isOverlay?: boolean;
  onClick?: (task: KanbanTask) => void;
}

const PRIORITY_BADGE_VARIANTS: Record<
  "low" | "medium" | "high",
  "priority-low" | "priority-medium" | "priority-high"
> = {
  low: "priority-low",
  medium: "priority-medium",
  high: "priority-high",
};

export function KanbanCard({
  task,
  currentUserId,
  projectKey,
  isOverlay,
  onClick,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priorityVariant =
    PRIORITY_BADGE_VARIANTS[task.priority] || "priority-medium";
  const priorityLabel =
    task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
  const isAssignedToCurrent = task.assignee?.id === currentUserId;

  const isOverdue =
    Boolean(
      task.dueDate &&
      new Date(task.dueDate) < new Date() &&
      task.status !== "done"
    );

  const assigneeInitials = task.assignee
    ? task.assignee.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-3 shadow-xs transition-all duration-150 hover:border-primary/40 hover:shadow-sm cursor-grab active:cursor-grabbing select-none",
        isOverlay &&
          "shadow-xl ring-2 ring-primary/40 rotate-1 cursor-grabbing bg-card z-50",
        isDragging && "opacity-30"
      )}
    >
      {/* Top Header: Task ID & Priority Badge & Drag Handle */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {projectKey && task.number !== undefined && (
            <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/80 tracking-wide">
              {projectKey}-{task.number}
            </span>
          )}
          <Badge variant={priorityVariant} size="sm" dot>
            {priorityLabel}
          </Badge>
        </div>
        <div className="flex items-center text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
          <GripVertical className="size-3.5" />
        </div>
      </div>

      {/* Task Title */}
      <h4 className="font-medium text-xs sm:text-sm text-foreground leading-snug line-clamp-2 mb-1">
        {task.title}
      </h4>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer: Assignee & Due Date */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
        {/* Assignee Avatar & Name */}
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee ? (
            <Avatar size="xs">
              <AvatarFallback className="text-[9px] font-semibold">
                {assigneeInitials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="size-5 rounded-full border border-dashed border-border flex items-center justify-center text-[9px] text-muted-foreground" />
          )}
          <span className="truncate max-w-[90px]">
            {task.assignee ? (
              <>
                {task.assignee.name.split(" ")[0]}
                {isAssignedToCurrent && (
                  <span className="ml-1 text-primary font-semibold">(You)</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground/70 italic text-[10px]">
                Unassigned
              </span>
            )}
          </span>
        </div>

        {/* Due Date per DESIGN.md: red when overdue */}
        {task.dueDate && (
          <div
            className={cn(
              "flex items-center gap-1 shrink-0 text-[11px] tabular-nums",
              isOverdue
                ? "text-rose-600 dark:text-rose-400 font-medium"
                : "text-muted-foreground"
            )}
            title={isOverdue ? "Overdue deadline" : "Due date"}
          >
            {isOverdue ? (
              <AlertCircle className="size-3" />
            ) : (
              <Calendar className="size-3" />
            )}
            <span>
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
