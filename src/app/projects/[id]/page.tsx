import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { requireProjectAccess } from "@/lib/permissions";
import { KanbanBoard } from "./kanban-board";
import { KanbanProject, KanbanTask, KanbanUser } from "./types";

export const instant = false;

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${id}`);
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

  const tasksDoc = await Task.find({ project: id })
    .populate("assignee", "name email role")
    .populate("createdBy", "name email role")
    .sort({ status: 1, order: 1 })
    .lean();

  // All available project members (owner + members)
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

  const projectOwner: KanbanUser = {
    id: ownerObj?._id?.toString() || "",
    name: ownerObj?.name || "Unassigned",
    email: ownerObj?.email || "",
    role: ownerObj?.role || "pm",
  };

  const projectMembers: KanbanUser[] = membersArr.map((m) => ({
    id: m._id?.toString() || m.id || "",
    name: m.name || "",
    email: m.email || "",
    role: m.role || "user",
  }));

  const serializedProject: KanbanProject = {
    id: projectDoc._id.toString(),
    name: projectDoc.name,
    description: projectDoc.description || "",
    status: projectDoc.status,
    owner: projectOwner,
    members: projectMembers,
    createdAt: projectDoc.createdAt
      ? new Date(projectDoc.createdAt).toISOString()
      : new Date().toISOString(),
  };

  const serializedTasks: KanbanTask[] = tasksDoc.map((t) => {
    const assigneeObj = t.assignee as unknown as {
      _id?: unknown;
      name?: string;
      email?: string;
      role?: string;
    } | null;

    const createdByObj = t.createdBy as unknown as {
      _id?: unknown;
      name?: string;
      email?: string;
      role?: string;
    } | null;

    return {
      id: t._id.toString(),
      projectId: id,
      title: t.title,
      description: t.description || "",
      status: t.status,
      priority: t.priority,
      order: t.order,
      assignee: assigneeObj
        ? {
            id: assigneeObj._id?.toString() || "",
            name: assigneeObj.name || "",
            email: assigneeObj.email || "",
            role: assigneeObj.role || "user",
          }
        : null,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      createdBy: createdByObj
        ? {
            id: createdByObj._id?.toString() || "",
            name: createdByObj.name || "",
            email: createdByObj.email || "",
            role: createdByObj.role || "user",
          }
        : null,
      createdAt: t.createdAt
        ? new Date(t.createdAt).toISOString()
        : new Date().toISOString(),
    };
  });

  // Unique list of users for assignment (owner + members)
  const availableMembersMap = new Map<string, KanbanUser>();
  availableMembersMap.set(projectOwner.id, projectOwner);
  projectMembers.forEach((m) => availableMembersMap.set(m.id, m));
  const availableMembers = Array.from(availableMembersMap.values());

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <KanbanBoard
        project={serializedProject}
        initialTasks={serializedTasks}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        availableMembers={availableMembers}
      />
    </div>
  );
}
