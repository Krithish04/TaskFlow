import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { requireProjectAccess } from "@/lib/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceHeader, type WorkspaceProject } from "./workspace-header";
import { type AvailableMember } from "@/components/projects/project-dialog";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export const instant = false;

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${id}/overview`);
  }

  try {
    await requireProjectAccess(id, "view");
  } catch {
    notFound();
  }

  await connectDB();

  const projectDoc = await Project.findById(id)
    .populate("owner", "name email role")
    .populate("members", "name email role")
    .lean();

  if (!projectDoc) {
    notFound();
  }

  const ownerObj = projectDoc.owner as unknown as {
    _id?: unknown;
    name?: string;
    email?: string;
    role?: string;
  } | null;

  const membersArr = Array.isArray(projectDoc.members)
    ? (projectDoc.members as unknown as {
        _id?: unknown;
        id?: string;
        name?: string;
        email?: string;
        role?: string;
      }[])
    : [];

  const ownerId = ownerObj?._id?.toString() || "";
  const memberIds = membersArr.map((m) => m._id?.toString() || m.id || "");

  const workspaceProject: WorkspaceProject = {
    id: projectDoc._id.toString(),
    name: projectDoc.name,
    description: projectDoc.description || "",
    status: projectDoc.status,
    color: projectDoc.color || "blue",
    key: projectDoc.key || "TF",
    ownerId,
    memberIds,
  };

  const isSuperAdmin = session.user.role === "admin";
  const isProjectOwner = ownerId === session.user.id;
  const canManage = isSuperAdmin || isProjectOwner;

  // Sidebar accessible projects
  const userProjectsDoc = isSuperAdmin
    ? await Project.find({}, "name color key").lean()
    : await Project.find(
        { $or: [{ owner: session.user.id }, { members: session.user.id }] },
        "name color key"
      ).lean();

  const sidebarProjects = userProjectsDoc.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    color: (p as { color?: string }).color,
    key: (p as { key?: string }).key,
  }));

  // Available users for PM/Admin project edit dialog (only expose to managers)
  const availableUsersDoc = !canManage
    ? []
    : isSuperAdmin
    ? await User.find({}, "name email role").lean()
    : await User.find(
        {
          $or: [{ _id: session.user.id }, { role: { $in: ["pm", "user"] } }],
        },
        "name email role"
      ).lean();

  const availableMembers: AvailableMember[] = availableUsersDoc.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
  }));

  return (
    <AppShell
      user={session.user}
      projects={sidebarProjects}
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: workspaceProject.name, href: `/projects/${id}/overview` },
      ]}
    >
      <div className="space-y-6">
        <WorkspaceHeader
          project={workspaceProject}
          canManage={canManage}
          availableMembers={availableMembers}
        />
        <div>{children}</div>
      </div>
    </AppShell>
  );
}
