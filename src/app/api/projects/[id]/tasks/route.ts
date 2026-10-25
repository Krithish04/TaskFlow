import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import {
  requireProjectAccess,
  handleAuthError,
  matchesId,
} from "@/lib/permissions";

const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required")
    .max(120, "Task title too long"),
  description: z.string().trim().max(2000).optional().default(""),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional().default("todo"),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  assignee: z.string().nullable().optional().default(null),
  dueDate: z.string().nullable().optional().default(null),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid project ID" },
      { status: 400 }
    );
  }

  try {
    await requireProjectAccess(id, "view");
    await connectDB();

    const tasks = await Task.find({ project: id })
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role")
      .sort({ status: 1, order: 1 })
      .lean();

    return NextResponse.json({ tasks });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid project ID" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, status, priority, assignee, dueDate } = parsed.data;

  if (assignee && !Types.ObjectId.isValid(assignee)) {
    return NextResponse.json(
      { error: "Invalid assignee user ID" },
      { status: 400 }
    );
  }

  let parsedDueDate: Date | null = null;
  if (dueDate) {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "Invalid dueDate format" },
        { status: 400 }
      );
    }
    parsedDueDate = d;
  }

  try {
    const { user, project } = await requireProjectAccess(id, "edit");

    if (assignee) {
      const isMember =
        matchesId(project.owner, assignee) ||
        project.members?.some((m) => matchesId(m, assignee));
      if (!isMember) {
        return NextResponse.json(
          { error: "Assignee must be a member of this project" },
          { status: 400 }
        );
      }
    }

    await connectDB();

    let taskOrder = parsed.data.order;
    if (taskOrder === undefined) {
      const highestOrder = await Task.findOne({ project: id, status })
        .sort({ order: -1 })
        .select("order")
        .lean();
      taskOrder = highestOrder ? highestOrder.order + 1 : 0;
    }

    const createdTask = await Task.create({
      project: new Types.ObjectId(id),
      title,
      description,
      status,
      priority,
      assignee: assignee ? new Types.ObjectId(assignee) : null,
      dueDate: parsedDueDate,
      order: taskOrder,
      createdBy: new Types.ObjectId(user.id),
    });

    const populatedTask = await Task.findById(createdTask._id)
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role")
      .lean();

    return NextResponse.json({ task: populatedTask }, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
