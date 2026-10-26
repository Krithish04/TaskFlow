import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project, generateProjectKey, PROJECT_COLORS } from "@/models/Project";
import { canCreateProject } from "@/lib/permissions";

const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name too long"),
  description: z.string().trim().max(1000).optional().default(""),
  status: z.enum(["active", "archived", "completed"]).optional().default("active"),
  members: z.array(z.string()).optional().default([]),
  color: z.enum(PROJECT_COLORS).optional(),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, "Project key must be 2 to 5 uppercase letters")
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    await connectDB();
    const query =
      session.user.role === "admin"
        ? {}
        : {
            $or: [
              { owner: session.user.id },
              { members: session.user.id },
            ],
          };

    const projects = await Project.find(query)
      .populate("owner", "name email role")
      .populate("members", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  if (!canCreateProject(session.user.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions to create projects" },
      { status: 403 }
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

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, status, members, color, key } = parsed.data;

  // Validate member ObjectIds
  for (const memberId of members) {
    if (!Types.ObjectId.isValid(memberId)) {
      return NextResponse.json(
        { error: `Invalid member ID format: ${memberId}` },
        { status: 400 }
      );
    }
  }

  try {
    await connectDB();

    const existingProjects = await Project.find({}).select("key").lean();
    const existingKeys = new Set(existingProjects.map((p) => p.key).filter(Boolean));
    const projectKey = key || generateProjectKey(name, existingKeys);
    const projectColor = color || "blue";

    const createdProject = await Project.create({
      name,
      description,
      status,
      color: projectColor,
      key: projectKey,
      nextTaskNumber: 1,
      owner: new Types.ObjectId(session.user.id),
      members: members.map((id) => new Types.ObjectId(id)),
    });

    const populatedProject = await Project.findById(createdProject._id)
      .populate("owner", "name email role")
      .populate("members", "name email role")
      .lean();

    return NextResponse.json({ project: populatedProject }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
