"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskStatus } from "@/models/Task";
import { KanbanTask } from "./types";
import { KanbanCard } from "./kanban-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  accentClass: string;
  badgeClass: string;
  tasks: KanbanTask[];
  currentUserId: string;
  onTaskClick?: (task: KanbanTask) => void;
}

const COLUMN_HEADER_TINTS: Record<TaskStatus, string> = {
  todo: "bg-slate-500/5 dark:bg-slate-500/10",
  in_progress: "bg-blue-500/5 dark:bg-blue-500/10",
  review: "bg-amber-500/5 dark:bg-amber-500/10",
  done: "bg-emerald-500/5 dark:bg-emerald-500/10",
};

const COLUMN_BADGE_VARIANTS: Record<
  TaskStatus,
  "status-todo" | "status-in-progress" | "status-review" | "status-done"
> = {
  todo: "status-todo",
  in_progress: "status-in-progress",
  review: "status-review",
  done: "status-done",
};

export function KanbanColumn({
  id,
  title,
  accentClass,
  tasks,
  currentUserId,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const taskIds = React.useMemo(() => tasks.map((t) => t.id), [tasks]);
  const headerTint = COLUMN_HEADER_TINTS[id] || "bg-muted/30";
  const badgeVariant = COLUMN_BADGE_VARIANTS[id] || "status-todo";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card shadow-xs min-h-[500px] transition-colors min-w-[280px] sm:min-w-0 snap-center border-t-2",
        accentClass,
        isOver && "ring-2 ring-primary/40 bg-accent/20"
      )}
    >
      {/* Column Header per DESIGN.md: subtle tinted header */}
      <div
        className={cn(
          "flex items-center justify-between px-3.5 py-3 border-b border-border/80 rounded-t-[calc(var(--radius)-2px)]",
          headerTint
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-xs sm:text-sm text-foreground">
            {title}
          </h3>
          <Badge variant={badgeVariant} size="sm" className="font-semibold tabular-nums">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              onClick={onTaskClick}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 px-4 text-center">
            <p className="text-xs text-muted-foreground">
              No tasks in {title.toLowerCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
