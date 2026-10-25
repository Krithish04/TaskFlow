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

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  accentClass: string;
  badgeClass: string;
  tasks: KanbanTask[];
  currentUserId: string;
}

export function KanbanColumn({
  id,
  title,
  accentClass,
  badgeClass,
  tasks,
  currentUserId,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const taskIds = React.useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border border-border bg-muted/30 border-t-4 ${accentClass} min-h-[500px] transition-colors ${
        isOver ? "bg-muted/70 ring-1 ring-primary/30" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          <span
            className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold border ${badgeClass}`}
          >
            {tasks.length}
          </span>
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
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/80 text-xs text-muted-foreground/60">
            No tasks in {title.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
}
