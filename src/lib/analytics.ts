import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Task, type TaskStatus, type TaskPriority } from "@/models/Task";
import { Project } from "@/models/Project";
import "@/models/User";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/design-tokens";

export type AnalyticsRange = "7" | "30" | "90";

export interface AnalyticsKPIs {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  reviewTasks: number;
  overdueTasks: number;
  completionRate: number; // 0 - 100 percentage
  avgCycleTimeDays: number | null; // average days from createdAt to completedAt
  createdInRange: number;
  completedInRange: number;
}

export interface StatusCountItem {
  status: TaskStatus;
  label: string;
  count: number;
  color: string;
  percentage: number;
}

export interface PriorityCountItem {
  priority: TaskPriority;
  label: string;
  count: number;
  color: string;
  percentage: number;
}

export interface WeeklyTrendItem {
  weekLabel: string;
  startDate: string;
  endDate: string;
  created: number;
  completed: number;
}

export interface BurndownPoint {
  date: string; // YYYY-MM-DD
  label: string; // MMM D
  remaining: number;
  ideal: number;
}

export interface MemberWorkloadItem {
  userId: string;
  name: string;
  email: string;
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  total: number;
}

export interface OverdueTaskItem {
  _id: string;
  number: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  daysOverdue: number;
  assignee: {
    _id: string;
    name: string;
    email: string;
  } | null;
}

export interface ProjectAnalytics {
  range: number;
  startDate: string;
  endDate: string;
  kpis: AnalyticsKPIs;
  statusCounts: Record<TaskStatus, number>;
  statusBreakdown: StatusCountItem[];
  priorityCounts: Record<TaskPriority, number>;
  priorityBreakdown: PriorityCountItem[];
  weeklyTrends: WeeklyTrendItem[];
  burndown: BurndownPoint[];
  memberWorkload: MemberWorkloadItem[];
  overdueTasks: OverdueTaskItem[];
}

export interface ProjectHealthItem {
  id: string;
  name: string;
  key?: string;
  color?: string;
  status: "active" | "archived" | "completed";
  owner: {
    id: string;
    name: string;
    email: string;
  };
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number; // 0 - 100 percentage
  lastActivityAt: string | null;
}

export interface ProjectTaskDistribution {
  id: string;
  name: string;
  key?: string;
  color?: string;
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  total: number;
  completionRate: number;
}

export interface ActiveMemberItem {
  id: string;
  name: string;
  email: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
}

export interface GlobalAnalyticsKPIs {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface GlobalAnalytics {
  kpis: GlobalAnalyticsKPIs;
  projects: ProjectHealthItem[];
  tasksPerProject: ProjectTaskDistribution[];
  mostActiveMembers: ActiveMemberItem[];
}

export interface UserPersonalStats {
  totalAssigned: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  completionRate: number; // 0 - 100%
  onTimeRate: number; // 0 - 100%
  onTimeCompletedCount: number;
  completedWithDueDateCount: number;
  weeklyCompleted: {
    weekLabel: string;
    startDate: string;
    endDate: string;
    completed: number;
  }[];
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
  todo: "#64748b",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  done: "#10b981",
};

export const PRIORITY_CHART_COLORS: Record<TaskPriority, string> = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#ef4444",
};

/**
 * Format a Date object to YYYY-MM-DD in UTC.
 */
export function formatUtcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date object to short string: 'MMM D' in UTC.
 */
export function formatUtcShortDate(date: Date): string {
  const m = MONTH_NAMES[date.getUTCMonth()];
  const d = date.getUTCDate();
  return `${m} ${d}`;
}

/**
 * Compute days overdue between dueDate and reference date.
 */
export function computeDaysOverdue(dueDate: Date, refNow: Date): number {
  const diffMs = refNow.getTime() - dueDate.getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Pure helper to compute burndown points given pre-aggregated daily counts.
 */
export function buildBurndownPoints(params: {
  dailyCreatedMap: Map<string, number>;
  dailyCompletedMap: Map<string, number>;
  createdBefore: number;
  completedBefore: number;
  startDate: Date;
  endDate: Date;
}): BurndownPoint[] {
  const {
    dailyCreatedMap,
    dailyCompletedMap,
    createdBefore,
    completedBefore,
    startDate,
    endDate,
  } = params;

  const points: BurndownPoint[] = [];
  const startMs = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  );
  const endMs = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate()
  );

  const dayStepMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((endMs - startMs) / dayStepMs));

  const initialRemaining = Math.max(0, createdBefore - completedBefore);

  let runningCreated = 0;
  let runningCompleted = 0;

  for (let ms = startMs, dayIdx = 0; ms <= endMs; ms += dayStepMs, dayIdx++) {
    const d = new Date(ms);
    const key = formatUtcDateKey(d);

    const createdOnDay = dailyCreatedMap.get(key) || 0;
    const completedOnDay = dailyCompletedMap.get(key) || 0;

    runningCreated += createdOnDay;
    runningCompleted += completedOnDay;

    const remaining = Math.max(
      0,
      createdBefore + runningCreated - (completedBefore + runningCompleted)
    );

    const ideal = Math.max(
      0,
      Math.round(initialRemaining * (1 - dayIdx / totalDays))
    );

    points.push({
      date: key,
      label: formatUtcShortDate(d),
      remaining,
      ideal,
    });
  }

  return points;
}

/**
 * Pure helper to compute weekly trend items from daily aggregated data.
 */
export function buildWeeklyTrendItems(params: {
  dailyCreatedMap: Map<string, number>;
  dailyCompletedMap: Map<string, number>;
  startDate: Date;
  endDate: Date;
}): WeeklyTrendItem[] {
  const { dailyCreatedMap, dailyCompletedMap, startDate, endDate } = params;

  const trends: WeeklyTrendItem[] = [];
  const startMs = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  );
  const endMs = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate()
  );

  const dayStepMs = 24 * 60 * 60 * 1000;
  const weekStepMs = 7 * dayStepMs;

  for (let currentMs = startMs; currentMs <= endMs; currentMs += weekStepMs) {
    const chunkStart = new Date(currentMs);
    const chunkEndMs = Math.min(currentMs + 6 * dayStepMs, endMs);
    const chunkEnd = new Date(chunkEndMs);

    let created = 0;
    let completed = 0;

    for (let dayMs = currentMs; dayMs <= chunkEndMs; dayMs += dayStepMs) {
      const dayKey = formatUtcDateKey(new Date(dayMs));
      created += dailyCreatedMap.get(dayKey) || 0;
      completed += dailyCompletedMap.get(dayKey) || 0;
    }

    const weekLabel = `${formatUtcShortDate(chunkStart)} - ${formatUtcShortDate(chunkEnd)}`;

    trends.push({
      weekLabel,
      startDate: formatUtcDateKey(chunkStart),
      endDate: formatUtcDateKey(chunkEnd),
      created,
      completed,
    });
  }

  return trends;
}

/**
 * Pure helper to compute KPIs from facet result.
 */
export function computeAnalyticsKPIs(params: {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  review: number;
  overdue: number;
  totalCycleTimeMs: number;
  completedWithCycleCount: number;
  createdInRange: number;
  completedInRange: number;
}): AnalyticsKPIs {
  const {
    total,
    completed,
    inProgress,
    todo,
    review,
    overdue,
    totalCycleTimeMs,
    completedWithCycleCount,
    createdInRange,
    completedInRange,
  } = params;

  const completionRate =
    total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  const avgCycleTimeDays =
    completedWithCycleCount > 0
      ? Math.round(
          (totalCycleTimeMs / (completedWithCycleCount * (24 * 60 * 60 * 1000))) *
            10
        ) / 10
      : null;

  return {
    totalTasks: total,
    completedTasks: completed,
    inProgressTasks: inProgress,
    todoTasks: todo,
    reviewTasks: review,
    overdueTasks: overdue,
    completionRate,
    avgCycleTimeDays,
    createdInRange,
    completedInRange,
  };
}

/**
 * Pure helper to compute status breakdown array.
 */
export function computeStatusBreakdown(
  statusCounts: Record<TaskStatus, number>,
  total: number
): StatusCountItem[] {
  const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
  return statuses.map((status) => {
    const count = statusCounts[status] || 0;
    const percentage =
      total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    return {
      status,
      label: STATUS_CONFIG[status]?.label || status,
      count,
      color: STATUS_CHART_COLORS[status],
      percentage,
    };
  });
}

/**
 * Pure helper to compute priority breakdown array.
 */
export function computePriorityBreakdown(
  priorityCounts: Record<TaskPriority, number>,
  total: number
): PriorityCountItem[] {
  const priorities: TaskPriority[] = ["low", "medium", "high"];
  return priorities.map((priority) => {
    const count = priorityCounts[priority] || 0;
    const percentage =
      total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    return {
      priority,
      label: PRIORITY_CONFIG[priority]?.label || priority,
      count,
      color: PRIORITY_CHART_COLORS[priority],
      percentage,
    };
  });
}

/**
 * Fetch and aggregate analytics for a project using native MongoDB aggregation.
 */
export async function getProjectAnalytics(
  projectId: string | Types.ObjectId,
  rangeDays: number = 30,
  refNow: Date = new Date()
): Promise<ProjectAnalytics> {
  await connectDB();

  const projectObjectId =
    typeof projectId === "string" ? new Types.ObjectId(projectId) : projectId;

  const now = new Date(refNow);
  const range = rangeDays === 7 ? 7 : rangeDays === 90 ? 90 : 30;
  const startDate = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);

  // 1. Faceted Aggregation for KPIs, Status Counts, Priority Counts & Daily Counts
  const [facetResult] = await Task.aggregate([
    { $match: { project: projectObjectId } },
    {
      $facet: {
        statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        priorityCounts: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
        kpis: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
              },
              in_progress: {
                $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
              },
              todo: {
                $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] },
              },
              review: {
                $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] },
              },
              overdue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "done"] },
                        { $ne: ["$dueDate", null] },
                        { $lt: ["$dueDate", now] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalCycleTimeMs: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$completedAt", null] },
                        { $gte: ["$completedAt", "$createdAt"] },
                      ],
                    },
                    { $subtract: ["$completedAt", "$createdAt"] },
                    0,
                  ],
                },
              },
              completedWithCycleCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$completedAt", null] },
                        { $gte: ["$completedAt", "$createdAt"] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              createdInRange: {
                $sum: {
                  $cond: [{ $gte: ["$createdAt", startDate] }, 1, 0],
                },
              },
              completedInRange: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$completedAt", null] },
                        { $gte: ["$completedAt", startDate] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        createdBefore: [
          { $match: { createdAt: { $lt: startDate } } },
          { $count: "count" },
        ],
        completedBefore: [
          { $match: { completedAt: { $ne: null, $lt: startDate } } },
          { $count: "count" },
        ],
        createdDailyInRange: [
          { $match: { createdAt: { $gte: startDate, $lte: now } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "UTC",
                },
              },
              count: { $sum: 1 },
            },
          },
        ],
        completedDailyInRange: [
          {
            $match: {
              completedAt: { $ne: null, $gte: startDate, $lte: now },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$completedAt",
                  timezone: "UTC",
                },
              },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  // Extract status counts
  const statusCounts: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };
  (facetResult?.statusCounts || []).forEach(
    (item: { _id: TaskStatus; count: number }) => {
      if (item._id in statusCounts) {
        statusCounts[item._id] = item.count;
      }
    }
  );

  // Extract priority counts
  const priorityCounts: Record<TaskPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  (facetResult?.priorityCounts || []).forEach(
    (item: { _id: TaskPriority; count: number }) => {
      if (item._id in priorityCounts) {
        priorityCounts[item._id] = item.count;
      }
    }
  );

  // Extract KPIs
  const rawKpi = facetResult?.kpis?.[0] || {};
  const kpis = computeAnalyticsKPIs({
    total: rawKpi.total || 0,
    completed: rawKpi.completed || 0,
    inProgress: rawKpi.in_progress || 0,
    todo: rawKpi.todo || 0,
    review: rawKpi.review || 0,
    overdue: rawKpi.overdue || 0,
    totalCycleTimeMs: rawKpi.totalCycleTimeMs || 0,
    completedWithCycleCount: rawKpi.completedWithCycleCount || 0,
    createdInRange: rawKpi.createdInRange || 0,
    completedInRange: rawKpi.completedInRange || 0,
  });

  const statusBreakdown = computeStatusBreakdown(statusCounts, kpis.totalTasks);
  const priorityBreakdown = computePriorityBreakdown(
    priorityCounts,
    kpis.totalTasks
  );

  // Process Burndown and Weekly Trends
  const createdBefore = facetResult?.createdBefore?.[0]?.count || 0;
  const completedBefore = facetResult?.completedBefore?.[0]?.count || 0;

  const dailyCreatedMap = new Map<string, number>();
  (facetResult?.createdDailyInRange || []).forEach(
    (item: { _id: string; count: number }) => {
      if (item._id) dailyCreatedMap.set(item._id, item.count);
    }
  );

  const dailyCompletedMap = new Map<string, number>();
  (facetResult?.completedDailyInRange || []).forEach(
    (item: { _id: string; count: number }) => {
      if (item._id) dailyCompletedMap.set(item._id, item.count);
    }
  );

  const burndown = buildBurndownPoints({
    dailyCreatedMap,
    dailyCompletedMap,
    createdBefore,
    completedBefore,
    startDate,
    endDate: now,
  });

  const weeklyTrends = buildWeeklyTrendItems({
    dailyCreatedMap,
    dailyCompletedMap,
    startDate,
    endDate: now,
  });

  // 2. Member Workload Aggregation
  const memberWorkloadRaw = await Task.aggregate([
    { $match: { project: projectObjectId } },
    {
      $group: {
        _id: { assignee: "$assignee", status: "$status" },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id.assignee",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        assignee: "$_id.assignee",
        status: "$_id.status",
        count: "$count",
        name: { $ifNull: ["$user.name", "Unassigned"] },
        email: { $ifNull: ["$user.email", ""] },
      },
    },
  ]);

  // Load project to include any project members who currently have 0 tasks assigned
  const projectDoc = await Project.findById(projectObjectId, "owner members")
    .populate("owner", "name email")
    .populate("members", "name email")
    .lean();

  const workloadMap = new Map<string, MemberWorkloadItem>();

  // Seed project members into workload map
  if (projectDoc) {
    const owner = projectDoc.owner as { _id?: unknown; name?: string; email?: string } | null;
    if (owner?._id) {
      workloadMap.set(owner._id.toString(), {
        userId: owner._id.toString(),
        name: owner.name || "Owner",
        email: owner.email || "",
        todo: 0,
        in_progress: 0,
        review: 0,
        done: 0,
        total: 0,
      });
    }

    if (Array.isArray(projectDoc.members)) {
      for (const m of projectDoc.members as { _id?: unknown; name?: string; email?: string }[]) {
        if (m?._id) {
          const idStr = m._id.toString();
          if (!workloadMap.has(idStr)) {
            workloadMap.set(idStr, {
              userId: idStr,
              name: m.name || "Member",
              email: m.email || "",
              todo: 0,
              in_progress: 0,
              review: 0,
              done: 0,
              total: 0,
            });
          }
        }
      }
    }
  }

  // Populate counts from aggregation
  memberWorkloadRaw.forEach((row) => {
    const userId = row.assignee ? row.assignee.toString() : "unassigned";
    const name = row.name || (userId === "unassigned" ? "Unassigned" : "Member");
    const email = row.email || "";

    if (!workloadMap.has(userId)) {
      workloadMap.set(userId, {
        userId,
        name,
        email,
        todo: 0,
        in_progress: 0,
        review: 0,
        done: 0,
        total: 0,
      });
    }

    const item = workloadMap.get(userId)!;
    const status = row.status as TaskStatus;
    const count = Number(row.count) || 0;

    if (status === "todo") item.todo += count;
    else if (status === "in_progress") item.in_progress += count;
    else if (status === "review") item.review += count;
    else if (status === "done") item.done += count;

    item.total += count;
  });

  const memberWorkload = Array.from(workloadMap.values()).sort(
    (a, b) => b.total - a.total
  );

  // 3. Overdue Tasks Aggregation
  const overdueTasksRaw = await Task.aggregate([
    {
      $match: {
        project: projectObjectId,
        status: { $ne: "done" },
        dueDate: { $ne: null, $lt: now },
      },
    },
    { $sort: { dueDate: 1 } },
    { $limit: 20 },
    {
      $lookup: {
        from: "users",
        localField: "assignee",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        number: 1,
        title: 1,
        status: 1,
        priority: 1,
        dueDate: 1,
        assignee: {
          $cond: [
            { $ne: ["$user", null] },
            {
              _id: "$user._id",
              name: "$user.name",
              email: "$user.email",
            },
            null,
          ],
        },
      },
    },
  ]);

  const overdueTasks: OverdueTaskItem[] = overdueTasksRaw.map((t) => {
    const due = new Date(t.dueDate);
    return {
      _id: t._id.toString(),
      number: t.number,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: due.toISOString(),
      daysOverdue: computeDaysOverdue(due, now),
      assignee: t.assignee
        ? {
            _id: t.assignee._id.toString(),
            name: t.assignee.name || "Member",
            email: t.assignee.email || "",
          }
        : null,
    };
  });

  return {
    range,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    kpis,
    statusCounts,
    statusBreakdown,
    priorityCounts,
    priorityBreakdown,
    weeklyTrends,
    burndown,
    memberWorkload,
    overdueTasks,
  };
}

export function computeUserOnTimeRate(
  completedWithDueDateCount: number,
  onTimeCompletedCount: number
): number {
  if (completedWithDueDateCount <= 0) return 100;
  return Math.round((onTimeCompletedCount / completedWithDueDateCount) * 100);
}

export function computeGlobalKPIs(data: {
  projectsCount: number;
  activeProjectsCount: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}): GlobalAnalyticsKPIs {
  const completionRate =
    data.totalTasks > 0
      ? Math.round((data.completedTasks / data.totalTasks) * 100)
      : 0;

  return {
    totalProjects: data.projectsCount,
    activeProjects: data.activeProjectsCount,
    totalTasks: data.totalTasks,
    completedTasks: data.completedTasks,
    overdueTasks: data.overdueTasks,
    completionRate,
  };
}

export async function getGlobalAnalytics(
  userId: string,
  role: string
): Promise<GlobalAnalytics> {
  if (role !== "admin" && role !== "pm") {
    throw new Error("Access denied");
  }

  await connectDB();

  const now = new Date();
  const projectFilter =
    role === "admin"
      ? {}
      : { owner: new Types.ObjectId(userId) };

  const projectsDoc = await Project.find(projectFilter)
    .populate("owner", "name email")
    .sort({ name: 1 })
    .lean();

  if (projectsDoc.length === 0) {
    return {
      kpis: {
        totalProjects: 0,
        activeProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
      },
      projects: [],
      tasksPerProject: [],
      mostActiveMembers: [],
    };
  }

  const projectIds = projectsDoc.map((p) => p._id);

  // Per-project task metrics via MongoDB aggregation (no tasks loaded in memory)
  const projectMetricsRaw = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: {
          project: "$project",
          status: "$status",
        },
        count: { $sum: 1 },
        overdueCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "done"] },
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", now] },
                ],
              },
              1,
              0,
            ],
          },
        },
        maxUpdatedAt: { $max: "$updatedAt" },
        maxCreatedAt: { $max: "$createdAt" },
      },
    },
  ]);

  const projectMetricsMap = new Map<
    string,
    {
      todo: number;
      in_progress: number;
      review: number;
      done: number;
      total: number;
      overdue: number;
      lastActivityDate: Date | null;
    }
  >();

  for (const pid of projectIds) {
    projectMetricsMap.set(pid.toString(), {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      total: 0,
      overdue: 0,
      lastActivityDate: null,
    });
  }

  for (const row of projectMetricsRaw) {
    const pid = row._id.project.toString();
    const metric = projectMetricsMap.get(pid);
    if (!metric) continue;

    const status = row._id.status as TaskStatus;
    const count = Number(row.count) || 0;
    const overdue = Number(row.overdueCount) || 0;

    if (status === "todo") metric.todo += count;
    else if (status === "in_progress") metric.in_progress += count;
    else if (status === "review") metric.review += count;
    else if (status === "done") metric.done += count;

    metric.total += count;
    metric.overdue += overdue;

    const latestDate = row.maxUpdatedAt
      ? new Date(row.maxUpdatedAt)
      : row.maxCreatedAt
      ? new Date(row.maxCreatedAt)
      : null;

    if (latestDate) {
      if (!metric.lastActivityDate || latestDate > metric.lastActivityDate) {
        metric.lastActivityDate = latestDate;
      }
    }
  }

  let totalTasksAll = 0;
  let completedTasksAll = 0;
  let overdueTasksAll = 0;

  const projectHealthItems: ProjectHealthItem[] = projectsDoc.map((p) => {
    const pid = p._id.toString();
    const metric = projectMetricsMap.get(pid)!;
    const ownerObj = p.owner as unknown as { _id?: unknown; name?: string; email?: string } | null;

    totalTasksAll += metric.total;
    completedTasksAll += metric.done;
    overdueTasksAll += metric.overdue;

    const projectUpdated = p.updatedAt ? new Date(p.updatedAt) : null;
    const effectiveLastActivity =
      metric.lastActivityDate && projectUpdated
        ? metric.lastActivityDate > projectUpdated
          ? metric.lastActivityDate
          : projectUpdated
        : metric.lastActivityDate || projectUpdated;

    const completionRate =
      metric.total > 0 ? Math.round((metric.done / metric.total) * 100) : 0;

    return {
      id: pid,
      name: p.name,
      key: p.key,
      color: p.color,
      status: p.status,
      owner: {
        id: ownerObj?._id?.toString() || "",
        name: ownerObj?.name || "Unassigned",
        email: ownerObj?.email || "",
      },
      totalTasks: metric.total,
      completedTasks: metric.done,
      inProgressTasks: metric.in_progress,
      overdueTasks: metric.overdue,
      completionRate,
      lastActivityAt: effectiveLastActivity
        ? effectiveLastActivity.toISOString()
        : null,
    };
  });

  const tasksPerProject: ProjectTaskDistribution[] = projectHealthItems.map(
    (p) => {
      const metric = projectMetricsMap.get(p.id)!;
      return {
        id: p.id,
        name: p.name,
        key: p.key,
        color: p.color,
        todo: metric.todo,
        in_progress: metric.in_progress,
        review: metric.review,
        done: metric.done,
        total: metric.total,
        completionRate: p.completionRate,
      };
    }
  );

  // Most Active Members via MongoDB aggregation
  const activeMembersRaw = await Task.aggregate([
    {
      $match: {
        project: { $in: projectIds },
        assignee: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$assignee",
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", "done"] }, 1, 0],
          },
        },
        inProgressTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0],
          },
        },
      },
    },
    { $sort: { totalTasks: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        totalTasks: 1,
        completedTasks: 1,
        inProgressTasks: 1,
        name: "$user.name",
        email: "$user.email",
      },
    },
  ]);

  const mostActiveMembers: ActiveMemberItem[] = activeMembersRaw.map((m) => {
    const total = Number(m.totalTasks) || 0;
    const completed = Number(m.completedTasks) || 0;
    const inProgress = Number(m.inProgressTasks) || 0;
    return {
      id: m._id.toString(),
      name: m.name || "Team Member",
      email: m.email || "",
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const activeProjectsCount = projectsDoc.filter(
    (p) => p.status === "active"
  ).length;

  const kpis = computeGlobalKPIs({
    projectsCount: projectsDoc.length,
    activeProjectsCount,
    totalTasks: totalTasksAll,
    completedTasks: completedTasksAll,
    overdueTasks: overdueTasksAll,
  });

  return {
    kpis,
    projects: projectHealthItems,
    tasksPerProject,
    mostActiveMembers,
  };
}

export async function getUserPersonalStats(
  userId: string,
  nowDate: Date = new Date()
): Promise<UserPersonalStats> {
  await connectDB();

  const userObjectId = new Types.ObjectId(userId);

  // Find all projects the user belongs to (member or owner)
  const accessibleProjects = await Project.find(
    { $or: [{ owner: userObjectId }, { members: userObjectId }] },
    "_id"
  ).lean();

  if (accessibleProjects.length === 0) {
    return {
      totalAssigned: 0,
      completedTasks: 0,
      activeTasks: 0,
      overdueTasks: 0,
      completionRate: 0,
      onTimeRate: 100,
      onTimeCompletedCount: 0,
      completedWithDueDateCount: 0,
      weeklyCompleted: [],
    };
  }

  const projectIds = accessibleProjects.map((p) => p._id);

  // Task metrics via MongoDB aggregation
  const taskStatsRaw = await Task.aggregate([
    {
      $match: {
        assignee: userObjectId,
        project: { $in: projectIds },
      },
    },
    {
      $group: {
        _id: null,
        totalAssigned: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
        },
        activeTasks: {
          $sum: { $cond: [{ $ne: ["$status", "done"] }, 1, 0] },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "done"] },
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", nowDate] },
                ],
              },
              1,
              0,
            ],
          },
        },
        completedWithDueDateCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "done"] },
                  { $ne: ["$dueDate", null] },
                ],
              },
              1,
              0,
            ],
          },
        },
        onTimeCompletedCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "done"] },
                  { $ne: ["$dueDate", null] },
                  {
                    $lte: [
                      { $ifNull: ["$completedAt", "$updatedAt"] },
                      "$dueDate",
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const stats = taskStatsRaw[0] || {
    totalAssigned: 0,
    completedTasks: 0,
    activeTasks: 0,
    overdueTasks: 0,
    completedWithDueDateCount: 0,
    onTimeCompletedCount: 0,
  };

  const totalAssigned = Number(stats.totalAssigned) || 0;
  const completedTasks = Number(stats.completedTasks) || 0;
  const activeTasks = Number(stats.activeTasks) || 0;
  const overdueTasks = Number(stats.overdueTasks) || 0;
  const completedWithDueDateCount = Number(stats.completedWithDueDateCount) || 0;
  const onTimeCompletedCount = Number(stats.onTimeCompletedCount) || 0;

  const completionRate =
    totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0;

  const onTimeRate = computeUserOnTimeRate(
    completedWithDueDateCount,
    onTimeCompletedCount
  );

  // Weekly completion trend (last 4 weeks)
  const weeklyBuckets: {
    weekLabel: string;
    startDate: string;
    endDate: string;
    start: Date;
    end: Date;
  }[] = [];

  for (let i = 3; i >= 0; i--) {
    const end = new Date(nowDate.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const label = `W-${4 - i}`;
    weeklyBuckets.push({
      weekLabel: label,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      start,
      end,
    });
  }

  const fourWeeksAgo = weeklyBuckets[0].start;

  const recentCompletedRaw = await Task.aggregate([
    {
      $match: {
        assignee: userObjectId,
        project: { $in: projectIds },
        status: "done",
        $or: [
          { completedAt: { $gte: fourWeeksAgo } },
          { updatedAt: { $gte: fourWeeksAgo } },
        ],
      },
    },
    {
      $project: {
        effectiveCompletedAt: { $ifNull: ["$completedAt", "$updatedAt"] },
      },
    },
  ]);

  const weeklyCompleted = weeklyBuckets.map((bucket) => {
    const count = recentCompletedRaw.filter((t) => {
      const d = new Date(t.effectiveCompletedAt);
      return d >= bucket.start && d < bucket.end;
    }).length;

    return {
      weekLabel: bucket.weekLabel,
      startDate: bucket.startDate,
      endDate: bucket.endDate,
      completed: count,
    };
  });

  return {
    totalAssigned,
    completedTasks,
    activeTasks,
    overdueTasks,
    completionRate,
    onTimeRate,
    onTimeCompletedCount,
    completedWithDueDateCount,
    weeklyCompleted,
  };
}
