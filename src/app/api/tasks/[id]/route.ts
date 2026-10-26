import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import {
  requireProjectAccess,
  handleAuthError,
  matchesId,
} from "@/lib/permissions";

const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title cannot be empty")
    .max(120, "Task title too long")
    .optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid task ID" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const task = await Task.findById(id)
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role");

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    await requireProjectAccess(task.project, "view");

    return NextResponse.json({ task });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid task ID" },
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

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.assignee && !Types.ObjectId.isValid(parsed.data.assignee)) {
    return NextResponse.json(
      { error: "Invalid assignee user ID" },
      { status: 400 }
    );
  }

  let parsedDueDate: Date | null | undefined = undefined;
  if (parsed.data.dueDate !== undefined) {
    if (parsed.data.dueDate === null) {
      parsedDueDate = null;
    } else {
      const d = new Date(parsed.data.dueDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "Invalid dueDate format" },
          { status: 400 }
        );
      }
      parsedDueDate = d;
    }
  }

  try {
    await connectDB();
    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const { project } = await requireProjectAccess(task.project, "edit");

    if (parsed.data.assignee) {
      const isMember =
        matchesId(project.owner, parsed.data.assignee) ||
        project.members?.some((m) => matchesId(m, parsed.data.assignee));
      if (!isMember) {
        return NextResponse.json(
          { error: "Assignee must be a member of this project" },
          { status: 400 }
        );
      }
    }

    if (parsed.data.title !== undefined) task.title = parsed.data.title;
    if (parsed.data.description !== undefined) task.description = parsed.data.description;
    if (parsed.data.status !== undefined) {
      const prevStatus = task.status;
      const newStatus = parsed.data.status;
      if (prevStatus !== newStatus) {
        if (newStatus === "done") {
          task.completedAt = new Date();
        } else if (prevStatus === "done") {
          task.completedAt = null;
        }
      }
      task.status = newStatus;
    }
    if (parsed.data.priority !== undefined) task.priority = parsed.data.priority;
    if (parsed.data.assignee !== undefined) {
      task.assignee = parsed.data.assignee ? new Types.ObjectId(parsed.data.assignee) : null;
    }
    if (parsedDueDate !== undefined) task.dueDate = parsedDueDate;
    if (parsed.data.order !== undefined) task.order = parsed.data.order;

    await task.save();
    await task.populate("assignee", "name email role");
    await task.populate("createdBy", "name email role");

    return NextResponse.json({ task });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid task ID" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    await requireProjectAccess(task.project, "edit");

    await Comment.deleteMany({ task: id });
    await Task.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
