import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { generateText } from "ai";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import {
  requireRole,
  requireProjectAccess,
  requireAIPermission,
  handleAuthError,
} from "@/lib/permissions";
import {
  getAIModel,
  handleAIError,
  requireAIRateLimit,
} from "@/lib/ai/provider";

const MAX_WEEKLY_REPORT_REQUEST_BYTES = 16 * 1024;

const weeklyReportRequestSchema = z.object({
  projectId: z.string().trim().min(1, "Project ID is required"),
});

async function readBoundedBody(
  request: NextRequest,
  limit: number
): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > limit) {
    return null;
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

export async function POST(request: NextRequest) {
  const rawBody = await readBoundedBody(request, MAX_WEEKLY_REPORT_REQUEST_BYTES);
  if (rawBody === null) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = weeklyReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { projectId } = parsed.data;

  if (!Types.ObjectId.isValid(projectId)) {
    return NextResponse.json(
      { error: "Invalid project ID" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // 1. Verify user is authenticated as Admin or PM
    const user = await requireRole(["admin", "pm"]);

    // 2. Enforce AI feature permission for weekly-report
    await requireAIPermission("weekly-report", user);

    // 3. Enforce project access (user must be owner or admin to generate report)
    const { project } = await requireProjectAccess(projectId, "edit", user);

    // 4. Enforce per-user AI rate limit
    const rateLimitResponse = requireAIRateLimit(user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 5. Fetch project tasks with assignee details
    const tasks = await Task.find({ project: projectId })
      .populate("assignee", "name email role")
      .sort({ status: 1, dueDate: 1 })
      .lean();

    const now = new Date();
    const nowTime = now.getTime();
    const currentDateStr = now.toISOString().split("T")[0];

    const doneTasks = tasks.filter((t) => t.status === "done");
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
    const reviewTasks = tasks.filter((t) => t.status === "review");
    const todoTasks = tasks.filter((t) => t.status === "todo");

    const overdueTasks = tasks.filter(
      (t) =>
        t.status !== "done" &&
        t.dueDate &&
        new Date(t.dueDate).getTime() < nowTime
    );

    const atRiskTasks = tasks.filter((t) => {
      if (t.status === "done") return false;
      const isOverdue = t.dueDate && new Date(t.dueDate).getTime() < nowTime;
      const isHighPriority = t.priority === "high";
      const isDueSoon =
        t.dueDate &&
        new Date(t.dueDate).getTime() - nowTime <= 3 * 24 * 60 * 60 * 1000 &&
        new Date(t.dueDate).getTime() >= nowTime;
      return isOverdue || isHighPriority || isDueSoon;
    });

    // Workload breakdown
    const workloadMap = new Map<string, number>();
    tasks.forEach((t) => {
      const assigneeObj = t.assignee as unknown as { name?: string } | null;
      const name = assigneeObj?.name || "Unassigned";
      workloadMap.set(name, (workloadMap.get(name) || 0) + 1);
    });

    const workloadLines = Array.from(workloadMap.entries())
      .map(([name, count]) => `- ${name}: ${count} task${count === 1 ? "" : "s"}`)
      .join("\n");

    const MAX_TASK_DETAILS_BUDGET_CHARS = 12000;
    let currentTaskDetailsChars = 0;
    let omittedTaskCount = 0;
    const taskSummaryLines: string[] = [];

    for (const t of tasks) {
      const assigneeObj = t.assignee as unknown as { name?: string } | null;
      const assigneeName = assigneeObj?.name || "Unassigned";
      const dueStr = t.dueDate
        ? new Date(t.dueDate).toISOString().split("T")[0]
        : "No due date";
      const isOverdue =
        t.status !== "done" &&
        t.dueDate &&
        new Date(t.dueDate).getTime() < nowTime;
      const line = `- [${t.status.toUpperCase()}] "${t.title.slice(0, 100)}" | Priority: ${t.priority} | Assignee: ${assigneeName} | Due: ${dueStr}${
        isOverdue ? " (OVERDUE)" : ""
      }`;

      if (currentTaskDetailsChars + line.length > MAX_TASK_DETAILS_BUDGET_CHARS) {
        omittedTaskCount++;
      } else {
        taskSummaryLines.push(line);
        currentTaskDetailsChars += line.length + 1;
      }
    }

    if (omittedTaskCount > 0) {
      taskSummaryLines.push(
        `... and ${omittedTaskCount} additional task(s) omitted from individual listing but accounted for in statistics.`
      );
    }

    const tasksSummaryText = taskSummaryLines.join("\n");

    const prompt = `You are an executive project management AI assistant generating a weekly status report for a project manager.

Project Name: "${project.name.slice(0, 120)}"
Project Description: "${(project.description || "No description provided.").slice(0, 1000)}"
Report Date: ${currentDateStr}

Key Statistics:
- Total Tasks: ${tasks.length}
- Done: ${doneTasks.length}
- In Progress: ${inProgressTasks.length}
- In Review: ${reviewTasks.length}
- To Do: ${todoTasks.length}
- Overdue: ${overdueTasks.length}
- At Risk: ${atRiskTasks.length}

Member Workload:
${workloadLines || "No members assigned."}

Task Details:
${tasksSummaryText || "No tasks recorded."}

Instructions:
Generate a structured, professional weekly status report in markdown format. You must cover:
1. Executive Summary: High-level overview of project health, momentum, and completion percentage.
2. Accomplishments (Done): Key items completed.
3. In-Progress & Active Focus: Work currently underway and in review.
4. Overdue & At-Risk Items: Specifically highlight tasks that are overdue or critical high-priority items needing immediate attention.
5. Workload & Team Allocation: Observations on task distribution across members.
6. PM Recommendations: 2-4 concrete next actions for the project manager.

Keep the report actionable, clear, and well-organized with standard markdown headings.`;

    let result;
    try {
      result = await generateText({
        model: getAIModel(),
        prompt,
      });
    } catch (aiError) {
      return handleAIError(aiError);
    }

    return NextResponse.json({
      report: result.text.trim(),
      generatedAt: new Date().toISOString(),
      stats: {
        total: tasks.length,
        done: doneTasks.length,
        inProgress: inProgressTasks.length,
        review: reviewTasks.length,
        todo: todoTasks.length,
        overdue: overdueTasks.length,
        atRisk: atRiskTasks.length,
      },
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error("weekly-report failed:", error);
    return NextResponse.json(
      { error: "Failed to generate weekly report" },
      { status: 500 }
    );
  }
}
