import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import {
  requireProjectAccess,
  handleAuthError,
  matchesId,
} from "@/lib/permissions";

const addMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const { user, project } = await requireProjectAccess(id, "view");

    const isSuperAdmin = user.role === "admin";
    const isOwner = matchesId(project.owner, user.id);

    // Only PM (owner) and Admin can manage members. Return 404 for others
    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await connectDB();
    await project.populate("owner", "name email role");
    await project.populate("members", "name email role");

    // Get task counts per assignee in this project
    const taskCounts = await Task.aggregate([
      {
        $match: {
          project: new Types.ObjectId(id),
          assignee: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$assignee",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskCountMap = new Map<string, number>(
      taskCounts.map((tc) => [tc._id.toString(), tc.count])
    );

    const ownerObj = project.owner as unknown as {
      _id: Types.ObjectId;
      name: string;
      email: string;
      role: string;
    };

    const membersArr = Array.isArray(project.members)
      ? (project.members as unknown as Array<{
          _id: Types.ObjectId;
          name: string;
          email: string;
          role: string;
        }>)
      : [];

    const existingMemberIds = [
      ownerObj._id.toString(),
      ...membersArr.map((m) => m._id.toString()),
    ];

    // Find available users that can be added
    const availableUsersDoc = isSuperAdmin
      ? await User.find(
          { _id: { $nin: existingMemberIds.map((mid) => new Types.ObjectId(mid)) } },
          "name email role"
        )
          .sort({ name: 1 })
          .lean()
      : await User.find(
          {
            _id: { $nin: existingMemberIds.map((mid) => new Types.ObjectId(mid)) },
            role: { $in: ["pm", "user"] },
          },
          "name email role"
        )
          .sort({ name: 1 })
          .lean();

    const membersWithCounts = membersArr.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      email: m.email,
      role: m.role,
      assignedTasksCount: taskCountMap.get(m._id.toString()) || 0,
      isOwner: false,
    }));

    return NextResponse.json({
      owner: {
        id: ownerObj._id.toString(),
        name: ownerObj.name,
        email: ownerObj.email,
        role: ownerObj.role,
        assignedTasksCount: taskCountMap.get(ownerObj._id.toString()) || 0,
        isOwner: true,
      },
      members: membersWithCounts,
      availableUsers: availableUsersDoc.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId } = parsed.data;
  if (!Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    const { user, project } = await requireProjectAccess(id, "view");

    const isSuperAdmin = user.role === "admin";
    const isOwner = matchesId(project.owner, user.id);

    // Only PM (owner) and Admin can add members. Return 404 for others
    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await connectDB();

    // Verify user exists in database
    const userToAdd = await User.findById(userId).select("name email role").lean();
    if (!userToAdd) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already owner or member
    if (matchesId(project.owner, userId)) {
      return NextResponse.json(
        { error: "User is already the owner of this project" },
        { status: 400 }
      );
    }

    const currentMemberIds = (project.members || []).map((m: unknown) =>
      (m as { _id?: unknown })?._id ? (m as { _id: unknown })._id!.toString() : m!.toString()
    );

    if (currentMemberIds.includes(userId)) {
      return NextResponse.json(
        { error: "User is already a member of this project" },
        { status: 400 }
      );
    }

    // Atomically add member
    await Project.findByIdAndUpdate(id, {
      $addToSet: { members: new Types.ObjectId(userId) },
    });

    return NextResponse.json({
      success: true,
      message: `${userToAdd.name} added to project`,
      member: {
        id: userToAdd._id.toString(),
        name: userToAdd.name,
        email: userToAdd.email,
        role: userToAdd.role,
        assignedTasksCount: 0,
        isOwner: false,
      },
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
