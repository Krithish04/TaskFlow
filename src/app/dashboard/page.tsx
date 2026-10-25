import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { User, type UserRole } from "@/models/User";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { UserTable, type DashboardUser } from "./user-table";
import {
  PMProjects,
  type DashboardProject,
  type AvailableMember,
} from "./pm-projects";
import {
  UserDashboard,
  type UserTask,
  type UserComment,
  type UserProjectItem,
} from "./user-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FolderKanban,
  Shield,
  Briefcase,
  LogOut,
  Folder,
  Layers,
} from "lucide-react";

export interface SerializedProject {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived" | "completed";
  ownerName: string;
  ownerEmail: string;
  membersCount: number;
  createdAt: string;
}

export const instant = false;

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
    return null;
  }

  const role = session.user.role;

  // ---------------------------------------------------------------------------
  // Admin Dashboard View
  // ---------------------------------------------------------------------------
  if (role === "admin") {
    await connectDB();

    const usersDoc = await User.find(
      {},
      "name email role createdAt"
    )
      .sort({ createdAt: -1 })
      .lean();

    const projectsDoc = await Project.find({})
      .populate("owner", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const users: DashboardUser[] = usersDoc.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role as UserRole,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    }));

    const projects: SerializedProject[] = projectsDoc.map((p) => {
      const ownerObj = p.owner as unknown as { name?: string; email?: string } | null;
      return {
        id: p._id.toString(),
        name: p.name,
        description: p.description || "",
        status: p.status,
        ownerName: ownerObj?.name || "Unassigned",
        ownerEmail: ownerObj?.email || "",
        membersCount: Array.isArray(p.members) ? p.members.length : 0,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    const adminCount = users.filter((u) => u.role === "admin").length;
    const pmCount = users.filter((u) => u.role === "pm").length;
    const memberCount = users.filter((u) => u.role === "user").length;
    const activeProjectsCount = projects.filter((p) => p.status === "active").length;

    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Shield className="size-3" />
                Admin Console
              </span>
              <span className="text-xs text-muted-foreground">
                Signed in as {session.user.name || session.user.email}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Organization Administration
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage accounts, assign roles, and review organization-wide project activities.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="outline" size="sm" type="submit" className="gap-1.5 text-xs">
                <LogOut className="size-3.5" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {adminCount} admins, {pmCount} PMs, {memberCount} members
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Project Managers
              </CardTitle>
              <Briefcase className="size-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pmCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Authorized to lead & create projects
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Projects
              </CardTitle>
              <FolderKanban className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeProjectsCount} active in system
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Role Permissions
              </CardTitle>
              <Shield className="size-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Enforced</div>
              <p className="text-xs text-muted-foreground mt-1">
                Server-side role guards active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: User Management */}
        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                User Management & Roles
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Review all registered users and instantly adjust permissions between Admin, Project Manager, and Member.
            </p>
          </div>
          <UserTable initialUsers={users} currentUserId={session.user.id} />
        </section>

        {/* Section 2: All Projects Overview */}
        <section className="space-y-4 pt-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                All Projects Overview
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Organization-wide view of all active, completed, and archived projects.
            </p>
          </div>

          {projects.length === 0 ? (
            <Card className="shadow-xs border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Folder className="size-10 text-muted-foreground/60 mb-3" />
                <h3 className="text-base font-semibold text-foreground">No projects created yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Projects created by administrators or project managers will appear here. Run `npm run seed` to load the demo project.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="shadow-xs hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold leading-snug">
                        {project.name}
                      </CardTitle>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                          project.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : project.status === "completed"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                    {project.description && (
                      <CardDescription className="line-clamp-2 text-xs mt-1">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2 text-xs text-muted-foreground border-t border-border/50 mt-2">
                    <div className="flex justify-between items-center pt-2">
                      <span>Owner</span>
                      <span className="font-medium text-foreground">{project.ownerName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Team Members</span>
                      <span className="font-medium text-foreground">
                        {project.membersCount} {project.membersCount === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Created</span>
                      <span>
                        {new Date(project.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Project Manager Dashboard View (Task 9)
  // ---------------------------------------------------------------------------
  if (role === "pm") {
    await connectDB();

    const pmProjectsDoc = await Project.find({
      $or: [{ owner: session.user.id }, { members: session.user.id }],
    })
      .populate("owner", "name email role")
      .populate("members", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    const sharedUserIdSet = new Set<string>();
    sharedUserIdSet.add(session.user.id);
    for (const p of pmProjectsDoc) {
      const ownerObj = p.owner as unknown as { _id?: unknown } | null;
      if (ownerObj?._id) sharedUserIdSet.add(ownerObj._id.toString());
      if (Array.isArray(p.members)) {
        for (const m of p.members) {
          const memberObj = m as unknown as { _id?: unknown; id?: string };
          const mId = memberObj?._id?.toString() || memberObj?.id;
          if (mId) sharedUserIdSet.add(mId);
        }
      }
    }

    const usersDoc = await User.find(
      { _id: { $in: Array.from(sharedUserIdSet) } },
      "_id name"
    )
      .sort({ name: 1 })
      .lean();

    const pmProjects: DashboardProject[] = pmProjectsDoc.map((p) => {
      const ownerObj = p.owner as unknown as { _id?: unknown; name?: string; email?: string } | null;
      const membersArr = Array.isArray(p.members)
        ? (p.members as unknown as { _id?: unknown; id?: string; name?: string; email?: string; role?: string }[])
        : [];

      return {
        id: p._id.toString(),
        name: p.name,
        description: p.description || "",
        status: p.status,
        owner: {
          id: ownerObj?._id?.toString() || "",
          name: ownerObj?.name || "Unassigned",
          email: ownerObj?.email || "",
        },
        members: membersArr.map((m) => ({
          id: m._id?.toString() || m.id || "",
          name: m.name || "",
          email: m.email || "",
          role: m.role || "user",
        })),
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    const availableUsers: AvailableMember[] = usersDoc.map((u) => ({
      id: u._id.toString(),
      name: u.name,
    }));

    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Top Header Banner for PM */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Briefcase className="size-3" />
                Project Manager
              </span>
              <span className="text-xs text-muted-foreground">
                Signed in as {session.user.name || session.user.email}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Project Management Hub
            </h1>
            <p className="text-sm text-muted-foreground">
              Lead your project teams, configure project workspaces, and track progress across boards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="outline" size="sm" type="submit" className="gap-1.5 text-xs">
                <LogOut className="size-3.5" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>

        {/* PM Projects Section */}
        <PMProjects
          initialProjects={pmProjects}
          currentUserId={session.user.id}
          availableUsers={availableUsers}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Team Member Dashboard View (Task 14)
  // ---------------------------------------------------------------------------
  await connectDB();

  const userProjectsDoc = await Project.find({
    $or: [{ owner: session.user.id }, { members: session.user.id }],
  })
    .populate("owner", "name email")
    .sort({ name: 1 })
    .lean();

  const userProjects: UserProjectItem[] = userProjectsDoc.map((p) => {
    const ownerObj = p.owner as unknown as { name?: string } | null;
    return {
      id: p._id.toString(),
      name: p.name,
      description: p.description || "",
      status: p.status,
      ownerName: ownerObj?.name || "Unassigned",
    };
  });

  const projectIds = userProjectsDoc.map((p) => p._id);

  const assignedTasksDoc = await Task.find({
    assignee: session.user.id,
    project: { $in: projectIds },
  })
    .populate("project", "name")
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();

  const assignedTasks: UserTask[] = assignedTasksDoc.map((t) => {
    const projectObj = t.project as unknown as { _id?: unknown; name?: string } | null;
    return {
      id: t._id.toString(),
      projectId: projectObj?._id?.toString() || (t.project ? t.project.toString() : ""),
      projectName: projectObj?.name || "Project",
      title: t.title,
      description: t.description || "",
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    };
  });

  // Recent comments on user's member projects
  const relevantTasks = await Task.find(
    { project: { $in: projectIds } },
    "_id"
  ).lean();
  const relevantTaskIds = relevantTasks.map((t) => t._id);

  const recentCommentsDoc = await Comment.find({ task: { $in: relevantTaskIds } })
    .populate("author", "name email role")
    .populate({
      path: "task",
      select: "title project",
      populate: { path: "project", select: "name" },
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const recentComments: UserComment[] = recentCommentsDoc.map((c) => {
    const authorObj = c.author as unknown as { name?: string; role?: string } | null;
    const taskObj = c.task as unknown as {
      _id?: unknown;
      title?: string;
      project?: { _id?: unknown; name?: string };
    } | null;

    return {
      id: c._id.toString(),
      taskId: taskObj?._id?.toString() || (c.task ? c.task.toString() : ""),
      taskTitle: taskObj?.title || "Task",
      projectId:
        taskObj?.project?._id?.toString() ||
        (taskObj?.project ? taskObj.project.toString() : ""),
      projectName: taskObj?.project?.name || "Project",
      authorName: authorObj?.name || "Team Member",
      authorRole: authorObj?.role || "user",
      body: c.body,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    };
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Header Banner for Team Member */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Users className="size-3" />
              Team Member
            </span>
            <span className="text-xs text-muted-foreground">
              Signed in as {session.user.name || session.user.email}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Workspace & Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your assigned work, stay ahead of upcoming deadlines, and follow discussion updates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit" className="gap-1.5 text-xs">
              <LogOut className="size-3.5" />
              Sign Out
            </Button>
          </form>
        </div>
      </div>

      {/* User Dashboard Component */}
      <UserDashboard
        assignedTasks={assignedTasks}
        recentComments={recentComments}
        userProjects={userProjects}
      />
    </div>
  );
}
