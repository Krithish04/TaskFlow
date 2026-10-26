import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";
import { File as FileModel } from "@/models/File";
import { ProjectReadState } from "@/models/ProjectReadState";
import {
  requireProjectAccess,
  handleAuthError,
  matchesId,
} from "@/lib/permissions";

const MAX_MESSAGE_REQUEST_BYTES = 64 * 1024; // 64 KB JSON payload limit

const createMessageSchema = z.object({
  body: z
    .string()
    .max(4000, "Message body cannot exceed 4000 characters")
    .optional()
    .default(""),
  fileIds: z
    .array(z.string())
    .max(5, "Cannot attach more than 5 files")
    .optional()
    .default([]),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    // Project isolation & permission check
    await requireProjectAccess(id, "view");
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const afterParam = searchParams.get("after");
    const limitParam = searchParams.get("limit");

    const limit = Math.min(
      Math.max(1, parseInt(limitParam || "50", 10) || 50),
      100
    );

    const query: Record<string, unknown> = {
      project: new Types.ObjectId(id),
      deletedAt: null,
    };

    if (afterParam) {
      const parsedDate = new Date(afterParam);
      if (!isNaN(parsedDate.getTime())) {
        query.createdAt = { $gt: parsedDate };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate("author", "name email role")
      .populate({
        path: "attachments",
        select: "name mime size storageId createdAt",
        match: { deletedAt: null },
      })
      .lean();

    return NextResponse.json({ messages });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to fetch messages" },
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
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    // Project isolation: only project members/owner/admin can post messages
    const { user, project } = await requireProjectAccess(id, "view");
    await connectDB();

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_MESSAGE_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "Request payload too large" },
        { status: 413 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const parseResult = createMessageSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { body, fileIds } = parseResult.data;
    const trimmedBody = body.trim();

    // Must have either non-empty body or at least one file attachment
    if (!trimmedBody && fileIds.length === 0) {
      return NextResponse.json(
        { error: "Message must contain text or at least one attached file" },
        { status: 400 }
      );
    }

    // Validate attachments
    const fileObjectIds: Types.ObjectId[] = [];
    if (fileIds.length > 0) {
      // Validate ObjectId format
      for (const fileId of fileIds) {
        if (!Types.ObjectId.isValid(fileId)) {
          return NextResponse.json(
            { error: `Invalid file ID: ${fileId}` },
            { status: 400 }
          );
        }
        fileObjectIds.push(new Types.ObjectId(fileId));
      }

      // Check for duplicate file IDs in the same request
      const uniqueIds = new Set(fileIds);
      if (uniqueIds.size !== fileIds.length) {
        return NextResponse.json(
          { error: "Duplicate file IDs in attachments" },
          { status: 400 }
        );
      }

      // Fetch files and check project isolation + attachment state
      const files = await FileModel.find({
        _id: { $in: fileObjectIds },
        deletedAt: null,
      });

      if (files.length !== fileIds.length) {
        return NextResponse.json(
          { error: "One or more attached files were not found" },
          { status: 400 }
        );
      }

      for (const fileDoc of files) {
        // Files must belong to the exact same project
        if (!matchesId(fileDoc.project, project._id)) {
          return NextResponse.json(
            { error: "Files must belong to the same project" },
            { status: 400 }
          );
        }

        // Files must not already be attached to another message
        if (fileDoc.messageId) {
          return NextResponse.json(
            { error: `File "${fileDoc.name}" is already attached to a message` },
            { status: 400 }
          );
        }
      }
    }

    // Create the message
    const message = await Message.create({
      project: project._id,
      author: new Types.ObjectId(user.id),
      body: trimmedBody,
      attachments: fileObjectIds,
    });

    // Mark files with this messageId
    if (fileObjectIds.length > 0) {
      await FileModel.updateMany(
        { _id: { $in: fileObjectIds } },
        { $set: { messageId: message._id } }
      );
    }

    // Update sender's ProjectReadState
    await ProjectReadState.findOneAndUpdate(
      { user: new Types.ObjectId(user.id), project: project._id },
      { $set: { lastReadAt: message.createdAt || new Date() } },
      { upsert: true, new: true }
    );

    // Return populated message
    const populated = await Message.findById(message._id)
      .populate("author", "name email role")
      .populate({
        path: "attachments",
        select: "name mime size storageId createdAt",
        match: { deletedAt: null },
      })
      .lean();

    return NextResponse.json({ message: populated }, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to post message" },
      { status: 500 }
    );
  }
}
