import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { User } from "@/models/User";
import { requireProjectAccess } from "@/lib/permissions";
import { getProjectColor, getPriorityConfig } from "@/lib/design-tokens";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Kanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Calendar,
  ArrowRight,
  Folder,
  Activity,
  PlusCircle,
  MessageSquare,
  MessageCircle,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  filterUpcomingDueTasks,
  buildActivityFeed,
  formatRelativeTime,
  type ActivityItem,
} from "@/lib/overview-utils";

export const instant = false;

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

interface PopulatedTask {
  _id: Types.ObjectId;
  id?: string;
  number: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee?: { _id?: unknown; id?: string; name?: string; email?: string } | null;
  createdBy?: { _id?: unknown; id?: string; name?: string; email?: string } | null;
}

interface PopulatedComment {
  _id: unknown;
  task?: unknown;
  body?: string;
  createdAt?: Date;
  author?: { name?: string; email?: string } | null;
}

export default async function OverviewPage({ params }: OverviewPageProps) {
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

  const project = await Project.findById(id)
    .populate("owner", "name email role")
    .populate("members", "name email role")
    .lean();

  if (!project) {
    notFound();
  }

  const projectKey = project.key || "PROJ";
  const colorConfig = getProjectColor(project.color);
  const now = new Date();

  // Fetch all tasks for this project
  const tasks = ((await Task.find({ project: id })
    .populate("assignee", "name email")
    .populate("createdBy", "name email")
    .sort({ updatedAt: -1 })
    .lean()) as unknown) as PopulatedTask[];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const overdueTasks = tasks.filter(
    (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now
  ).length;

  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Upcoming due tasks
  const upcomingTasks = filterUpcomingDueTasks(tasks, projectKey, now, 5);

  // Fetch recent comments for this project's tasks
  const taskIds = tasks.map((t) => t._id);
  const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));

  const rawComments = taskIds.length > 0
    ? (((await Comment.find({ task: { $in: taskIds } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("author", "name email")
        .lean()) as unknown) as PopulatedComment[])
    : [];

  const commentsWithTask = rawComments.map((c) => {
    const parentTask = taskMap.get(c.task?.toString() || "");
    return {
      _id: c._id,
      body: c.body,
      createdAt: c.createdAt,
      author: c.author,
      task: parentTask
        ? { number: parentTask.number, title: parentTask.title }
        : null,
    };
  });

  // Query messages collection if it exists (for Task 30+ interoperability)
  let recentMessages: Array<{
    _id: unknown;
    body: string;
    createdAt: Date;
    authorName?: string;
    authorEmail?: string;
  }> = [];

  try {
    const db = mongoose.connection.db;
    if (db) {
      const msgDocs = await db
        .collection("messages")
        .find({
          project: new Types.ObjectId(id),
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      if (msgDocs.length > 0) {
        const authorIds = [
          ...new Set(
            msgDocs
              .map((m) => m.author)
              .filter(Boolean)
              .map((aid) => aid.toString())
          ),
        ];
        const users = await User.find({ _id: { $in: authorIds } })
          .select("name email")
          .lean();
        const userMap = new Map(users.map((u) => [u._id.toString(), u]));

        recentMessages = msgDocs.map((m) => {
          const userObj = m.author ? userMap.get(m.author.toString()) : null;
          return {
            _id: m._id,
            body: m.body || "",
            createdAt: m.createdAt || new Date(),
            authorName: userObj?.name || "Chat member",
            authorEmail: userObj?.email,
          };
        });
      }
    }
  } catch {
    // Gracefully ignore if messages collection is not yet created
  }

  // Query files collection if it exists (for Task 29+ interoperability)
  let recentFiles: Array<{
    _id: unknown;
    name: string;
    createdAt: Date;
    uploaderName?: string;
    uploaderEmail?: string;
  }> = [];

  try {
    const db = mongoose.connection.db;
    if (db) {
      const fileDocs = await db
        .collection("files")
        .find({
          project: new Types.ObjectId(id),
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      if (fileDocs.length > 0) {
        const uploaderIds = [
          ...new Set(
            fileDocs
              .map((f) => f.uploader)
              .filter(Boolean)
              .map((uid) => uid.toString())
          ),
        ];
        const users = await User.find({ _id: { $in: uploaderIds } })
          .select("name email")
          .lean();
        const userMap = new Map(users.map((u) => [u._id.toString(), u]));

        recentFiles = fileDocs.map((f) => {
          const userObj = f.uploader ? userMap.get(f.uploader.toString()) : null;
          return {
            _id: f._id,
            name: f.name || "Attachment",
            createdAt: f.createdAt || new Date(),
            uploaderName: userObj?.name || "Team member",
            uploaderEmail: userObj?.email,
          };
        });
      }
    }
  } catch {
    // Gracefully ignore if files collection is not yet created
  }

  // Build merged activity feed
  const activityFeed: ActivityItem[] = buildActivityFeed({
    projectId: id,
    projectKey,
    tasks,
    comments: commentsWithTask,
    messages: recentMessages,
    files: recentFiles,
    limit: 10,
  });

  // Team members list
  const ownerObj = project.owner as unknown as {
    _id?: unknown;
    name?: string;
    email?: string;
    role?: string;
  } | null;

  const membersArr = Array.isArray(project.members)
    ? (project.members as unknown as {
        _id?: unknown;
        id?: string;
        name?: string;
        email?: string;
        role?: string;
      }[])
    : [];

  const allMembers = [
    {
      id: ownerObj?._id?.toString() || "",
      name: ownerObj?.name || "Owner",
      email: ownerObj?.email || "",
      role: ownerObj?.role || "pm",
      isOwner: true,
    },
    ...membersArr
      .filter((m) => (m._id?.toString() || m.id) !== ownerObj?._id?.toString())
      .map((m) => ({
        id: m._id?.toString() || m.id || "",
        name: m.name || "",
        email: m.email || "",
        role: m.role || "user",
        isOwner: false,
      })),
  ];

  const userRole = (session.user as { role?: string }).role || "user";
  const userId = session.user.id;
  const isOwner = ownerObj?._id?.toString() === userId;
  const canManage = userRole === "admin" || (userRole === "pm" && isOwner);

  return (
    <div className="space-y-6">
      {/* Top KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Tasks</span>
            <Folder className="size-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {totalTasks}
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">In Progress</span>
            <Clock className="size-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {inProgressTasks}
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Completed</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {completedTasks}
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Overdue</span>
            <AlertCircle
              className={`size-4 ${
                overdueTasks > 0 ? "text-rose-500" : "text-muted-foreground"
              }`}
            />
          </div>
          <div
            className={`text-2xl font-bold mt-2 tabular-nums ${
              overdueTasks > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
            }`}
          >
            {overdueTasks}
          </div>
        </Card>
      </div>

      {/* Main Grid: Left (Details, Upcoming, Activity) & Right (Team) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details & Progress */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Project Details</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono font-semibold">
                    {projectKey}
                  </Badge>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                      project.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {project.status || "active"}
                  </span>
                </div>
              </div>
              <CardDescription className="text-xs">
                Key workspace information and task completion status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {project.description || "No project description provided."}
              </p>

              {/* Progress Bar */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Task Completion</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {completedTasks} / {totalTasks} tasks ({progress}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${colorConfig.dotClass}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Quick Launch & Meta */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span>
                    Created{" "}
                    {new Date(project.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${id}/chat`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>Project Chat</span>
                  </Link>
                  <Link
                    href={`/projects/${id}/board`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <Kanban className="size-3.5" />
                    <span>Open Board</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Due Tasks */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="size-4 text-amber-500" />
                  <span>Upcoming Due</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Active tasks requiring attention soon.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs tabular-nums">
                {upcomingTasks.length}
              </Badge>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <EmptyState
                  title="No upcoming tasks"
                  description="All scheduled tasks are completed, or have no due date assigned."
                  icon={CheckCircle2}
                  className="py-8"
                />
              ) : (
                <div className="space-y-2.5">
                  {upcomingTasks.map((task) => {
                    const priorityConfig = getPriorityConfig(task.priority);
                    const initials = (task.assignee?.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <Link
                        key={task.id}
                        href={`/projects/${id}/board`}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/50 hover:border-border/80 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Badge
                            variant="outline"
                            className="text-[11px] font-mono shrink-0 bg-background"
                          >
                            {task.formattedKey}
                          </Badge>
                          <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
                          {/* Priority badge */}
                          <Badge
                            variant={priorityConfig.badgeVariant}
                            size="sm"
                            className="text-[10px] capitalize"
                          >
                            {task.priority}
                          </Badge>

                          {/* Due Date Indicator */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                              task.isOverdue
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : "bg-muted text-muted-foreground border border-border/50"
                            }`}
                          >
                            {task.isOverdue ? (
                              <AlertCircle className="size-3 shrink-0" />
                            ) : (
                              <Calendar className="size-3 shrink-0" />
                            )}
                            <span>{task.dueLabel}</span>
                          </span>

                          {/* Assignee Avatar */}
                          {task.assignee ? (
                            <div
                              className="flex items-center gap-1.5"
                              title={`Assigned to ${task.assignee.name}`}
                            >
                              <Avatar size="sm" className="size-5">
                                <AvatarFallback className="text-[9px] font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="size-4 text-blue-500" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest tasks, messages, and files in this project.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs tabular-nums">
                {activityFeed.length} updates
              </Badge>
            </CardHeader>
            <CardContent>
              {activityFeed.length === 0 ? (
                <EmptyState
                  title="No recent activity"
                  description="When team members create tasks, chat, or share files, updates will appear here."
                  icon={Activity}
                  className="py-8"
                />
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                  {activityFeed.map((item) => {
                    const initials = (item.actorName || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <div key={item.id} className="relative flex items-start gap-3 text-xs">
                        {/* Timeline Icon Node */}
                        <div className="absolute -left-6 mt-0.5 flex size-5 items-center justify-center rounded-full bg-card border border-border shadow-xs">
                          {item.type === "task_completed" && (
                            <CheckCircle2 className="size-3 text-emerald-500" />
                          )}
                          {item.type === "task_created" && (
                            <PlusCircle className="size-3 text-blue-500" />
                          )}
                          {item.type === "comment" && (
                            <MessageSquare className="size-3 text-indigo-500" />
                          )}
                          {item.type === "message" && (
                            <MessageCircle className="size-3 text-cyan-500" />
                          )}
                          {item.type === "file" && (
                            <FileText className="size-3 text-amber-500" />
                          )}
                        </div>

                        {/* Activity Row */}
                        <div className="flex-1 min-w-0 bg-muted/20 border border-border/50 rounded-lg p-2.5 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Avatar size="sm" className="size-5 shrink-0">
                                <AvatarFallback className="text-[9px] font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-foreground truncate">
                                {item.actorName}
                              </span>
                              <span className="text-muted-foreground">{item.action}</span>
                            </div>

                            <span
                              className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0"
                              title={item.timestamp.toLocaleString()}
                            >
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>

                          {/* Target Details */}
                          {(item.targetKey || item.targetName) && (
                            <div className="mt-1 flex items-center gap-1.5">
                              {item.targetKey && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono px-1 py-0 bg-background"
                                >
                                  {item.targetKey}
                                </Badge>
                              )}
                              {item.targetName && (
                                <Link
                                  href={item.link}
                                  className="text-foreground/90 hover:text-primary truncate transition-colors font-medium"
                                >
                                  {item.targetName}
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Project Members */}
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <span>Team Members</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {allMembers.length} assigned member{allMembers.length === 1 ? "" : "s"}
                </CardDescription>
              </div>
              {canManage && (
                <Link
                  href={`/projects/${id}/members`}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Manage</span>
                  <ArrowRight className="size-3" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {allMembers.map((member) => {
                  const initials = (member.name || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar size="sm">
                          <AvatarFallback className="text-[11px] font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                            <span>{member.name}</span>
                            {member.isOwner && (
                              <span title="Project Owner" className="inline-flex items-center">
                                <ShieldCheck className="size-3 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={member.isOwner ? "default" : "outline"}
                        size="sm"
                        className="text-[10px] uppercase shrink-0"
                      >
                        {member.isOwner ? "Owner" : member.role}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
