import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { generateText } from "ai";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
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

const MAX_SUMMARIZE_REQUEST_BYTES = 16 * 1024;

const summarizeCommentsRequestSchema = z.object({
  taskId: z.string().trim().min(1, "Task ID is required"),
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
  const rawBody = await readBoundedBody(request, MAX_SUMMARIZE_REQUEST_BYTES);
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

  const parsed = summarizeCommentsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { taskId } = parsed.data;

  if (!Types.ObjectId.isValid(taskId)) {
    return NextResponse.json(
      { error: "Invalid task ID" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // 1. Verify user is authenticated (Admin, PM, and User can access summaries per PRD)
    const user = await requireRole(["admin", "pm", "user"]);

    // 2. Enforce AI feature permission for summarize-comments
    await requireAIPermission("summarize-comments", user);

    // 3. Find task
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // 4. Enforce project access (user must belong to the project or be Admin)
    await requireProjectAccess(task.project, "view", user);

    // 5. Enforce per-user AI rate limit
    const rateLimitResponse = requireAIRateLimit(user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 6. Fetch task comments
    const comments = await Comment.find({ task: taskId })
      .populate("author", "name email role")
      .sort({ createdAt: 1 })
      .lean();

    if (comments.length === 0) {
      return NextResponse.json({
        summary: "No comments on this task to summarize yet.",
        commentCount: 0,
      });
    }

    const formattedComments = comments
      .map((c) => {
        const authorObj = c.author as unknown as {
          name?: string;
          email?: string;
          role?: string;
        } | null;
        const authorName = authorObj?.name || "Team Member";
        const authorRole = authorObj?.role ? ` (${authorObj.role})` : "";
        const dateStr = c.createdAt
          ? new Date(c.createdAt).toLocaleString("en-US")
          : "";
        return `[${dateStr}] ${authorName}${authorRole}: ${c.body}`;
      })
      .join("\n\n");

    const prompt = `You are an AI assistant summarizing a comment thread on a project management task.

Task Details:
- Title: "${task.title}"
- Description: "${task.description || "No description provided."}"
- Status: ${task.status}
- Priority: ${task.priority}

Comment Thread (${comments.length} comments):
${formattedComments}

Instructions:
Provide a clear, concise summary of this discussion. Synthesize the key points, including:
1. Main updates and discussion points
2. Key decisions made
3. Any open questions, blockers, or next actions

Keep the tone professional and concise.`;

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
      summary: result.text.trim(),
      commentCount: comments.length,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error("summarize-comments failed:", error);
    return NextResponse.json(
      { error: "Failed to summarize comments" },
      { status: 500 }
    );
  }
}
