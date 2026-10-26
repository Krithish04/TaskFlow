import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";
import { ProjectReadState } from "@/models/ProjectReadState";
import { requireProjectAccess, handleAuthError } from "@/lib/permissions";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    // Project isolation check
    const { user, project } = await requireProjectAccess(id, "view");
    await connectDB();

    const now = new Date();

    const state = await ProjectReadState.findOneAndUpdate(
      {
        user: new Types.ObjectId(user.id),
        project: project._id,
      },
      {
        $set: { lastReadAt: now },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      lastReadAt: state.lastReadAt.toISOString(),
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to update read state" },
      { status: 500 }
    );
  }
}

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
    await connectDB();

    const state = await ProjectReadState.findOne({
      user: new Types.ObjectId(user.id),
      project: project._id,
    }).lean();

    const lastReadAt = state?.lastReadAt ? new Date(state.lastReadAt) : new Date(0);

    const unreadCount = await Message.countDocuments({
      project: project._id,
      deletedAt: null,
      createdAt: { $gt: lastReadAt },
    });

    return NextResponse.json({
      lastReadAt: state?.lastReadAt ? lastReadAt.toISOString() : null,
      unreadCount,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to fetch read state" },
      { status: 500 }
    );
  }
}
