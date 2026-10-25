import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import {
  requireProjectAccess,
  handleAuthError,
} from "@/lib/permissions";

const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be under 2000 characters"),
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
    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    await requireProjectAccess(task.project, "view");

    const comments = await Comment.find({ task: id })
      .sort({ createdAt: 1 })
      .populate("author", "name email role");

    return NextResponse.json({ comments });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

const MAX_COMMENT_REQUEST_BYTES = 16 * 1024;

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

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_COMMENT_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 }
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

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
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

    const { user } = await requireProjectAccess(task.project, "comment");

    const comment = await Comment.create({
      task: task._id,
      author: user.id,
      body: parsed.data.body,
    });

    try {
      await comment.populate("author", "name email role");
    } catch {
      // If population fails after persistence, attach basic author info so the client still receives it
      const commentObj = comment.toObject();
      commentObj.author = {
        _id: user.id,
        name: user.name || "User",
        email: user.email || "",
        role: user.role,
      } as unknown as typeof commentObj.author;
      return NextResponse.json({ comment: commentObj }, { status: 201 });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
