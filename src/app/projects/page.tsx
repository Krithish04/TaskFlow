import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { canCreateProject } from "@/lib/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectsGrid, type SerializedProjectCard } from "./projects-grid";
import { type AvailableMember } from "@/components/projects/project-dialog";

export const instant = false;

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/projects");
  }

  await connectDB();

  const user = session.user;
  const isSuperAdmin = user.role === "admin";

  const projectFilter = isSuperAdmin
    ? {}
    : {
        $or: [{ owner: user.id }, { members: user.id }],
      };

  const projectDocs = await Project.find(projectFilter)
    .populate("owner", "name email role")
    .populate("members", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  const projectIds = projectDocs.map((p) => p._id);

  // MongoDB aggregation to compute total, completed, and overdue task counts per project
  const now = new Date();
  const taskStats = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: "$project",
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "done"] },
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", now] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const statsMap = new Map<
    string,
    { total: number; completed: number; overdue: number }
  >();
  for (const s of taskStats) {
    statsMap.set(s._id.toString(), {
      total: s.total,
      completed: s.completed,
      overdue: s.overdue,
    });
  }

  const projectCards: SerializedProjectCard[] = projectDocs.map((p) => {
    const s = statsMap.get(p._id.toString()) || {
      total: 0,
      completed: 0,
      overdue: 0,
    };
    const progress = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;

    const ownerObj = p.owner as unknown as {
      _id?: unknown;
      name?: string;
      email?: string;
    } | null;

    const membersArr = Array.isArray(p.members)
      ? (p.members as unknown as {
          _id?: unknown;
          id?: string;
          name?: string;
          email?: string;
          role?: string;
        }[])
      : [];

    return {
      id: p._id.toString(),
      name: p.name,
      description: p.description || "",
      status: p.status,
      color: p.color || "blue",
      key: p.key || "TF",
      owner: {
        id: ownerObj?._id?.toString() || "",
        name: ownerObj?.name || "Owner",
        email: ownerObj?.email || "",
      },
      members: membersArr.map((m) => ({
        id: m._id?.toString() || m.id || "",
        name: m.name || "",
        email: m.email || "",
        role: m.role || "user",
      })),
      totalTasks: s.total,
      completedTasks: s.completed,
      overdueTasks: s.overdue,
      progress,
      createdAt: p.createdAt
        ? new Date(p.createdAt).toISOString()
        : new Date().toISOString(),
    };
  });

  // Fetch available members for project creation/assignment (only expose if user can create)
  const canCreate = canCreateProject(user.role);
  const availableUsersDoc = !canCreate
    ? []
    : isSuperAdmin
    ? await User.find({}, "name email role").lean()
    : await User.find(
        {
          $or: [{ _id: user.id }, { role: { $in: ["pm", "user"] } }],
        },
        "name email role"
      ).lean();

  const availableMembers: AvailableMember[] = availableUsersDoc.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
  }));

  // Sidebar accessible projects
  const sidebarProjects = projectCards.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    key: p.key,
  }));

  return (
    <AppShell
      user={user}
      projects={sidebarProjects}
      breadcrumbs={[{ label: "Projects" }]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and manage your workspace projects, track progress and milestones.
          </p>
        </div>

        <ProjectsGrid
          initialProjects={projectCards}
          availableMembers={availableMembers}
          canCreate={canCreate}
          currentUserId={user.id}
        />
      </div>
    </AppShell>
  );
}
