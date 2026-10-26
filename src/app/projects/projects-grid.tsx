"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProjectColor } from "@/lib/design-tokens";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarStack } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus,
  Search,
  FolderKanban,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  ProjectDialog,
  type ProjectFormData,
  type AvailableMember,
} from "@/components/projects/project-dialog";

export interface SerializedProjectCard {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived" | "completed";
  color?: string;
  key?: string;
  owner: { id: string; name: string; email: string };
  members: { id: string; name: string; email: string; role?: string }[];
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  progress: number;
  createdAt: string;
}

interface ProjectsGridProps {
  initialProjects: SerializedProjectCard[];
  availableMembers: AvailableMember[];
  canCreate: boolean;
  currentUserId: string;
}

export function ProjectsGrid({
  initialProjects,
  availableMembers,
  canCreate,
}: ProjectsGridProps) {
  const router = useRouter();
  const [projects, setProjects] = React.useState<SerializedProjectCard[]>(initialProjects);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.key && p.key.toLowerCase().includes(search.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = async (formData: ProjectFormData) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.name.trim(),
        key: formData.key.trim().toUpperCase(),
        color: formData.color,
        description: formData.description.trim(),
        status: formData.status,
        members: formData.memberIds,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to create project");
    }

    const created = data.project;
    const newCard: SerializedProjectCard = {
      id: created._id?.toString() || created.id,
      name: created.name,
      description: created.description || "",
      status: created.status || "active",
      color: created.color || "blue",
      key: created.key || "TF",
      owner: {
        id: created.owner?._id?.toString() || created.owner?.id || "",
        name: created.owner?.name || "Owner",
        email: created.owner?.email || "",
      },
      members: (created.members || []).map(
        (m: { _id?: unknown; id?: string; name?: string; email?: string; role?: string }) => ({
          id: m._id?.toString() || m.id || "",
          name: m.name || "",
          email: m.email || "",
          role: m.role || "user",
        })
      ),
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      progress: 0,
      createdAt: created.createdAt || new Date().toISOString(),
    };

    setProjects((prev) => [newCard, ...prev]);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Filter by name or key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Filter projects by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="shrink-0 gap-1.5"
          >
            <Plus className="size-4" />
            <span>New Project</span>
          </Button>
        )}
      </div>

      {/* Grid of Projects */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={search ? "No matching projects" : "No projects found"}
          description={
            search
              ? "Try adjusting your search or status filter."
              : "Create your first project to organize tasks, chat, and files."
          }
          action={
            canCreate && !search ? (
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 mt-2"
              >
                <Plus className="size-4" />
                Create Project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const colorConfig = getProjectColor(project.color);
            const allMembers = [
              project.owner,
              ...project.members.filter((m) => m.id !== project.owner.id),
            ];

            return (
              <Card
                key={project.id}
                className="overflow-hidden border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col group relative"
              >
                {/* Color Accent Bar on Top */}
                <div className={`h-1.5 w-full ${colorConfig.dotClass}`} />

                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Header: Key Badge, Name, Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {project.key && (
                          <span
                            className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border tracking-wider ${colorConfig.bgClass} ${colorConfig.textClass} ${colorConfig.borderClass}`}
                          >
                            {project.key}
                          </span>
                        )}
                        <Badge
                          variant={
                            project.status === "active"
                              ? "status-in-progress"
                              : project.status === "completed"
                              ? "status-done"
                              : "outline"
                          }
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {project.status}
                        </Badge>
                      </div>

                      {project.overdueTasks > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <AlertCircle className="size-3" />
                          <span>{project.overdueTasks} overdue</span>
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/projects/${project.id}/overview`}
                      className="block group-hover:text-primary transition-colors"
                    >
                      <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-1">
                        {project.name}
                      </h3>
                    </Link>

                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">
                      {project.description || "No description provided."}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-muted-foreground" />
                        <span>Progress</span>
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {project.completedTasks} / {project.totalTasks} ({project.progress}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${colorConfig.dotClass}`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer: Member Avatars & Go To Project */}
                  <div className="flex items-center justify-between pt-2">
                    <AvatarStack max={4} totalCount={allMembers.length}>
                      {allMembers.map((m) => (
                        <Avatar key={m.id} size="xs" title={m.name}>
                          <AvatarFallback className="text-[9px]">
                            {m.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </AvatarStack>

                    <Link
                      href={`/projects/${project.id}/overview`}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Project Creation Dialog */}
      <ProjectDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateProject}
        availableMembers={availableMembers}
      />
    </div>
  );
}
