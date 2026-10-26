import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import {
  requireProjectAccess,
  canMoveTask,
  handleAuthError,
} from "@/lib/permissions";

const moveTaskSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "done"]),
  order: z.number().int().min(0),
});

export async function POST(
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

  const parsed = moveTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, order } = parsed.data;

  try {
    await connectDB();
    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Must have at least project view access
    const { user } = await requireProjectAccess(task.project, "view");

    // Check specific task movement permission (Admin, PM, or assigned User)
    if (!canMoveTask(user, task)) {
      return NextResponse.json(
        { error: "Forbidden: You can only move tasks assigned to you" },
        { status: 403 }
      );
    }

    const prevStatus = task.status;
    const prevOrder = task.order;

    if (prevStatus === status) {
      if (prevOrder < order) {
        // Moved down: shift intervening items up
        await Task.updateMany(
          {
            project: task.project,
            status,
            order: { $gt: prevOrder, $lte: order },
            _id: { $ne: task._id },
          },
          { $inc: { order: -1 } }
        );
      } else if (prevOrder > order) {
        // Moved up: shift intervening items down
        await Task.updateMany(
          {
            project: task.project,
            status,
            order: { $gte: order, $lt: prevOrder },
            _id: { $ne: task._id },
          },
          { $inc: { order: 1 } }
        );
      }
    } else {
      // Changed column: close gap in source, open slot in target
      await Task.updateMany(
        {
          project: task.project,
          status: prevStatus,
          order: { $gt: prevOrder },
          _id: { $ne: task._id },
        },
        { $inc: { order: -1 } }
      );
      await Task.updateMany(
        {
          project: task.project,
          status,
          order: { $gte: order },
          _id: { $ne: task._id },
        },
        { $inc: { order: 1 } }
      );
    }

    if (prevStatus !== status) {
      if (status === "done") {
        task.completedAt = new Date();
      } else if (prevStatus === "done") {
        task.completedAt = null;
      }
    }

    task.status = status;
    task.order = order;
    await task.save();

    await task.populate("assignee", "name email role");
    await task.populate("createdBy", "name email role");

    return NextResponse.json({ task });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to move task" },
      { status: 500 }
    );
  }
}
