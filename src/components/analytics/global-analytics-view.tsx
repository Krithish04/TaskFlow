"use client";

import * as React from "react";
import Link from "next/link";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Search,
  Users,
  Shield,
  Briefcase,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getProjectColor, STATUS_CONFIG, STATUS_CHART_COLORS } from "@/lib/design-tokens";
import type { GlobalAnalytics, ProjectTaskDistribution } from "@/lib/analytics";
import type { TaskStatus } from "@/models/Task";

interface GlobalAnalyticsViewProps {
  initialData?: GlobalAnalytics;
  userRole: string;
}

function emptySubscribe() {
  return () => {};
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "No activity yet";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "Just now";
}

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done"];
const MAX_PROJECTS = 10;

export function TasksPerProjectCard({
  loading,
  isMounted,
  tasksPerProject,
}: {
  loading: boolean;
  isMounted: boolean;
  tasksPerProject: ProjectTaskDistribution[];
}) {
  const [activeTooltip, setActiveTooltip] = React.useState<{
    project: ProjectTaskDistribution;
    statusKey?: TaskStatus;
    x: number;
    y: number;
  } | null>(null);

  const isSingleProject = tasksPerProject.length === 1;
  const isCapped = tasksPerProject.length > MAX_PROJECTS;

  const displayedProjects = React.useMemo(() => {
    if (!isCapped) return tasksPerProject;
    return [...tasksPerProject]
      .sort((a, b) => b.total - a.total)
      .slice(0, MAX_PROJECTS);
  }, [tasksPerProject, isCapped]);

  const maxTotal = React.useMemo(() => {
    return Math.max(...displayedProjects.map((p) => p.total), 1);
  }, [displayedProjects]);

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div>
          <CardTitle className="text-base font-semibold">
            Tasks per Project
          </CardTitle>
          <CardDescription className="text-xs">
            Tasks by status for each project
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {loading || !isMounted ? (
          <Skeleton className="h-[280px] w-full rounded-lg" />
        ) : tasksPerProject.length === 0 ? (
          <div className="py-4">
            <EmptyState
              icon={FolderKanban}
              title="No projects available"
              description="No project tasks available to visualize."
              className="py-12"
            />
            <p className="sr-only">No project tasks available to visualize.</p>
          </div>
        ) : isSingleProject ? (
          (() => {
            const project = tasksPerProject[0];
            const donutData = STATUS_ORDER.map((statusKey) => ({
              status: statusKey,
              label: STATUS_CONFIG[statusKey].label,
              count: project[statusKey] || 0,
              color: STATUS_CHART_COLORS[statusKey],
            })).filter((d) => d.count > 0);

            return (
              <div className="space-y-4">
                {/* Accessible text summary */}
                <div className="sr-only" aria-live="polite">
                  <h4>Tasks per Project Summary</h4>
                  <p>
                    {`${project.name}: ${project.total} total tasks (${project.todo} To Do, ${project.in_progress} In Progress, ${project.review} Review, ${project.done} Done).`}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2 min-h-[220px]">
                  {/* Status Donut with counts in center */}
                  <div className="relative size-44 sm:size-48 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={
                            donutData.length > 0
                              ? donutData
                              : [
                                  {
                                    status: "empty",
                                    label: "No tasks",
                                    count: 1,
                                    color: "var(--muted)",
                                  },
                                ]
                          }
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={donutData.length > 1 ? 3 : 0}
                          stroke="none"
                        >
                          {donutData.length > 0 ? (
                            donutData.map((entry) => (
                              <Cell key={entry.status} fill={entry.color} />
                            ))
                          ) : (
                            <Cell fill="var(--muted)" opacity={0.4} />
                          )}
                        </Pie>
                        {donutData.length > 0 && (
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const item = payload[0];
                              const count = Number(item.value) || 0;
                              const pct =
                                project.total > 0
                                  ? Math.round(
                                      (count / project.total) * 100
                                    )
                                  : 0;
                              return (
                                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="size-2.5 rounded-[2px]"
                                      style={{
                                        backgroundColor:
                                          item.payload?.color,
                                      }}
                                      aria-hidden="true"
                                    />
                                    <span className="font-semibold text-foreground">
                                      {item.name}:
                                    </span>
                                    <span className="font-bold tabular-nums text-foreground">
                                      {count}
                                    </span>
                                    <span className="text-muted-foreground text-[11px]">
                                      ({pct}%)
                                    </span>
                                  </div>
                                </div>
                              );
                            }}
                          />
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Count in the center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold tabular-nums text-foreground">
                        {project.total}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        {project.total === 1 ? "Task" : "Tasks"}
                      </span>
                    </div>
                  </div>

                  {/* Legend with numbers: small colored square plus dark text with count */}
                  <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 w-full sm:w-auto">
                    {STATUS_ORDER.map((statusKey) => {
                      const cfg = STATUS_CONFIG[statusKey];
                      const count = project[statusKey] || 0;
                      return (
                        <div
                          key={statusKey}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border/50 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-[2px] shrink-0"
                              style={{
                                backgroundColor:
                                  STATUS_CHART_COLORS[statusKey],
                              }}
                              aria-hidden="true"
                            />
                            <span className="font-medium text-foreground">
                              {cfg.label}
                            </span>
                          </div>
                          <span className="font-semibold tabular-nums text-foreground">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-center text-xs font-medium text-muted-foreground pt-1">
                  Project:{" "}
                  <span className="text-foreground font-semibold">
                    {project.name}
                  </span>
                </div>
              </div>
            );
          })()
        ) : (
          <div>
            {/* Accessible text summary */}
            <div className="sr-only" aria-live="polite">
              <h4>Tasks per Project Summary</h4>
              <ul>
                {displayedProjects.map((p) => (
                  <li key={p.id}>
                    {`${p.name}: ${p.total} total tasks (${p.todo} To Do, ${p.in_progress} In Progress, ${p.review} Review, ${p.done} Done).`}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legend: small colored square plus dark text with count */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs border-b border-border/50 pb-3 mb-3">
              {STATUS_ORDER.map((statusKey) => {
                const totalCount = displayedProjects.reduce(
                  (sum, p) => sum + (p[statusKey] || 0),
                  0
                );
                return (
                  <div key={statusKey} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-[2px] shrink-0"
                      style={{
                        backgroundColor: STATUS_CHART_COLORS[statusKey],
                      }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-foreground">
                      {STATUS_CONFIG[statusKey].label}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground ml-0.5">
                      {totalCount}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Horizontal stacked bars, one row per project */}
            <div className="space-y-2.5">
              {displayedProjects.map((p) => {
                const hasTasks = p.total > 0;
                const rowWidthPct = hasTasks
                  ? Math.max(6, (p.total / maxTotal) * 100)
                  : 0;

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 sm:gap-3 py-1 group"
                    onMouseEnter={(e) =>
                      setActiveTooltip({
                        project: p,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    onMouseMove={(e) =>
                      setActiveTooltip((prev) =>
                        prev
                          ? { ...prev, x: e.clientX, y: e.clientY }
                          : { project: p, x: e.clientX, y: e.clientY }
                      )
                    }
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    {/* Full project name on the left (no rotated labels) */}
                    <div
                      className="w-24 sm:w-36 md:w-40 shrink-0 text-xs sm:text-sm font-medium text-foreground truncate"
                      title={p.name}
                    >
                      {p.name}
                    </div>

                    {/* Horizontal Stacked Bar container: max thickness ~24px */}
                    <div className="relative flex-1 h-6 max-h-[24px] bg-muted/30 rounded-md flex items-stretch overflow-hidden">
                      {!hasTasks ? (
                        <div className="w-full h-full flex items-center px-2 text-[10px] text-muted-foreground italic">
                          No tasks
                        </div>
                      ) : (
                        <div
                          className="h-full flex items-stretch rounded-md overflow-hidden transition-all duration-200"
                          style={{ width: `${rowWidthPct}%` }}
                        >
                          {STATUS_ORDER.map((statusKey) => {
                            const count = p[statusKey];
                            if (count <= 0) return null;
                            const segmentPct = (count / p.total) * 100;
                            const trackPct = (count / maxTotal) * 100;
                            const isWideEnough = trackPct >= 7;

                            return (
                              <div
                                key={statusKey}
                                style={{
                                  width: `${segmentPct}%`,
                                  backgroundColor:
                                    STATUS_CHART_COLORS[statusKey],
                                }}
                                className={cn(
                                  "relative h-full flex items-center justify-center transition-opacity hover:opacity-90 select-none",
                                  statusKey === "review"
                                    ? "text-slate-900"
                                    : "text-white"
                                )}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltip({
                                    project: p,
                                    statusKey,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                onMouseMove={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltip({
                                    project: p,
                                    statusKey,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                title={`${p.name} • ${STATUS_CONFIG[statusKey].label}: ${count} task${count === 1 ? "" : "s"} (${Math.round(segmentPct)}%)`}
                                aria-label={`${STATUS_CONFIG[statusKey].label}: ${count}`}
                              >
                                {isWideEnough && (
                                  <span className="text-[10px] sm:text-[11px] font-bold tabular-nums px-0.5 leading-none">
                                    {count}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Total count at the end of each row */}
                    <div
                      className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground"
                      title={`Total: ${p.total} tasks`}
                    >
                      {p.total}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Caption: show real limit only if capped */}
            {isCapped && (
              <p className="text-[11px] text-muted-foreground mt-3 text-center">
                {`Showing the ${MAX_PROJECTS} most active projects`}
              </p>
            )}
          </div>
        )}

        {/* Floating Tooltip for Hover */}
        {activeTooltip && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-lg backdrop-blur-xs transition-opacity duration-150 min-w-[170px]"
            style={{
              left: Math.min(
                Math.max(12, activeTooltip.x + 12),
                typeof window !== "undefined"
                  ? window.innerWidth - 200
                  : activeTooltip.x + 12
              ),
              top: Math.max(12, activeTooltip.y - 45),
            }}
          >
            <div className="font-semibold text-foreground mb-1">
              {activeTooltip.project.name}
            </div>
            {activeTooltip.statusKey ? (
              <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-border/50">
                <span
                  className="size-2 rounded-[2px]"
                  style={{
                    backgroundColor:
                      STATUS_CHART_COLORS[activeTooltip.statusKey],
                  }}
                />
                <span className="font-medium text-foreground">
                  {STATUS_CONFIG[activeTooltip.statusKey].label}:
                </span>
                <span className="font-bold tabular-nums text-foreground">
                  {activeTooltip.project[activeTooltip.statusKey]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  (
                  {activeTooltip.project.total > 0
                    ? Math.round(
                        (activeTooltip.project[activeTooltip.statusKey] /
                          activeTooltip.project.total) *
                          100
                      )
                    : 0}
                  %)
                </span>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              {STATUS_ORDER.map((s) => (
                <div key={s} className="flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1">
                    <span
                      className="size-1.5 rounded-[1px]"
                      style={{ backgroundColor: STATUS_CHART_COLORS[s] }}
                    />
                    {STATUS_CONFIG[s].label}:
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {activeTooltip.project[s]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1.5 pt-1 border-t border-border/50 flex justify-between font-semibold text-foreground text-[11px]">
              <span>Total:</span>
              <span className="tabular-nums">
                {activeTooltip.project.total} tasks
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GlobalAnalyticsView({
  initialData,
  userRole,
}: GlobalAnalyticsViewProps) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [data, setData] = React.useState<GlobalAnalytics | null>(
    initialData || null
  );
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/analytics/global");
      if (!res.ok) {
        throw new Error("Failed to load global analytics data");
      }
      const json = await res.json();
      setData(json.analytics);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialData) return;
    let active = true;
    fetch("/api/analytics/global")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load global analytics data");
        return res.json();
      })
      .then((json) => {
        if (active) {
          setData(json.analytics);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load analytics."
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialData]);

  const projects = React.useMemo(() => data?.projects || [], [data?.projects]);
  const filteredProjects = React.useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.key && p.key.toLowerCase().includes(q)) ||
        p.owner.name.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const tasksPerProject = data?.tasksPerProject || [];
  const mostActiveMembers = data?.mostActiveMembers || [];
  const kpis = data?.kpis;

  const isAdmin = userRole === "admin";

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
              {isAdmin ? (
                <>
                  <Shield className="size-3" />
                  Organization-Wide Analytics
                </>
              ) : (
                <>
                  <Briefcase className="size-3" />
                  Managed Projects Analytics
                </>
              )}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isAdmin ? "Global Portfolio Analytics" : "Project Portfolio Analytics"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isAdmin
              ? "Comprehensive metrics, project health, and cross-team productivity across all organization projects."
              : "Cross-project health, velocity, and team member workload across all projects you manage."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-1.5 h-8 text-xs font-medium"
            aria-label="Refresh global analytics"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchData}>
              Try again
            </Button>
          </div>
        </Card>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Projects */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Projects
            </CardTitle>
            <FolderKanban className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {kpis?.totalProjects ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis?.activeProjects ?? 0} active in system
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Tasks */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Tasks
            </CardTitle>
            <Layers className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {kpis?.totalTasks ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all {kpis?.totalProjects ?? 0} projects
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Completed
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {kpis?.completedTasks ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Delivered to done status
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Completion Rate
            </CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {kpis?.completionRate ?? 0}%
                </div>
                <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(kpis?.completionRate ?? 0, 100)}%` }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card
          className={`shadow-xs ${
            (kpis?.overdueTasks ?? 0) > 0
              ? "border-destructive/40 bg-destructive/5"
              : ""
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Overdue Tasks
            </CardTitle>
            <AlertTriangle
              className={`size-4 ${
                (kpis?.overdueTasks ?? 0) > 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    (kpis?.overdueTasks ?? 0) > 0
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {kpis?.overdueTasks ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Past due date & uncompleted
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Project Health Table */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Project Health & Progress
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Monitor individual project delivery status, completion trajectory, and overdue warnings.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={
              searchQuery
                ? "No matching projects found"
                : "No projects available"
            }
            description={
              searchQuery
                ? `No projects matched "${searchQuery}". Try clearing the search filter.`
                : "There are currently no projects recorded in the system."
            }
            action={
              searchQuery ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card className="shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <caption className="sr-only">
                  Project Health Table detailing progress, completion rates, and overdue tasks.
                </caption>
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[11px] tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Project
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Lead / PM
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Progress
                    </th>
                    <th scope="col" className="px-4 py-3 text-center">
                      Overdue
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Last Activity
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Workspace
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProjects.map((project) => {
                    const colorToken = getProjectColor(project.color);
                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Project Info */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`size-2.5 rounded-full shrink-0 ${colorToken.dotClass}`}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/projects/${project.id}/overview`}
                                className="font-semibold text-foreground hover:text-primary hover:underline transition-colors block truncate"
                              >
                                {project.name}
                              </Link>
                              {project.key && (
                                <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                                  {project.key}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Owner / PM */}
                        <td className="px-4 py-3.5 text-foreground whitespace-nowrap">
                          {project.owner.name}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge
                            variant={
                              project.status === "active"
                                ? "status-done"
                                : project.status === "completed"
                                ? "status-in-progress"
                                : "outline"
                            }
                            size="sm"
                          >
                            {project.status}
                          </Badge>
                        </td>

                        {/* Progress */}
                        <td className="px-4 py-3.5 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                              <span>
                                {project.completedTasks} / {project.totalTasks}
                              </span>
                              <span className="font-semibold text-foreground">
                                {project.completionRate}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${project.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Overdue */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {project.overdueTasks > 0 ? (
                            <Badge variant="priority-high" size="sm">
                              {project.overdueTasks} overdue
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">
                              0
                            </span>
                          )}
                        </td>

                        {/* Last Activity */}
                        <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {isMounted ? formatRelativeTime(project.lastActivityAt) : "—"}
                        </td>

                        {/* Open Workspace Action */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <Link
                            href={`/projects/${project.id}/overview`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "xs" }),
                              "gap-1 text-xs"
                            )}
                          >
                            Open
                            <ArrowUpRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {/* Section 2: Charts Grid (Tasks per Project & Most Active Members) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks per Project Card */}
        <TasksPerProjectCard
          loading={loading}
          isMounted={isMounted}
          tasksPerProject={tasksPerProject}
        />

        {/* Most Active Members */}
        <Card className="shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Most Active Team Members
                </CardTitle>
                <CardDescription className="text-xs">
                  Team members leading task delivery across all workspaces
                </CardDescription>
              </div>
              <Users className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : mostActiveMembers.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No active member assignments found yet.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="sr-only">
                  List of most active team members ranked by task assignment volume and completed work.
                </p>
                {mostActiveMembers.slice(0, 5).map((member, idx) => {
                  const initials = member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-bold text-muted-foreground w-4">
                          #{idx + 1}
                        </span>
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-foreground tabular-nums">
                          {member.completedTasks} / {member.totalTasks} done
                        </div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          {member.completionRate}% completion
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  Ranked by total task assignments and delivery volume across projects.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
