import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { generateObject } from "ai";
import { connectDB } from "@/lib/db";
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

const MAX_BREAKDOWN_REQUEST_BYTES = 16 * 1024;

const breakdownRequestSchema = z.object({
  projectId: z.string().trim().min(1, "Project ID is required"),
  instructions: z.string().trim().max(1000).optional(),
});

export const taskBreakdownItemSchema = z.object({
  title: z
    .string()
    .describe("Clear, concise task title (under 80 characters)"),
  description: z
    .string()
    .describe("Description and acceptance criteria for the subtask"),
  priority: z
    .enum(["low", "medium", "high"])
    .describe("Priority level of the subtask"),
  estimatedHours: z
    .number()
    .min(0.5)
    .max(100)
    .describe("Estimated time to complete in hours"),
});

export const breakdownResponseSchema = z.object({
  tasks: z
    .array(taskBreakdownItemSchema)
    .min(1)
    .max(12)
    .describe("Actionable subtasks"),
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
  const rawBody = await readBoundedBody(request, MAX_BREAKDOWN_REQUEST_BYTES);
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

  const parsed = breakdownRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { projectId, instructions } = parsed.data;

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

    // 2. Enforce AI feature permission
    await requireAIPermission("breakdown", user);

    // 3. Enforce project access (user must be owner or admin to edit/manage project tasks)
    const { project } = await requireProjectAccess(projectId, "edit", user);

    // 4. Enforce per-user AI rate limit
    const rateLimitResponse = requireAIRateLimit(user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 5. Generate structured task breakdown using Gemini via Vercel AI SDK
    const prompt = `You are an expert technical project manager. Break down the following project into actionable tasks with realistic priorities and hourly estimates.

Project Name: ${project.name}
Project Description: ${project.description || "No detailed description provided."}
${instructions ? `User guidance: ${instructions}` : ""}

Generate a set of clear, actionable tasks to complete this project.`;

    const result = await generateObject({
      model: getAIModel(),
      schema: breakdownResponseSchema,
      prompt,
    });

    return NextResponse.json({ tasks: result.object.tasks });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    return handleAIError(error);
  }
}
