import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import {
  requireProjectAccess,
  handleAuthError,
  matchesId,
} from "@/lib/permissions";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    const { user, project } = await requireProjectAccess(id, "view");

    const isSuperAdmin = user.role === "admin";
    const isOwner = matchesId(project.owner, user.id);

    // Only PM (owner) and Admin can remove members. Return 404 for others
    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Owner cannot be removed from project
    if (matchesId(project.owner, userId)) {
      return NextResponse.json(
        { error: "Cannot remove project owner from project" },
        { status: 400 }
      );
    }

    const currentMemberIds = (project.members || []).map((m: unknown) =>
      (m as { _id?: unknown })?._id ? (m as { _id: unknown })._id!.toString() : m!.toString()
    );

    if (!currentMemberIds.includes(userId)) {
      return NextResponse.json(
        { error: "Member not found in project" },
        { status: 404 }
      );
    }

    await connectDB();

    // 1. Remove member from project.members
    await Project.findByIdAndUpdate(id, {
      $pull: { members: new Types.ObjectId(userId) },
    });

    // 2. Unassign all tasks assigned to this user in this project
    const unassignResult = await Task.updateMany(
      {
        project: new Types.ObjectId(id),
        assignee: new Types.ObjectId(userId),
      },
      {
        $set: { assignee: null },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Member removed and ${unassignResult.modifiedCount} task(s) unassigned`,
      unassignedTasksCount: unassignResult.modifiedCount,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
