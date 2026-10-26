import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { requireProjectAccess } from "@/lib/permissions";
import { getProjectColor } from "@/lib/design-tokens";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Kanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Calendar,
  ArrowRight,
  Folder,
} from "lucide-react";

export const instant = false;

interface OverviewPageProps {
  params: Promise<{ id: string }>;
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

  const colorConfig = getProjectColor(project.color);

  // Compute project task statistics
  const now = new Date();
  const tasks = await Task.find({ project: id }).select("status dueDate").lean();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const overdueTasks = tasks.filter(
    (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now
  ).length;

  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
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

      {/* Main Grid: Overview & Team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Project Details & Quick Launch */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Project Overview</CardTitle>
              <CardDescription className="text-xs">
                Key workspace information and progress summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {project.description || "No project description provided."}
              </p>

              {/* Progress Summary */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Task Completion</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {completedTasks} / {totalTasks} tasks ({progress}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${colorConfig.dotClass}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Quick Launch */}
              <div className="pt-2 flex items-center justify-between">
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

                <a
                  href={`/projects/${id}/board`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Kanban className="size-3.5" />
                  <span>Open Kanban Board</span>
                  <ArrowRight className="size-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Project Members */}
        <div>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Team Members</CardTitle>
                <CardDescription className="text-xs">
                  {allMembers.length} assigned member{allMembers.length === 1 ? "" : "s"}
                </CardDescription>
              </div>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20 border border-border/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar size="sm">
                          <AvatarFallback className="text-[11px] font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {member.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <Badge variant="outline" size="sm" className="text-[10px] uppercase">
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
