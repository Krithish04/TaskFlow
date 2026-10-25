import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { streamText } from "ai";
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

const MAX_ASSISTANT_REQUEST_BYTES = 32 * 1024; // 32KB cap

const MAX_USER_MESSAGE_CHARS = 2000;
const MAX_ASSISTANT_MESSAGE_CHARS = 8000;

const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1, "Message content cannot be empty"),
  })
  .refine(
    (m) =>
      m.content.length <=
      (m.role === "user" ? MAX_USER_MESSAGE_CHARS : MAX_ASSISTANT_MESSAGE_CHARS),
    { message: "Message content exceeds maximum allowed length" }
  );

const assistantRequestSchema = z.object({
  projectId: z.string().trim().min(1, "Project ID is required"),
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required")
    .max(30, "Conversation history cannot exceed 30 messages"),
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
  const rawBody = await readBoundedBody(request, MAX_ASSISTANT_REQUEST_BYTES);
  if (rawBody === null) {
    return NextResponse.json(
      { error: "Request body too large (maximum 32KB allowed)" },
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

  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid assistant request" },
      { status: 400 }
    );
  }

  const { projectId, messages } = parsed.data;

  if (!Types.ObjectId.isValid(projectId)) {
    return NextResponse.json(
      { error: "Invalid Project ID format" },
      { status: 400 }
    );
  }

  // Role and Project View Permission Enforcement
  let user;
  let project;
  try {
    user = await requireRole(["admin", "pm", "user"]);
    await requireAIPermission("assistant", user);
    const access = await requireProjectAccess(projectId, "view", user);
    project = access.project;
  } catch (err) {
    return (
      handleAuthError(err) ??
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }

  // Rate Limiting
  const rateLimitResponse = requireAIRateLimit(user.id);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Fetch real project task data
  let tasks;
  try {
    await connectDB();
    tasks = await Task.find({ project: project._id })
      .populate("assignee", "name email")
      .sort({ status: 1, order: 1 })
      .lean();
  } catch {
    return NextResponse.json(
      { error: "Failed to load project task data" },
      { status: 500 }
    );
  }

  const now = new Date();
  const nowStr = now.toISOString().split("T")[0];

  const statusCounts: Record<string, number> = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };

  const priorityCounts: Record<string, number> = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const overdueTasks: Array<{
    title: string;
    assignee: string;
    dueDate: string;
    status: string;
    priority: string;
  }> = [];

  const workloadMap: Record<
    string,
    { name: string; email: string; activeCount: number; tasks: string[] }
  > = {};

  for (const t of tasks) {
    const st = t.status || "todo";
    statusCounts[st] = (statusCounts[st] || 0) + 1;

    const pri = t.priority || "medium";
    priorityCounts[pri] = (priorityCounts[pri] || 0) + 1;

    const assigneeObj = t.assignee as unknown as {
      name?: string;
      email?: string;
    } | null;
    const assigneeName = assigneeObj?.name || "Unassigned";
    const assigneeEmail = assigneeObj?.email || "";

    const isOverdue = Boolean(t.dueDate && new Date(t.dueDate) < now && st !== "done");
    if (isOverdue && t.dueDate) {
      overdueTasks.push({
        title: t.title,
        assignee: assigneeName,
        dueDate: new Date(t.dueDate).toISOString().split("T")[0],
        status: st,
        priority: pri,
      });
    }

    if (st !== "done") {
      const key = assigneeEmail || assigneeName;
      if (!workloadMap[key]) {
        workloadMap[key] = {
          name: assigneeName,
          email: assigneeEmail,
          activeCount: 0,
          tasks: [],
        };
      }
      workloadMap[key].activeCount++;
      if (workloadMap[key].tasks.length < 5) {
        workloadMap[key].tasks.push(t.title);
      }
    }
  }

  const workloads = Object.values(workloadMap).sort(
    (a, b) => b.activeCount - a.activeCount
  );
  const workloadSummary =
    workloads.length > 0
      ? workloads
          .map(
            (w) =>
              `- ${w.name}: ${w.activeCount} active task(s) (${w.tasks.join(", ")}${
                w.activeCount > 5 ? ", ..." : ""
              })`
          )
          .join("\n")
      : "No active assigned tasks.";

  const overdueSummary =
    overdueTasks.length > 0
      ? overdueTasks
          .map(
            (o) =>
              `- "${o.title}" (Assignee: ${o.assignee}, Due: ${o.dueDate}, Status: ${o.status}, Priority: ${o.priority})`
          )
          .join("\n")
      : "No tasks are currently overdue.";

  // Format detailed task inventory with a character budget guard
  const MAX_TASK_CHARS = 12000;
  let taskListText = "";
  let truncatedCount = 0;

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const assigneeObj = t.assignee as unknown as {
      name?: string;
      email?: string;
    } | null;
    const assigneeName = assigneeObj?.name || "Unassigned";
    const dueDateStr = t.dueDate
      ? new Date(t.dueDate).toISOString().split("T")[0]
      : "None";
    const isOverdue =
      t.dueDate && new Date(t.dueDate) < now && t.status !== "done";

    const line = `- [${t.status.toUpperCase()}] "${t.title}" | Priority: ${
      t.priority
    } | Assignee: ${assigneeName} | Due: ${dueDateStr}${
      isOverdue ? " (OVERDUE)" : ""
    }\n`;

    if (taskListText.length + line.length > MAX_TASK_CHARS) {
      truncatedCount = tasks.length - i;
      break;
    }
    taskListText += line;
  }

  if (truncatedCount > 0) {
    taskListText += `\n[Note: Showing ${
      tasks.length - truncatedCount
    } of ${tasks.length} total tasks due to length constraints]\n`;
  }

  const systemPrompt = `You are TaskFlow AI, an intelligent, helpful, and read-only project management assistant.
You answer questions about the project "${project.name}" using its real-time task and project data.
Today's date is ${nowStr}.

PROJECT DETAILS:
- Name: ${project.name}
- Status: ${project.status}
- Description: ${project.description || "No description provided."}

REAL-TIME TASK METRICS:
- Total Tasks: ${tasks.length}
- Status Breakdown: To Do: ${statusCounts.todo}, In Progress: ${
    statusCounts.in_progress
  }, Review: ${statusCounts.review}, Done: ${statusCounts.done}
- Priority Breakdown: Urgent: ${priorityCounts.urgent || 0}, High: ${
    priorityCounts.high
  }, Medium: ${priorityCounts.medium}, Low: ${priorityCounts.low}
- Overdue Tasks Count: ${overdueTasks.length}

OVERDUE TASKS:
${overdueSummary}

TEAM WORKLOAD BREAKDOWN (Active, non-done tasks):
${workloadSummary}

DETAILED TASK INVENTORY:
${taskListText || "No tasks exist in this project yet."}

RULES AND BEHAVIOR:
1. STRICTLY READ-ONLY: You provide analysis, answers, workload evaluations, overdue alerts, and summaries. You CANNOT create, update, reassign, or delete tasks in the database. If asked to make changes, state clearly that you are a read-only assistant and guide the user on how to make changes on the Kanban board.
2. ANSWER ACCURACY: Base your answers directly and truthfully on the real project data above. If a user asks who is overloaded, analyze the team workload list and highlight those with the highest count of active or overdue tasks. If asked which tasks are overdue, list the specific overdue tasks with due dates and assignees.
3. CONCISENESS & FORMATTING: Use Markdown with bullet points, bold text, and clean formatting for readability.
4. SCOPE: If asked about things outside of this project, remind the user that you are an assistant dedicated to this specific project.`;

  try {
    const result = streamText({
      model: getAIModel(),
      system: systemPrompt,
      messages,
      onError({ error }) {
        console.error("AI Assistant stream error:", error);
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleAIError(err);
  }
}
