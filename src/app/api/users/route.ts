import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/permissions";

const patchUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  role: z.enum(["admin", "pm", "user"]),
});

export async function GET() {
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

  try {
    await connectDB();
    const users = await User.find({}, "name email role createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, role } = parsed.data;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid user ID" },
      { status: 400 }
    );
  }

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
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
