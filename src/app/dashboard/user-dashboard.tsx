"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  MessageSquare,
  ArrowRight,
  Search,
  FolderKanban,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

export interface UserTask {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  createdAt: string;
}

export interface UserComment {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

export interface UserProjectItem {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived" | "completed";
  ownerName: string;
}

interface UserDashboardProps {
  assignedTasks: UserTask[];
  recentComments: UserComment[];
  userProjects: UserProjectItem[];
}

const PRIORITY_BADGES = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const STATUS_BADGES = {
  todo: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  review: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const STATUS_LABELS = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export function UserDashboard({
  assignedTasks,
  recentComments,
  userProjects,
}: UserDashboardProps) {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  // Compute stats
  const activeTasks = assignedTasks.filter((t) => t.status !== "done");
  const completedTasks = assignedTasks.filter((t) => t.status === "done");

  const overdueTasks = activeTasks.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < now;
  });

  const dueSoonTasks = activeTasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= now && due <= nextWeek;
  });

  // Filter tasks based on status and search query
  const filteredTasks = assignedTasks.filter((t) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && t.status !== "done") ||
      (statusFilter === "overdue" && t.dueDate && new Date(t.dueDate) < now && t.status !== "done") ||
      (statusFilter === "due_soon" &&
        t.dueDate &&
        new Date(t.dueDate) >= now &&
        new Date(t.dueDate) <= nextWeek &&
        t.status !== "done") ||
      t.status === statusFilter;

    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Assigned Tasks</span>
              <Clock className="size-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {activeTasks.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            {completedTasks.length} completed total
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Due Soon</span>
              <Calendar className="size-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {dueSoonTasks.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Due in the next 7 days
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Overdue Tasks</span>
              <AlertTriangle className="size-4 text-destructive" />
            </CardDescription>
            <CardTitle className={`text-2xl font-bold ${overdueTasks.length > 0 ? "text-destructive" : "text-foreground"}`}>
              {overdueTasks.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            {overdueTasks.length > 0 ? "Requires urgent action" : "Zero overdue tasks"}
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>My Projects</span>
              <FolderKanban className="size-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {userProjects.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Active workspace memberships
          </CardContent>
        </Card>
      </div>

      {/* Due Soon / Overdue Urgent Notification Alert */}
      {overdueTasks.length > 0 && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-semibold text-destructive">
              {overdueTasks.length} Overdue {overdueTasks.length === 1 ? "Task" : "Tasks"}
            </h3>
            <p className="text-xs text-destructive/90">
              The following task deadlines have passed and require immediate follow-up:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {overdueTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.projectId}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1 text-xs font-medium text-foreground border border-border shadow-2xs hover:bg-muted transition-colors"
                >
                  <span>{t.title}</span>
                  <span className="text-[10px] text-muted-foreground">({t.projectName})</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout: Assigned Tasks & Recent Comments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Assigned Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CheckCircle className="size-5 text-primary" />
                Assigned Tasks
              </h2>
              <p className="text-xs text-muted-foreground">
                Tasks assigned to you across all project boards.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks or projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
            {[
              { id: "all", label: "All", count: assignedTasks.length },
              { id: "active", label: "Active", count: activeTasks.length },
              { id: "overdue", label: "Overdue", count: overdueTasks.length },
              { id: "due_soon", label: "Due Soon", count: dueSoonTasks.length },
              { id: "todo", label: "To Do", count: assignedTasks.filter((t) => t.status === "todo").length },
              {
                id: "in_progress",
                label: "In Progress",
                count: assignedTasks.filter((t) => t.status === "in_progress").length,
              },
              { id: "review", label: "Review", count: assignedTasks.filter((t) => t.status === "review").length },
              { id: "done", label: "Done", count: completedTasks.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] rounded-full px-1.5 py-0.2 ${
                    statusFilter === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <Card className="border-dashed shadow-2xs">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="size-10 text-muted-foreground/60 mb-2" />
                <h3 className="text-sm font-semibold text-foreground">No tasks found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  {searchQuery
                    ? "No tasks match your current search query."
                    : "You do not have any tasks in this category."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isOverdue =
                  task.dueDate && new Date(task.dueDate) < now && task.status !== "done";
                const isDueSoon =
                  task.dueDate &&
                  new Date(task.dueDate) >= now &&
                  new Date(task.dueDate) <= nextWeek &&
                  task.status !== "done";

                return (
                  <Card
                    key={task.id}
                    className="shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                                PRIORITY_BADGES[task.priority]
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                                STATUS_BADGES[task.status]
                              }`}
                            >
                              {STATUS_LABELS[task.status]}
                            </span>
                            <Link
                              href={`/projects/${task.projectId}`}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                            >
                              <FolderKanban className="size-3" />
                              <span>{task.projectName}</span>
                            </Link>
                          </div>
                          <h4 className="text-sm font-semibold text-foreground pt-0.5">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <Link href={`/projects/${task.projectId}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs shrink-0"
                          >
                            <span>Open</span>
                            <ExternalLink className="size-3" />
                          </Button>
                        </Link>
                      </div>

                      {/* Task Card Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" />
                          {task.dueDate ? (
                            <span
                              className={
                                isOverdue
                                  ? "text-destructive font-semibold"
                                  : isDueSoon
                                  ? "text-amber-600 dark:text-amber-400 font-medium"
                                  : ""
                              }
                            >
                              {isOverdue && "Overdue: "}
                              {isDueSoon && "Due: "}
                              {new Date(task.dueDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          ) : (
                            <span>No due date</span>
                          )}
                        </div>

                        <span className="text-[11px]">
                          Created {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Recent Comments & My Projects */}
        <div className="space-y-6">
          {/* Section: Recent Comments */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                Recent Comments
              </CardTitle>
              <CardDescription className="text-xs">
                Latest updates on your tasks and team projects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {recentComments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No recent comments on your projects or tasks.
                </div>
              ) : (
                recentComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-lg border border-border bg-card/60 p-3 space-y-1.5 text-xs hover:bg-card transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                          {comment.authorName ? comment.authorName[0].toUpperCase() : "U"}
                        </div>
                        <span className="font-semibold text-foreground truncate">
                          {comment.authorName}
                        </span>
                        {comment.authorRole && (
                          <span className="text-[9px] uppercase font-semibold text-muted-foreground bg-muted px-1 rounded">
                            {comment.authorRole}
                          </span>
                        )}
                      </div>
                      <time className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(comment.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>

                    <p className="text-foreground text-xs line-clamp-3 leading-relaxed">
                      {comment.body}
                    </p>

                    <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[11px]">
                      <Link
                        href={`/projects/${comment.projectId}`}
                        className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 truncate"
                      >
                        <span className="font-medium truncate">{comment.taskTitle}</span>
                        <span className="text-[10px] opacity-75 shrink-0">
                          ({comment.projectName})
                        </span>
                      </Link>
                      <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Section: My Projects Quick Links */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderKanban className="size-4 text-primary" />
                My Projects
              </CardTitle>
              <CardDescription className="text-xs">
                Workspaces you are collaborating in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {userProjects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  You are not a member of any project yet.
                </div>
              ) : (
                userProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:border-primary/40 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="font-medium text-xs text-foreground group-hover:text-primary transition-colors truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Owner: {p.ownerName}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-primary shrink-0">
                      <span>Board</span>
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
