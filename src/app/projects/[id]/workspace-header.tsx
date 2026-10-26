"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getProjectColor } from "@/lib/design-tokens";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Kanban,
  MessageSquare,
  FileText,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";
import {
  ProjectDialog,
  type ProjectFormData,
  type AvailableMember,
} from "@/components/projects/project-dialog";

export interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived" | "completed";
  color?: string;
  key?: string;
  ownerId: string;
  memberIds: string[];
}

interface WorkspaceHeaderProps {
  project: WorkspaceProject;
  canManage: boolean;
  availableMembers: AvailableMember[];
}

export function WorkspaceHeader({
  project,
  canManage,
  availableMembers,
}: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentProject, setCurrentProject] = React.useState(project);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  const colorConfig = getProjectColor(currentProject.color);

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      href: `/projects/${currentProject.id}/overview`,
      icon: LayoutDashboard,
    },
    {
      id: "board",
      label: "Board",
      href: `/projects/${currentProject.id}/board`,
      icon: Kanban,
    },
    {
      id: "chat",
      label: "Chat",
      href: `/projects/${currentProject.id}/chat`,
      icon: MessageSquare,
    },
    {
      id: "files",
      label: "Files",
      href: `/projects/${currentProject.id}/files`,
      icon: FileText,
    },
    {
      id: "analytics",
      label: "Analytics",
      href: `/projects/${currentProject.id}/analytics`,
      icon: BarChart3,
    },
    ...(canManage
      ? [
          {
            id: "members",
            label: "Members",
            href: `/projects/${currentProject.id}/members`,
            icon: Users,
          },
        ]
      : []),
  ];

  const handleUpdateProject = async (formData: ProjectFormData) => {
    const res = await fetch(`/api/projects/${currentProject.id}`, {
      method: "PATCH",
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
      throw new Error(data.error || "Failed to update project");
    }

    setCurrentProject({
      id: data.project._id || data.project.id,
      name: data.project.name,
      description: data.project.description || "",
      status: data.project.status,
      color: data.project.color,
      key: data.project.key,
      ownerId: data.project.owner?._id || data.project.owner?.id || currentProject.ownerId,
      memberIds: (data.project.members || []).map((m: { _id?: string; id?: string } | string) =>
        typeof m === "string" ? m : m._id || m.id || ""
      ),
    });

    router.refresh();
  };

  return (
    <div className="space-y-4 border-b border-border bg-background/50 pb-0">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Project Accent Icon Box */}
          <div
            className={`size-10 rounded-lg flex items-center justify-center shrink-0 border shadow-xs ${colorConfig.bgClass} ${colorConfig.borderClass}`}
          >
            <span className={`font-mono font-bold text-sm ${colorConfig.textClass}`}>
              {currentProject.key?.slice(0, 2) || "TF"}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {currentProject.name}
              </h1>

              {currentProject.key && (
                <span
                  className={`font-mono font-semibold text-xs px-2 py-0.5 rounded-md border tracking-wider ${colorConfig.bgClass} ${colorConfig.textClass} ${colorConfig.borderClass}`}
                >
                  {currentProject.key}
                </span>
              )}

              <Badge
                variant={
                  currentProject.status === "active"
                    ? "status-in-progress"
                    : currentProject.status === "completed"
                    ? "status-done"
                    : "outline"
                }
                size="sm"
                className="capitalize text-[10px]"
              >
                {currentProject.status}
              </Badge>
            </div>

            {currentProject.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {currentProject.description}
              </p>
            )}
          </div>
        </div>

        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="shrink-0 gap-1.5 self-start sm:self-auto"
          >
            <Settings className="size-3.5" />
            <span>Project Settings</span>
          </Button>
        )}
      </div>

      {/* Persistent Navigation Tabs with Accent Underline */}
      <div className="flex overflow-x-auto no-scrollbar gap-1 border-t border-border/50 pt-2 -mb-px">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.id === "overview" && pathname === `/projects/${currentProject.id}`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all shrink-0 rounded-t-md ${
                isActive
                  ? `border-primary ${colorConfig.textClass} font-semibold bg-muted/40`
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <ProjectDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdateProject}
        initialData={{
          name: currentProject.name,
          key: currentProject.key || "",
          color: currentProject.color || "blue",
          description: currentProject.description,
          status: currentProject.status,
          memberIds: currentProject.memberIds,
        }}
        availableMembers={availableMembers}
        title="Project Settings"
        description="Update project name, key, accent color, and team members."
      />
    </div>
  );
}
