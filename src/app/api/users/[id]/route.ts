import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/permissions";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "pm", "user"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid user ID" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const user = await User.findById(id).select("-passwordHash").lean();
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid user ID" },
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

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { role } = parsed.data;

  try {
    await connectDB();

    if (role !== "admin") {
      const target = await User.findById(id).select("role").lean();
      if (!target) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      if (target.role === "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: "Cannot remove the last administrator" },
            { status: 409 }
          );
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    )
      .select("-passwordHash")
      .lean();

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch {
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
