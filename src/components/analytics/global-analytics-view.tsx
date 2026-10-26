"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
import { getProjectColor } from "@/lib/design-tokens";
import type { GlobalAnalytics } from "@/lib/analytics";

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
        {/* Tasks per Project Bar Chart */}
        <Card className="shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Tasks per Project
                </CardTitle>
                <CardDescription className="text-xs">
                  Volume of tasks delivered vs in-progress across projects
                </CardDescription>
              </div>
              <Layers className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading || !isMounted ? (
              <Skeleton className="h-[280px] w-full rounded-lg" />
            ) : tasksPerProject.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No project tasks available to visualize.
              </div>
            ) : (
              <div>
                <p className="sr-only">
                  Bar chart showing tasks completed, in progress, and to do across projects.
                </p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tasksPerProject}
                      margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="key"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Bar
                        dataKey="done"
                        name="Done"
                        fill="#10b981"
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="in_progress"
                        name="In Progress"
                        fill="#3b82f6"
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="review"
                        name="Review"
                        fill="#f59e0b"
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="todo"
                        name="To Do"
                        fill="#94a3b8"
                        stackId="a"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 text-center">
                  Shows task status distribution for up to all projects in your portfolio.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
