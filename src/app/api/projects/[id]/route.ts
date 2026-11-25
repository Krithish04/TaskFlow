import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Project, PROJECT_COLORS } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { Message } from "@/models/Message";
import { File as FileModel } from "@/models/File";
import { ProjectReadState } from "@/models/ProjectReadState";
import { getGridFSBucket } from "@/lib/file-utils";
import { parseBoundedJson } from "@/lib/api-utils";
import {
  requireProjectAccess,
  handleAuthError,
} from "@/lib/permissions";

const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name must not be empty")
    .max(100, "Project name too long")
    .optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["active", "archived", "completed"]).optional(),
  members: z.array(z.string()).optional(),
  color: z.enum(PROJECT_COLORS).optional(),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, "Project key must be 2 to 5 uppercase letters")
    .optional(),
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
    const { project } = await requireProjectAccess(id, "view");
    await project.populate("owner", "name email role");
    await project.populate("members", "name email role");

    return NextResponse.json({ project });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to fetch project" },
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
      { error: "Invalid project ID" },
      { status: 400 }
    );
  }

  const { data: body, error: jsonError, status: jsonStatus } = await parseBoundedJson(request);
  if (jsonError) {
    return NextResponse.json({ error: jsonError }, { status: jsonStatus || 400 });
  }

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.members) {
    for (const memberId of parsed.data.members) {
      if (!Types.ObjectId.isValid(memberId)) {
        return NextResponse.json(
          { error: `Invalid member ID format: ${memberId}` },
          { status: 400 }
        );
      }
    }
  }

  try {
    const { project } = await requireProjectAccess(id, "edit");

    if (parsed.data.name !== undefined) {
      project.name = parsed.data.name;
    }
    if (parsed.data.description !== undefined) {
      project.description = parsed.data.description;
    }
    if (parsed.data.status !== undefined) {
      project.status = parsed.data.status;
    }
    if (parsed.data.color !== undefined) {
      project.color = parsed.data.color;
    }
    if (parsed.data.key !== undefined) {
      project.key = parsed.data.key;
    }
    let removedMembers: string[] = [];
    if (parsed.data.members !== undefined) {
      const oldMemberIds = (project.members || []).map((m: unknown) =>
        (m as { _id?: unknown })?._id
          ? (m as { _id: unknown })._id!.toString()
          : m!.toString()
      );
      const newMemberIds = [
        ...new Set(
          parsed.data.members.map((m) => new Types.ObjectId(m).toString())
        ),
      ];
      removedMembers = oldMemberIds.filter(
        (oldId: string) => !newMemberIds.includes(oldId)
      );

      project.members = newMemberIds.map((m) => new Types.ObjectId(m));
    }

    await project.save();

    if (removedMembers.length > 0) {
      await Task.updateMany(
        {
          project: project._id,
          assignee: { $in: removedMembers.map((m) => new Types.ObjectId(m)) },
        },
        { $set: { assignee: null } }
      );
    }
    await project.populate("owner", "name email role");
    await project.populate("members", "name email role");

    return NextResponse.json({ project });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to update project" },
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
      { error: "Invalid project ID" },
      { status: 400 }
    );
  }

  try {
    await requireProjectAccess(id, "manage");
    await connectDB();

    // Cascading delete of tasks and comments for this project
    const projectObjectId = new Types.ObjectId(id);
    const tasks = await Task.find({ project: projectObjectId }).select("_id").lean();
    if (tasks.length > 0) {
      const taskIds = tasks.map((t) => t._id);
      await Comment.deleteMany({ task: { $in: taskIds } });
      await Task.deleteMany({ project: projectObjectId });
    }

    // Clean up GridFS binaries and File records
    try {
      const projectFiles = await FileModel.find({ project: projectObjectId })
        .select("storageId")
        .lean();
      if (projectFiles.length > 0) {
        const bucket = getGridFSBucket();
        for (const file of projectFiles) {
          if (file.storageId) {
            try {
              await bucket.delete(file.storageId);
            } catch {
              // Ignore if already deleted in GridFS
            }
          }
        }
        await FileModel.deleteMany({ project: projectObjectId });
      }
    } catch {
      // Ignore if GridFS bucket is empty or not yet initialized
    }

    // Clean up chat messages and unread state tracking
    await Message.deleteMany({ project: projectObjectId });
    await ProjectReadState.deleteMany({ project: projectObjectId });

    await Project.findByIdAndDelete(projectObjectId);

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
