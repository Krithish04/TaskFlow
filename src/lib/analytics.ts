import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Task, type TaskStatus, type TaskPriority } from "@/models/Task";
import { Project } from "@/models/Project";
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
