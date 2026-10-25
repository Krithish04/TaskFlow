"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanTask } from "./types";
import { Calendar, User as UserIcon, GripVertical } from "lucide-react";

interface KanbanCardProps {
  task: KanbanTask;
  currentUserId: string;
  isOverlay?: boolean;
}

const PRIORITY_CONFIG = {
  high: {
    label: "High",
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  medium: {
    label: "Medium",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  low: {
    label: "Low",
    badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
};

export function KanbanCard({ task, currentUserId, isOverlay }: KanbanCardProps) {
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

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isAssignedToCurrent = task.assignee?.id === currentUserId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative rounded-lg border border-border bg-card p-3.5 shadow-xs transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing select-none ${
        isOverlay ? "shadow-xl ring-2 ring-primary/40 rotate-1 cursor-grabbing bg-card" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${priority.badgeClass}`}
        >
          {priority.label}
        </span>
        <div className="flex items-center text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
          <GripVertical className="size-3.5" />
        </div>
      </div>

      <h4 className="font-medium text-sm text-foreground leading-snug line-clamp-2 mb-1.5">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-[10px]">
            {task.assignee ? (
              task.assignee.name.slice(0, 1).toUpperCase()
            ) : (
              <UserIcon className="size-3 text-muted-foreground" />
            )}
          </div>
          <span className="truncate max-w-[100px]">
            {task.assignee ? (
              <>
                {task.assignee.name.split(" ")[0]}
                {isAssignedToCurrent && (
                  <span className="ml-1 text-primary font-semibold">(You)</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground/70 italic">Unassigned</span>
            )}
          </span>
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div className="flex items-center gap-1 text-muted-foreground shrink-0">
            <Calendar className="size-3" />
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
