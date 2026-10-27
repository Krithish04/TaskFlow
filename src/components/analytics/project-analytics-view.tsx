"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  PieChart as PieChartIcon,
  Calendar,
  Layers,
  Users,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/design-tokens";
import type {
  ProjectAnalytics,
  AnalyticsRange,
} from "@/lib/analytics";

interface ProjectAnalyticsViewProps {
  projectId: string;
  projectKey?: string;
  projectColor?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color?: string;
    fill?: string;
  }>;
  label?: string;
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs">
      {label && <p className="font-semibold text-foreground mb-1.5">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium tabular-nums text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
      <BarChart3 className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm font-medium text-foreground">No data recorded</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{message}</p>
    </div>
  );
}

const emptySubscribe = () => () => {};
function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ProjectAnalyticsView({
  projectId,
  projectKey = "TASK",
}: ProjectAnalyticsViewProps) {
  const [range, setRange] = React.useState<AnalyticsRange>("30");
  const [data, setData] = React.useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const mounted = useMounted();

  const fetchAnalytics = React.useCallback(async (selectedRange: AnalyticsRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analytics?range=${selectedRange}`);
      if (!res.ok) {
        throw new Error("Failed to load project analytics");
      }
      const json = await res.json();
      setData(json.analytics);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading analytics");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    let isMounted = true;
    fetch(`/api/projects/${projectId}/analytics?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load project analytics");
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json.analytics);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error loading analytics");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, range]);

  const kpis = data?.kpis;

  // Render Skeleton while initial loading
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  // Render Error state
  if (error && !data) {
    return (
      <div className="py-12">
        <EmptyState
          icon={AlertTriangle}
          title="Could not load analytics"
          description={error}
          action={
            <Button size="sm" onClick={() => fetchAnalytics(range)}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const hasTasks = (kpis?.totalTasks || 0) > 0;

  // Accessible Summaries
  const burndownSummary = hasTasks
    ? `Task burndown over the last ${range} days shows ${
        data?.burndown[data.burndown.length - 1]?.remaining || 0
      } tasks currently open compared to an initial count of ${
        data?.burndown[0]?.remaining || 0
      } tasks.`
    : "No tasks found in project to generate burndown curve.";

  const statusSummary = hasTasks
    ? `Status distribution: ${
        data?.statusBreakdown
          .map((s) => `${s.label}: ${s.count} (${s.percentage}%)`)
          .join(", ")
      }.`
    : "No tasks available for status breakdown.";

  const velocitySummary =
    (kpis?.createdInRange || 0) > 0 || (kpis?.completedInRange || 0) > 0
      ? `Over the last ${range} days: ${kpis?.createdInRange || 0} tasks created and ${
          kpis?.completedInRange || 0
        } tasks completed.`
      : "No tasks were created or completed in the selected time window.";

  const prioritySummary = hasTasks
    ? `Priority counts: ${
        data?.priorityBreakdown
          .map((p) => `${p.label}: ${p.count} (${p.percentage}%)`)
          .join(", ")
      }.`
    : "No tasks available for priority breakdown.";

  return (
    <div className="space-y-6">
      {/* Top Controls: Title, Subtitle, Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Project Analytics
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time delivery KPIs, burndown progression, and team workload.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Range Selector Pills */}
          <div
            className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs"
            role="group"
            aria-label="Analytics range selector"
          >
            {(["7", "30", "90"] as const).map((r) => {
              const active = range === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded-md px-3 py-1 font-medium transition-all ${
                    active
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                  aria-pressed={active}
                >
                  {r} Days
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(range)}
            disabled={loading}
            aria-label="Refresh analytics data"
            className="h-8 px-2.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Tasks */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Total Tasks</span>
            <Layers className="h-4 w-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">
            {kpis?.totalTasks ?? 0}
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <span className="font-medium text-foreground">+{kpis?.createdInRange ?? 0}</span>
            <span>in last {range}d</span>
          </p>
        </Card>

        {/* Completed */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">
            {kpis?.completedTasks ?? 0}
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              +{kpis?.completedInRange ?? 0}
            </span>
            <span>in last {range}d</span>
          </p>
        </Card>

        {/* Completion Rate */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Completion Rate</span>
            <PieChartIcon className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">
            {kpis?.completionRate ?? 0}%
          </div>
          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis?.completionRate || 0)}%` }}
            />
          </div>
        </Card>

        {/* Average Cycle Time */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Avg Cycle Time</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">
            {kpis?.avgCycleTimeDays !== null && kpis?.avgCycleTimeDays !== undefined
              ? `${kpis.avgCycleTimeDays}d`
              : "N/A"}
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 truncate">
            Created to Done
          </p>
        </Card>

        {/* Overdue */}
        <Card
          className={`p-4 sm:p-5 col-span-2 sm:col-span-1 ${
            (kpis?.overdueTasks ?? 0) > 0 ? "border-red-500/30 bg-red-500/5" : ""
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Overdue</span>
            <AlertTriangle
              className={`h-4 w-4 ${
                (kpis?.overdueTasks ?? 0) > 0
                  ? "text-red-500"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold tabular-nums ${
              (kpis?.overdueTasks ?? 0) > 0
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            }`}
          >
            {kpis?.overdueTasks ?? 0}
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5">
            {(kpis?.overdueTasks ?? 0) === 0 ? "All on schedule" : "Requires attention"}
          </p>
        </Card>
      </div>

      {/* Main Charts: Burndown & Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Burndown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" />
                Task Burndown
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {range} Days
              </Badge>
            </div>
            <CardDescription>
              Remaining open tasks vs planned linear burndown over the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && hasTasks && (data?.burndown?.length || 0) > 0 ? (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data?.burndown || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="burndownGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-border, #e2e8f0)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #64748b)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #64748b)" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="ideal"
                      name="Ideal Pace"
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="remaining"
                      name="Remaining Tasks"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#burndownGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartEmptyState message="No task history available to calculate burndown velocity." />
            )}
            <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2.5">
              {burndownSummary}
            </p>
          </CardContent>
        </Card>

        {/* Status Distribution Donut */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-blue-500" />
                Status Distribution
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {kpis?.totalTasks || 0} Total
              </Badge>
            </div>
            <CardDescription>
              Breakdown of project tasks across workflow stages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && hasTasks ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-64 sm:h-72">
                <div className="h-48 w-48 relative flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      {(() => {
                        const activeStatuses = (data?.statusBreakdown || []).filter((s) => s.count > 0);
                        return (
                          <Pie
                            data={activeStatuses}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                          >
                            {activeStatuses.map((entry) => (
                              <Cell key={entry.status} fill={entry.color} />
                            ))}
                          </Pie>
                        );
                      })()}
                      <Tooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Stat */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {kpis?.totalTasks || 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Tasks
                    </span>
                  </div>
                </div>

                {/* Donut Legend Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 w-full sm:w-auto">
                  {(data?.statusBreakdown || []).map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30 border border-border/50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-foreground">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <span className="font-bold text-foreground">{item.count}</span>
                        <span className="text-muted-foreground text-[10px]">
                          ({item.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ChartEmptyState message="Create tasks to view how your workload is partitioned." />
            )}
            <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2.5">
              {statusSummary}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Charts: Created vs Completed & Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Created vs Completed Velocity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-500" />
                Created vs. Completed
              </CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Created
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Completed
                </span>
              </div>
            </div>
            <CardDescription>
              Velocity of incoming work compared to completed delivery per week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && (data?.weeklyTrends?.length || 0) > 0 ? (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.weeklyTrends || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-border, #e2e8f0)"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="weekLabel"
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #64748b)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #64748b)" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar
                      dataKey="created"
                      name="Created Tasks"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="completed"
                      name="Completed Tasks"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartEmptyState message="No task creations or completions in the selected range." />
            )}
            <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2.5">
              {velocitySummary}
            </p>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Priority Breakdown
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {kpis?.totalTasks || 0} Total
              </Badge>
            </div>
            <CardDescription>
              Distribution of tasks classified by urgency and impact.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && hasTasks ? (
              <div className="space-y-4 py-3">
                {(data?.priorityBreakdown || []).map((item) => (
                  <div key={item.priority} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-foreground">{item.label} Priority</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="font-semibold text-foreground">{item.count} tasks</span>
                        <span className="text-muted-foreground">({item.percentage}%)</span>
                      </div>
                    </div>
                    {/* Bar visual */}
                    <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(item.percentage > 0 ? 3 : 0, item.percentage)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-md bg-slate-500/10 border border-slate-500/20">
                    <div className="font-bold text-foreground text-sm">
                      {data?.priorityCounts?.low || 0}
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">Low</div>
                  </div>
                  <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <div className="font-bold text-foreground text-sm">
                      {data?.priorityCounts?.medium || 0}
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">Medium</div>
                  </div>
                  <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/20">
                    <div className="font-bold text-foreground text-sm">
                      {data?.priorityCounts?.high || 0}
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">High</div>
                  </div>
                </div>
              </div>
            ) : (
              <ChartEmptyState message="Assign priorities to tasks to analyze urgency allocation." />
            )}
            <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2.5">
              {prioritySummary}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Workload Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Team Workload by Status
            </CardTitle>
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                To Do
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                In Progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Done
              </span>
            </div>
          </div>
          <CardDescription>
            Task load and stage distribution across project team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.memberWorkload?.length || 0) > 0 ? (
            <div className="space-y-3.5">
              {data?.memberWorkload.map((member) => (
                <div
                  key={member.userId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/60 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email || "No email"}
                      </p>
                    </div>
                  </div>

                  {/* Horizontal Stacked Bar */}
                  <div className="flex-1 max-w-md mx-0 sm:mx-4">
                    <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden flex">
                      {member.total > 0 ? (
                        <>
                          {member.todo > 0 && (
                            <div
                              style={{ width: `${(member.todo / member.total) * 100}%` }}
                              className="bg-slate-500 h-full transition-all"
                              title={`To Do: ${member.todo}`}
                            />
                          )}
                          {member.in_progress > 0 && (
                            <div
                              style={{ width: `${(member.in_progress / member.total) * 100}%` }}
                              className="bg-blue-500 h-full transition-all"
                              title={`In Progress: ${member.in_progress}`}
                            />
                          )}
                          {member.review > 0 && (
                            <div
                              style={{ width: `${(member.review / member.total) * 100}%` }}
                              className="bg-amber-500 h-full transition-all"
                              title={`Review: ${member.review}`}
                            />
                          )}
                          {member.done > 0 && (
                            <div
                              style={{ width: `${(member.done / member.total) * 100}%` }}
                              className="bg-emerald-500 h-full transition-all"
                              title={`Done: ${member.done}`}
                            />
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-muted/40" />
                      )}
                    </div>
                  </div>

                  {/* Counts Matrix */}
                  <div className="flex items-center gap-3 text-xs tabular-nums justify-between sm:justify-end">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span title="To Do" className="text-slate-600 dark:text-slate-400">
                        {member.todo}
                      </span>
                      <span>/</span>
                      <span title="In Progress" className="text-blue-600 dark:text-blue-400 font-medium">
                        {member.in_progress}
                      </span>
                      <span>/</span>
                      <span title="Review" className="text-amber-600 dark:text-amber-400">
                        {member.review}
                      </span>
                      <span>/</span>
                      <span title="Done" className="text-emerald-600 dark:text-emerald-400">
                        {member.done}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-semibold text-xs min-w-[50px] justify-center">
                      {member.total} total
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ChartEmptyState message="No team members assigned to tasks in this project." />
          )}
          <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2.5">
            Workload table displays task stage distribution for all project assignees.
          </p>
        </CardContent>
      </Card>

      {/* Overdue Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Tasks
            </CardTitle>
            <Badge
              variant={(kpis?.overdueTasks ?? 0) > 0 ? "destructive" : "outline"}
              className="tabular-nums"
            >
              {kpis?.overdueTasks ?? 0} overdue
            </Badge>
          </div>
          <CardDescription>
            Tasks requiring immediate resolution to maintain target milestones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.overdueTasks?.length || 0) > 0 ? (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {data?.overdueTasks.map((task) => (
                <div
                  key={task._id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors bg-card"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-primary/80 mt-0.5">
                      {projectKey}-{task.number}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${projectId}/board`}
                        className="text-sm font-medium text-foreground hover:underline truncate block"
                      >
                        {task.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge
                          variant={STATUS_CONFIG[task.status]?.badgeVariant || "outline"}
                          className="text-[10px] py-0"
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant={PRIORITY_CONFIG[task.priority]?.badgeVariant || "outline"}
                          className="text-[10px] py-0"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0 text-xs">
                    {task.assignee && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">
                            {task.assignee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[100px]">{task.assignee.name}</span>
                      </div>
                    )}
                    <span className="font-medium text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full text-xs tabular-nums">
                      {task.daysOverdue}d overdue
                    </span>
                    <Link
                      href={`/projects/${projectId}/board`}
                      className="text-muted-foreground hover:text-foreground p-1"
                      aria-label="View task on board"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border bg-emerald-500/5">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-foreground">Zero Overdue Tasks</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                All scheduled tasks are either completed or ahead of their milestones.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
