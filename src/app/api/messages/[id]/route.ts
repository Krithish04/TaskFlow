import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";
import { File as FileModel } from "@/models/File";
import {
  requireProjectAccess,
  handleAuthError,
  canDeleteMessage,
  UnauthorizedError,
} from "@/lib/permissions";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  try {
    await connectDB();

    const messageDoc = await Message.findOne({
      _id: new Types.ObjectId(id),
      deletedAt: null,
    });

    if (!messageDoc) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Project Isolation:
    // Derives project directly from the stored message record, never client input.
    let user;
    let project;
    try {
      const access = await requireProjectAccess(messageDoc.project, "view");
      user = access.user;
      project = access.project;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Permission check per PRD:
    // "Authors can delete their own messages. PM (own project) and Admin can delete any."
    if (!canDeleteMessage(user, messageDoc, project)) {
      // Anti-probing: return 404 if not authorized to delete
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Soft delete message
    messageDoc.deletedAt = new Date();
    await messageDoc.save();

    // Release attached files so they aren't permanently locked to a deleted message
    await FileModel.updateMany(
      { messageId: messageDoc._id },
      { $set: { messageId: null } }
    );

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
