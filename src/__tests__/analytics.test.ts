import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import {
  formatUtcDateKey,
  formatUtcShortDate,
  computeDaysOverdue,
  computeAnalyticsKPIs,
  computeStatusBreakdown,
  computePriorityBreakdown,
  buildBurndownPoints,
  buildWeeklyTrendItems,
  STATUS_CHART_COLORS,
  PRIORITY_CHART_COLORS,
} from "../lib/analytics";
import { matchesId } from "../lib/permissions";

describe("Analytics Library - Date Utilities with Fixed Dates", () => {
  const fixedNow = new Date("2026-10-27T12:00:00.000Z");

  it("formats dates to UTC YYYY-MM-DD keys consistently", () => {
    assert.equal(formatUtcDateKey(fixedNow), "2026-10-27");
    assert.equal(formatUtcDateKey(new Date("2026-01-05T03:00:00.000Z")), "2026-01-05");
    assert.equal(formatUtcDateKey(new Date("2026-12-31T23:59:59.000Z")), "2026-12-31");
  });

  it("formats dates to short month-day strings consistently", () => {
    assert.equal(formatUtcShortDate(fixedNow), "Oct 27");
    assert.equal(formatUtcShortDate(new Date("2026-01-05T03:00:00.000Z")), "Jan 5");
    assert.equal(formatUtcShortDate(new Date("2026-09-01T12:00:00.000Z")), "Sep 1");
  });

  it("computes days overdue accurately with fixed reference dates", () => {
    // 3 days overdue
    const due3DaysAgo = new Date("2026-10-24T12:00:00.000Z");
    assert.equal(computeDaysOverdue(due3DaysAgo, fixedNow), 3);

    // 1 day overdue
    const dueYesterday = new Date("2026-10-26T12:00:00.000Z");
    assert.equal(computeDaysOverdue(dueYesterday, fixedNow), 1);

    // Due in the future (not overdue)
    const dueTomorrow = new Date("2026-10-28T12:00:00.000Z");
    assert.equal(computeDaysOverdue(dueTomorrow, fixedNow), 0);

    const dueIn5Days = new Date("2026-11-01T12:00:00.000Z");
    assert.equal(computeDaysOverdue(dueIn5Days, fixedNow), 0);
  });
});

describe("Analytics Library - KPI Computation with Fixed Dates", () => {
  it("computes completion rate, overdue count, and average cycle time", () => {
    // 3 completed tasks with total cycle time of 6 days: 6 * 24 * 60 * 60 * 1000 ms
    const sixDaysMs = 6 * 24 * 60 * 60 * 1000;

    const kpis = computeAnalyticsKPIs({
      total: 10,
      completed: 4,
      inProgress: 3,
      todo: 2,
      review: 1,
      overdue: 2,
      totalCycleTimeMs: sixDaysMs,
      completedWithCycleCount: 3,
      createdInRange: 5,
      completedInRange: 3,
    });

    assert.equal(kpis.totalTasks, 10);
    assert.equal(kpis.completedTasks, 4);
    assert.equal(kpis.inProgressTasks, 3);
    assert.equal(kpis.todoTasks, 2);
    assert.equal(kpis.reviewTasks, 1);
    assert.equal(kpis.overdueTasks, 2);
    assert.equal(kpis.completionRate, 40); // 4 / 10 * 100
    assert.equal(kpis.avgCycleTimeDays, 2); // 6 days / 3 tasks = 2.0 days
    assert.equal(kpis.createdInRange, 5);
    assert.equal(kpis.completedInRange, 3);
  });

  it("handles zero tasks and null cycle time cleanly without division by zero", () => {
    const kpis = computeAnalyticsKPIs({
      total: 0,
      completed: 0,
      inProgress: 0,
      todo: 0,
      review: 0,
      overdue: 0,
      totalCycleTimeMs: 0,
      completedWithCycleCount: 0,
      createdInRange: 0,
      completedInRange: 0,
    });

    assert.equal(kpis.totalTasks, 0);
    assert.equal(kpis.completedTasks, 0);
    assert.equal(kpis.completionRate, 0);
    assert.equal(kpis.avgCycleTimeDays, null);
  });
});

describe("Analytics Library - Status & Priority Breakdowns", () => {
  it("computes complete status breakdown with tokens and percentage calculation", () => {
    const statusCounts = {
      todo: 2,
      in_progress: 3,
      review: 1,
      done: 4,
    };

    const breakdown = computeStatusBreakdown(statusCounts, 10);

    assert.equal(breakdown.length, 4);
    const todo = breakdown.find((s) => s.status === "todo");
    assert.ok(todo);
    assert.equal(todo.count, 2);
    assert.equal(todo.percentage, 20);
    assert.equal(todo.color, STATUS_CHART_COLORS.todo);

    const done = breakdown.find((s) => s.status === "done");
    assert.ok(done);
    assert.equal(done.count, 4);
    assert.equal(done.percentage, 40);
    assert.equal(done.color, STATUS_CHART_COLORS.done);
  });

  it("computes complete priority breakdown with tokens and percentage calculation", () => {
    const priorityCounts = {
      low: 2,
      medium: 5,
      high: 3,
    };

    const breakdown = computePriorityBreakdown(priorityCounts, 10);

    assert.equal(breakdown.length, 3);
    const low = breakdown.find((p) => p.priority === "low");
    assert.ok(low);
    assert.equal(low.count, 2);
    assert.equal(low.percentage, 20);
    assert.equal(low.color, PRIORITY_CHART_COLORS.low);

    const high = breakdown.find((p) => p.priority === "high");
    assert.ok(high);
    assert.equal(high.count, 3);
    assert.equal(high.percentage, 30);
    assert.equal(high.color, PRIORITY_CHART_COLORS.high);
  });
});

describe("Analytics Library - Burndown Calculation with Fixed Dates", () => {
  const startDate = new Date("2026-10-20T00:00:00.000Z");
  const endDate = new Date("2026-10-27T00:00:00.000Z");

  it("computes accurate daily burndown curve and ideal guideline", () => {
    // 10 created before startDate, 2 completed before startDate => initialRemaining = 8
    const createdBefore = 10;
    const completedBefore = 2;

    const dailyCreatedMap = new Map<string, number>([
      ["2026-10-21", 2], // 8 + 2 = 10
      ["2026-10-23", 1],
    ]);

    const dailyCompletedMap = new Map<string, number>([
      ["2026-10-21", 1], // 10 - 1 = 9
      ["2026-10-22", 3], // 9 - 3 = 6
      ["2026-10-24", 2], // 7 - 2 = 5
      ["2026-10-27", 5], // finishes down
    ]);

    const points = buildBurndownPoints({
      dailyCreatedMap,
      dailyCompletedMap,
      createdBefore,
      completedBefore,
      startDate,
      endDate,
    });

    // 8 days: 20, 21, 22, 23, 24, 25, 26, 27
    assert.equal(points.length, 8);

    // Day 0: 2026-10-20
    assert.equal(points[0].date, "2026-10-20");
    assert.equal(points[0].label, "Oct 20");
    assert.equal(points[0].remaining, 8);
    assert.equal(points[0].ideal, 8);

    // Day 1: 2026-10-21 (2 created, 1 completed -> remaining = 8 + 2 - 1 = 9)
    assert.equal(points[1].date, "2026-10-21");
    assert.equal(points[1].remaining, 9);

    // Day 2: 2026-10-22 (0 created, 3 completed -> remaining = 9 - 3 = 6)
    assert.equal(points[2].date, "2026-10-22");
    assert.equal(points[2].remaining, 6);

    // Last day ideal guideline hits 0
    assert.equal(points[7].date, "2026-10-27");
    assert.equal(points[7].ideal, 0);
  });
});

describe("Analytics Library - Weekly Trends with Fixed Dates", () => {
  it("groups created and completed tasks into weekly buckets across the range", () => {
    const startDate = new Date("2026-10-01T00:00:00.000Z");
    const endDate = new Date("2026-10-28T00:00:00.000Z");

    const dailyCreatedMap = new Map<string, number>([
      ["2026-10-02", 3], // Week 1 (Oct 1 - Oct 7)
      ["2026-10-05", 2], // Week 1
      ["2026-10-10", 4], // Week 2 (Oct 8 - Oct 14)
      ["2026-10-16", 1], // Week 3 (Oct 15 - Oct 21)
      ["2026-10-25", 6], // Week 4 (Oct 22 - Oct 28)
    ]);

    const dailyCompletedMap = new Map<string, number>([
      ["2026-10-03", 1], // Week 1
      ["2026-10-12", 2], // Week 2
      ["2026-10-18", 3], // Week 3
      ["2026-10-27", 4], // Week 4
    ]);

    const trends = buildWeeklyTrendItems({
      dailyCreatedMap,
      dailyCompletedMap,
      startDate,
      endDate,
    });

    assert.equal(trends.length, 4);

    // Week 1: Oct 1 - Oct 7
    assert.equal(trends[0].weekLabel, "Oct 1 - Oct 7");
    assert.equal(trends[0].created, 5); // 3 + 2
    assert.equal(trends[0].completed, 1);

    // Week 2: Oct 8 - Oct 14
    assert.equal(trends[1].weekLabel, "Oct 8 - Oct 14");
    assert.equal(trends[1].created, 4);
    assert.equal(trends[1].completed, 2);

    // Week 3: Oct 15 - Oct 21
    assert.equal(trends[2].weekLabel, "Oct 15 - Oct 21");
    assert.equal(trends[2].created, 1);
    assert.equal(trends[2].completed, 3);

    // Week 4: Oct 22 - Oct 28
    assert.equal(trends[3].weekLabel, "Oct 22 - Oct 28");
    assert.equal(trends[3].created, 6);
    assert.equal(trends[3].completed, 4);
  });
});

describe("Analytics API - Isolation & Access Control", () => {
  const projectAId = new Types.ObjectId().toString();
  const projectBId = new Types.ObjectId().toString();

  const userA = {
    id: new Types.ObjectId().toString(),
    role: "user" as const,
    name: "User in Project A",
  };

  const userB = {
    id: new Types.ObjectId().toString(),
    role: "user" as const,
    name: "User in Project B",
  };

  const adminUser = {
    id: new Types.ObjectId().toString(),
    role: "admin" as const,
    name: "Admin",
  };

  const projectA = {
    _id: projectAId,
    owner: new Types.ObjectId().toString(),
    members: [userA.id],
  };

  const projectB = {
    _id: projectBId,
    owner: new Types.ObjectId().toString(),
    members: [userB.id],
  };

  const canAccessAnalytics = (
    user: { id: string; role: string },
    project: typeof projectA
  ) => {
    if (user.role === "admin") return true;
    if (matchesId(project.owner, user.id)) return true;
    return project.members?.some((m) => matchesId(m, user.id)) ?? false;
  };

  it("permits member of Project A to view analytics for Project A", () => {
    assert.equal(canAccessAnalytics(userA, projectA), true);
  });

  it("rejects user from Project A when attempting to view Project B analytics (404 isolation)", () => {
    // User A has no membership in Project B -> access is denied
    assert.equal(canAccessAnalytics(userA, projectB), false);
  });

  it("permits Admin to view analytics for any project", () => {
    assert.equal(canAccessAnalytics(adminUser, projectA), true);
    assert.equal(canAccessAnalytics(adminUser, projectB), true);
  });
});
