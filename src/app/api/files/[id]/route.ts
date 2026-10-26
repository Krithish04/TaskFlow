import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { File as FileModel } from "@/models/File";
import { Task } from "@/models/Task";
import {
  requireProjectAccess,
  handleAuthError,
  matchesId,
  UnauthorizedError,
} from "@/lib/permissions";
import { getGridFSBucket, getContentDisposition } from "@/lib/file-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    await connectDB();

    const fileDoc = await FileModel.findOne({
      _id: new Types.ObjectId(id),
      deletedAt: null,
    }).lean();

    if (!fileDoc) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Anti-probing & Project Isolation:
    // Derives project from stored record, never from client input.
    // If user lacks access to this file's project, return 404 (not 403).
    try {
      await requireProjectAccess(fileDoc.project, "view");
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const bucket = getGridFSBucket();
    const nodeStream = bucket.openDownloadStream(fileDoc.storageId);

    // Convert Node Readable stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        nodeStream.on("end", () => {
          controller.close();
        });
        nodeStream.on("error", (err) => {
          controller.error(err);
        });
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    const disposition = getContentDisposition(fileDoc.mime, fileDoc.name);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": fileDoc.mime,
        "Content-Length": fileDoc.size.toString(),
        "Content-Disposition": disposition,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
        "Cache-Control": "private, max-age=86400, no-transform",
      },
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    await connectDB();

    const fileDoc = await FileModel.findOne({
      _id: new Types.ObjectId(id),
      deletedAt: null,
    });

    if (!fileDoc) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Derives project from stored record
    let user;
    let project;
    try {
      const access = await requireProjectAccess(fileDoc.project, "view");
      user = access.user;
      project = access.project;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Permitted to delete: uploader, project PM (owner), or Admin
    const isUploader = matchesId(fileDoc.uploader, user.id);
    const isProjectOwner = matchesId(project.owner, user.id);
    const isSuperAdmin = user.role === "admin";

    if (!isUploader && !isProjectOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Soft-delete database record
    fileDoc.deletedAt = new Date();
    await fileDoc.save();

    // Delete from GridFS bucket
    try {
      const bucket = getGridFSBucket();
      await bucket.delete(fileDoc.storageId);
    } catch {
      // Ignore if already removed from GridFS
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    await connectDB();

    const fileDoc = await FileModel.findOne({
      _id: new Types.ObjectId(id),
      deletedAt: null,
    });

    if (!fileDoc) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Project isolation check: returns 404 for non-members
    try {
      await requireProjectAccess(fileDoc.project, "view");
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { taskId } = body;

    if (taskId === null || taskId === "") {
      // Detach from task
      fileDoc.taskId = null;
    } else if (typeof taskId === "string") {
      if (!Types.ObjectId.isValid(taskId)) {
        return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
      }
      // Ensure the task belongs to the exact same project
      const task = await Task.findOne({
        _id: new Types.ObjectId(taskId),
        project: fileDoc.project,
      });
      if (!task) {
        return NextResponse.json(
          { error: "Task not found in this project" },
          { status: 400 }
        );
      }
      fileDoc.taskId = task._id;
    }

    await fileDoc.save();

    return NextResponse.json({
      success: true,
      file: fileDoc,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}

