import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { generateObject } from "ai";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
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

const MAX_CREATE_TASK_REQUEST_BYTES = 16 * 1024;

const createTaskRequestSchema = z.object({
  projectId: z.string().trim().min(1, "Project ID is required"),
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required")
    .max(1000, "Prompt must not exceed 1000 characters"),
});

export const draftTaskAISchema = z.object({
  title: z
    .string()
    .describe("Clear, concise task title (under 100 characters)"),
  description: z
    .string()
    .describe("Detailed description of the task based on the user request"),
  priority: z
    .enum(["low", "medium", "high"])
    .describe("Task priority: low, medium, or high"),
  status: z
    .enum(["todo", "in_progress", "review", "done"])
    .default("todo")
    .describe("Initial task status, default is todo"),
  assigneeId: z
    .string()
    .nullable()
    .describe("ID of the matched assignee from the candidate list, or null if not specified"),
  assigneeName: z
    .string()
    .nullable()
    .describe("Name of the person if mentioned in the prompt, or null"),
  dueDate: z
    .string()
    .nullable()
    .describe("Target due date in YYYY-MM-DD format if mentioned, or null"),
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
  const rawBody = await readBoundedBody(request, MAX_CREATE_TASK_REQUEST_BYTES);
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

  const parsed = createTaskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { projectId, prompt } = parsed.data;

  if (!Types.ObjectId.isValid(projectId)) {
    return NextResponse.json(
      { error: "Invalid project ID" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // 1. Verify user is authenticated and is Admin or PM
    const user = await requireRole(["admin", "pm"]);

    // 2. Enforce AI feature permission for create-task
    await requireAIPermission("create-task", user);

    // 3. Enforce project access (user must be project owner or admin to create tasks)
    const { project } = await requireProjectAccess(projectId, "edit", user);

    // 4. Enforce per-user AI rate limit
    const rateLimitResponse = requireAIRateLimit(user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 5. Fetch project with populated members to provide candidates for assignee matching
    const projectDoc = await Project.findById(projectId)
      .populate("owner", "name email role")
      .populate("members", "name email role")
      .lean();

    const ownerObj = projectDoc?.owner as unknown as {
      _id?: unknown;
      name?: string;
      email?: string;
    } | null;

    const membersArr = Array.isArray(projectDoc?.members)
      ? (projectDoc.members as unknown as {
          _id?: unknown;
          name?: string;
          email?: string;
        }[])
      : [];

    const candidateMembers: { id: string; name: string; email: string }[] = [];
    if (ownerObj?._id) {
      candidateMembers.push({
        id: ownerObj._id.toString(),
        name: ownerObj.name || "Owner",
        email: ownerObj.email || "",
      });
    }

    membersArr.forEach((m) => {
      if (m._id) {
        const idStr = m._id.toString();
        if (!candidateMembers.some((c) => c.id === idStr)) {
          candidateMembers.push({
            id: idStr,
            name: m.name || "",
            email: m.email || "",
          });
        }
      }
    });

    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0];
    const currentDayName = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const systemPrompt = `You are an expert technical project management assistant.
Extract and draft a single structured task from the user's natural language request.

Project Context:
- Project Name: "${project.name}"
- Current Reference Date: ${currentDateStr} (${currentDayName})

Available Project Members for Assignment:
${
  candidateMembers.length > 0
    ? candidateMembers
        .map((c) => `- Name: "${c.name}" | ID: "${c.id}" | Email: "${c.email}"`)
        .join("\n")
    : "No team members currently registered."
}

Instructions:
1. Extract a clear, concise task title.
2. Generate a helpful description based on details provided in the prompt.
3. Determine priority (low, medium, high). Default to medium if unspecified.
4. Determine initial status (todo, in_progress, review, done). Default to todo.
5. If the prompt mentions a person (e.g. "assign login bug to Rahul"), match them to the closest member in the Available Project Members list and return their exact ID in assigneeId and their name in assigneeName. If no match is found, return null.
6. If the prompt specifies a deadline or due date (e.g. "due Friday", "due tomorrow", "due Nov 5"), compute the target date relative to the reference date and return it as YYYY-MM-DD in dueDate. If none specified, return null.`;

    const result = await generateObject({
      model: getAIModel(),
      schema: draftTaskAISchema,
      system: systemPrompt,
      prompt: `User request: ${prompt}`,
    });

    // Validate and resolve assigneeId
    let resolvedAssigneeId: string | null = null;
    const aiAssigneeId = result.object.assigneeId;
    const aiAssigneeName = result.object.assigneeName?.toLowerCase().trim();

    if (
      aiAssigneeId &&
      candidateMembers.some((c) => c.id === aiAssigneeId)
    ) {
      resolvedAssigneeId = aiAssigneeId;
    } else if (aiAssigneeName) {
      const match = candidateMembers.find(
        (c) =>
          c.name.toLowerCase().includes(aiAssigneeName) ||
          aiAssigneeName.includes(c.name.toLowerCase()) ||
          c.email.toLowerCase().includes(aiAssigneeName)
      );
      if (match) {
        resolvedAssigneeId = match.id;
      }
    }

    // Validate dueDate
    let resolvedDueDate: string | null = null;
    if (result.object.dueDate) {
      const parsedDate = new Date(result.object.dueDate);
      if (!isNaN(parsedDate.getTime())) {
        resolvedDueDate = parsedDate.toISOString().split("T")[0];
      }
    }

    const draft = {
      title: result.object.title.trim() || "New Task",
      description: result.object.description.trim(),
      priority: result.object.priority,
      status: result.object.status,
      assigneeId: resolvedAssigneeId,
      dueDate: resolvedDueDate,
    };

    return NextResponse.json({
      draft,
      task: draft,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    return handleAIError(error);
  }
}
