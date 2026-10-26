import type { TaskStatus, TaskPriority } from "@/models/Task";

/**
 * TaskFlow Design Tokens & Constants
 * Per DESIGN.md:
 * - 8 distinct project accent colors that pass contrast on light and dark themes
 * - Status colors: To Do (slate), In Progress (blue), Review (amber), Done (green)
 * - Priority colors: Low (slate), Medium (amber), High (red)
 */

export interface ProjectColorOption {
  id: string;
  name: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  ringClass: string;
}

export const PROJECT_COLOR_PALETTE: readonly ProjectColorOption[] = [
  {
    id: "blue",
    name: "Blue",
    hex: "#2563eb",
    bgClass: "bg-blue-500/10 dark:bg-blue-500/20",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-500/20 dark:border-blue-500/30",
    dotClass: "bg-blue-600 dark:bg-blue-400",
    ringClass: "focus-visible:ring-blue-500",
  },
  {
    id: "indigo",
    name: "Indigo",
    hex: "#4f46e5",
    bgClass: "bg-indigo-500/10 dark:bg-indigo-500/20",
    textClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-indigo-500/20 dark:border-indigo-500/30",
    dotClass: "bg-indigo-600 dark:bg-indigo-400",
    ringClass: "focus-visible:ring-indigo-500",
  },
  {
    id: "violet",
    name: "Violet",
    hex: "#7c3aed",
    bgClass: "bg-violet-500/10 dark:bg-violet-500/20",
    textClass: "text-violet-700 dark:text-violet-300",
    borderClass: "border-violet-500/20 dark:border-violet-500/30",
    dotClass: "bg-violet-600 dark:bg-violet-400",
    ringClass: "focus-visible:ring-violet-500",
  },
  {
    id: "pink",
    name: "Pink",
    hex: "#db2777",
    bgClass: "bg-pink-500/10 dark:bg-pink-500/20",
    textClass: "text-pink-700 dark:text-pink-300",
    borderClass: "border-pink-500/20 dark:border-pink-500/30",
    dotClass: "bg-pink-600 dark:bg-pink-400",
    ringClass: "focus-visible:ring-pink-500",
  },
  {
    id: "red",
    name: "Red",
    hex: "#dc2626",
    bgClass: "bg-red-500/10 dark:bg-red-500/20",
    textClass: "text-red-700 dark:text-red-300",
    borderClass: "border-red-500/20 dark:border-red-500/30",
    dotClass: "bg-red-600 dark:bg-red-400",
    ringClass: "focus-visible:ring-red-500",
  },
  {
    id: "orange",
    name: "Orange",
    hex: "#ea580c",
    bgClass: "bg-orange-500/10 dark:bg-orange-500/20",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-500/20 dark:border-orange-500/30",
    dotClass: "bg-orange-600 dark:bg-orange-400",
    ringClass: "focus-visible:ring-orange-500",
  },
  {
    id: "emerald",
    name: "Emerald",
    hex: "#059669",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/20",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-500/20 dark:border-emerald-500/30",
    dotClass: "bg-emerald-600 dark:bg-emerald-400",
    ringClass: "focus-visible:ring-emerald-500",
  },
  {
    id: "teal",
    name: "Teal",
    hex: "#0891b2",
    bgClass: "bg-teal-500/10 dark:bg-teal-500/20",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-500/20 dark:border-teal-500/30",
    dotClass: "bg-teal-600 dark:bg-teal-400",
    ringClass: "focus-visible:ring-teal-500",
  },
] as const;

export function getProjectColor(colorId?: string | null): ProjectColorOption {
  const match = PROJECT_COLOR_PALETTE.find((c) => c.id === colorId);
  return match || PROJECT_COLOR_PALETTE[0];
}

export interface StatusConfig {
  key: TaskStatus;
  label: string;
  badgeVariant: "status-todo" | "status-in-progress" | "status-review" | "status-done";
  dotClass: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
}

export const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  todo: {
    key: "todo",
    label: "To Do",
    badgeVariant: "status-todo",
    dotClass: "bg-slate-500",
    textClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-slate-500/20 dark:border-slate-500/30",
    bgClass: "bg-slate-500/10 dark:bg-slate-500/20",
  },
  in_progress: {
    key: "in_progress",
    label: "In Progress",
    badgeVariant: "status-in-progress",
    dotClass: "bg-blue-500",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-500/20 dark:border-blue-500/30",
    bgClass: "bg-blue-500/10 dark:bg-blue-500/20",
  },
  review: {
    key: "review",
    label: "Review",
    badgeVariant: "status-review",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-500/20 dark:border-amber-500/30",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/20",
  },
  done: {
    key: "done",
    label: "Done",
    badgeVariant: "status-done",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-500/20 dark:border-emerald-500/30",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/20",
  },
};

export interface PriorityConfig {
  key: TaskPriority;
  label: string;
  badgeVariant: "priority-low" | "priority-medium" | "priority-high";
  dotClass: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  low: {
    key: "low",
    label: "Low",
    badgeVariant: "priority-low",
    dotClass: "bg-slate-400",
    textClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-slate-500/20 dark:border-slate-500/30",
    bgClass: "bg-slate-500/10 dark:bg-slate-500/20",
  },
  medium: {
    key: "medium",
    label: "Medium",
    badgeVariant: "priority-medium",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-500/20 dark:border-amber-500/30",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/20",
  },
  high: {
    key: "high",
    label: "High",
    badgeVariant: "priority-high",
    dotClass: "bg-rose-500",
    textClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-rose-500/20 dark:border-rose-500/30",
    bgClass: "bg-rose-500/10 dark:bg-rose-500/20",
  },
};
