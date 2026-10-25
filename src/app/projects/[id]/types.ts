import { TaskStatus, TaskPriority } from "@/models/Task";

export interface KanbanUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface KanbanTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  assignee?: KanbanUser | null;
  dueDate?: string | null;
  createdBy?: KanbanUser | null;
  createdAt: string;
}

export interface KanbanProject {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived" | "completed";
  owner: KanbanUser;
  members: KanbanUser[];
  createdAt: string;
}

export const COLUMNS: {
  id: TaskStatus;
  title: string;
  accentClass: string;
  badgeClass: string;
}[] = [
  {
    id: "todo",
    title: "To Do",
    accentClass: "border-t-slate-500",
    badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
  {
    id: "in_progress",
    title: "In Progress",
    accentClass: "border-t-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    id: "review",
    title: "Review",
    accentClass: "border-t-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    id: "done",
    title: "Done",
    accentClass: "border-t-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
];
