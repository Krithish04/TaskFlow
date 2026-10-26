import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { File as FileModel } from "@/models/File";
import { Task } from "@/models/Task";
import { requireProjectAccess, handleAuthError } from "@/lib/permissions";
import {
  MAX_FILE_SIZE,
  MAX_PROJECT_STORAGE_BYTES,
  validateFileType,
  sanitizeFilename,
  checkUploadRateLimit,
  getGridFSBucket,
} from "@/lib/file-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    await requireProjectAccess(id, "view");
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const taskIdParam = searchParams.get("taskId");

    const query: Record<string, unknown> = {
      project: new Types.ObjectId(id),
      deletedAt: null,
    };

    if (taskIdParam && Types.ObjectId.isValid(taskIdParam)) {
      query.taskId = new Types.ObjectId(taskIdParam);
    }

    const files = await FileModel.find(query)
      .populate("uploader", "name email role")
      .populate("taskId", "title number")
      .sort({ createdAt: -1 })
      .lean();

    // Compute total active storage used for this project
    const allProjectFiles = await FileModel.find(
      { project: new Types.ObjectId(id), deletedAt: null },
      "size"
    ).lean();
    const totalBytesUsed = allProjectFiles.reduce(
      (acc, file) => acc + (file.size || 0),
      0
    );

    return NextResponse.json({
      files,
      totalBytesUsed,
      maxProjectStorageBytes: MAX_PROJECT_STORAGE_BYTES,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
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
    const { user } = await requireProjectAccess(id, "view");

    // Rate limit per user
    const rateLimit = checkUploadRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Upload rate limit exceeded. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() },
        }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid multipart form data" },
        { status: 400 }
      );
    }

    const uploadedFile = formData.get("file");
    if (!uploadedFile || !(uploadedFile instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const originalName = (uploadedFile as { name?: string }).name || "unnamed_file";
    const fileSize = uploadedFile.size;

    if (fileSize <= 0) {
      return NextResponse.json({ error: "File cannot be empty" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds the 4 MB limit (${fileSize} bytes)` },
        { status: 400 }
      );
    }

    await connectDB();

    // Check optional taskId
    const rawTaskId = formData.get("taskId");
    let targetTaskId: Types.ObjectId | null = null;
    if (typeof rawTaskId === "string" && rawTaskId.trim()) {
      const taskIdTrimmed = rawTaskId.trim();
      if (!Types.ObjectId.isValid(taskIdTrimmed)) {
        return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
      }
      const existingTask = await Task.findOne({
        _id: new Types.ObjectId(taskIdTrimmed),
        project: new Types.ObjectId(id),
      })
        .select("_id")
        .lean();

      if (!existingTask) {
        return NextResponse.json(
          { error: "Task not found in this project" },
          { status: 400 }
        );
      }
      targetTaskId = new Types.ObjectId(taskIdTrimmed);
    }

    // Read buffer and validate magic bytes
    const arrayBuffer = await uploadedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = validateFileType(buffer, originalName, uploadedFile.type);
    if (!validation.valid || !validation.detectedMime) {
      return NextResponse.json(
        { error: validation.error || "Invalid file content" },
        { status: 400 }
      );
    }

    // Check per-project storage quota (100 MB)
    const usageAgg = await FileModel.aggregate([
      { $match: { project: new Types.ObjectId(id), deletedAt: null } },
      { $group: { _id: null, totalBytes: { $sum: "$size" } } },
    ]);
    const currentBytes = usageAgg[0]?.totalBytes || 0;

    if (currentBytes + fileSize > MAX_PROJECT_STORAGE_BYTES) {
      return NextResponse.json(
        { error: "Project storage quota exceeded (100 MB limit)" },
        { status: 400 }
      );
    }

    const sanitizedName = sanitizeFilename(originalName);

    // Stream into MongoDB GridFS bucket
    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(sanitizedName, {
      metadata: {
        projectId: id,
        uploaderId: user.id,
        mime: validation.detectedMime,
      },
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.on("finish", () => resolve());
      uploadStream.on("error", (err: unknown) => reject(err));
      uploadStream.end(buffer);
    });

    // Save File document
    const fileDoc = await FileModel.create({
      project: new Types.ObjectId(id),
      uploader: new Types.ObjectId(user.id),
      name: sanitizedName,
      mime: validation.detectedMime,
      size: fileSize,
      storageId: uploadStream.id,
      taskId: targetTaskId,
    });

    await fileDoc.populate("uploader", "name email");

    return NextResponse.json({ file: fileDoc }, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
