"use client";

import * as React from "react";
import Link from "next/link";
import { ProjectStatus } from "@/models/Project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Layers,
  FileText,
} from "lucide-react";
import { WeeklyReportDialog } from "./weekly-report-dialog";

interface DashboardProjectMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DashboardProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: DashboardProjectMember[];
  createdAt: string;
}

export interface AvailableMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

interface PMProjectsProps {
  initialProjects: DashboardProject[];
  currentUserId: string;
  availableUsers: AvailableMember[];
}

export function PMProjects({
  initialProjects,
  currentUserId,
  availableUsers,
}: PMProjectsProps) {
  const [projects, setProjects] = React.useState<DashboardProject[]>(initialProjects);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [isCreating, setIsCreating] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<DashboardProject | null>(null);
  const [selectedReportProject, setSelectedReportProject] = React.useState<DashboardProject | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form states
  const [formData, setFormData] = React.useState<{
    name: string;
    description: string;
    status: ProjectStatus;
    memberIds: string[];
  }>({
    name: "",
    description: "",
    status: "active",
    memberIds: [],
  });

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData({
      name: "",
      description: "",
      status: "active",
      memberIds: [],
    });
    setIsCreating(true);
    setStatusMessage(null);
  };

  const openEditModal = (project: DashboardProject) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      memberIds: project.members.map((m) => m.id),
    });
    setIsCreating(true);
    setStatusMessage(null);
  };

  const handleMemberToggle = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter((id) => id !== userId)
        : [...prev.memberIds, userId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (editingProject) {
        // PATCH existing project
        const res = await fetch(`/api/projects/${editingProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim(),
            status: formData.status,
            members: formData.memberIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update project");

        setProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id
              ? {
                  ...p,
                  name: data.project.name,
                  description: data.project.description,
                  status: data.project.status,
                  members: ((data.project.members || []) as { _id?: unknown; id?: string; name: string; email: string; role: string }[]).map((m) => ({
                    id: m._id?.toString() || m.id || "",
                    name: m.name,
                    email: m.email,
                    role: m.role,
                  })),
                }
              : p
          )
        );
        setStatusMessage({
          type: "success",
          text: `Project "${data.project.name}" updated successfully.`,
        });
      } else {
        // POST new project
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim(),
            status: formData.status,
            members: formData.memberIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create project");

        const newProject: DashboardProject = {
          id: data.project._id?.toString() || data.project.id,
          name: data.project.name,
          description: data.project.description,
          status: data.project.status,
          owner: {
            id: data.project.owner?._id?.toString() || data.project.owner?.id,
            name: data.project.owner?.name || "You",
            email: data.project.owner?.email || "",
          },
          members: ((data.project.members || []) as { _id?: unknown; id?: string; name: string; email: string; role: string }[]).map((m) => ({
            id: m._id?.toString() || m.id || "",
            name: m.name,
            email: m.email,
            role: m.role,
          })),
          createdAt: data.project.createdAt || new Date().toISOString(),
        };

        setProjects((prev) => [newProject, ...prev]);
        setStatusMessage({
          type: "success",
          text: `Project "${newProject.name}" created successfully.`,
        });
      }

      setIsCreating(false);
      setEditingProject(null);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Action failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: DashboardProject) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This will delete all its tasks.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete project");

      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      setStatusMessage({
        type: "success",
        text: `Project "${project.name}" deleted.`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete project",
      });
    }
  };

  const filteredProjects = React.useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const activeCount = projects.filter((p) => p.status === "active").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;
  const ownedCount = projects.filter((p) => p.owner.id === currentUserId).length;

  return (
    <div className="space-y-6">
      {/* Metric Cards for PM */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              {ownedCount} managed by you
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
            <Clock className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In active development</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Finished deliverables</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Teammates
            </CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for assignment</p>
          </CardContent>
        </Card>
      </div>

      {statusMessage && (
        <div
          role="status"
          className={`flex items-center justify-between gap-2 rounded-lg p-3 text-sm border transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <Button onClick={openCreateModal} className="gap-1.5 font-medium shrink-0">
          <Plus className="size-4" />
          New Project
        </Button>
      </div>

      {/* Creation / Edit Modal/Card */}
      {isCreating && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">
                {editingProject ? "Edit Project" : "Create New Project"}
              </CardTitle>
              <CardDescription className="text-xs">
                {editingProject
                  ? "Update project details, status, or member assignments."
                  : "Set up a new workspace for your team and assign initial members."}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(false)}
              className="size-8 p-0"
            >
              <X className="size-4" />
            </Button>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  required
                  placeholder="e.g. Website Redesign Q4"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="projectDescription">Description</Label>
                <textarea
                  id="projectDescription"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  placeholder="Goals, deliverables, or project scope..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="projectStatus">Status</Label>
                <select
                  id="projectStatus"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as ProjectStatus,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={isSubmitting}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Team Members</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-lg bg-muted/20">
                  {availableUsers
                    .filter((u) => u.id !== currentUserId)
                    .map((user) => {
                      const isSelected = formData.memberIds.includes(user.id);
                      return (
                        <label
                          key={user.id}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? "bg-primary/10 border-primary/40 text-foreground"
                              : "bg-background border-border hover:bg-muted/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleMemberToggle(user.id)}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{user.name}</p>
                            {user.email ? (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {user.email}
                              </p>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingProject ? (
                    "Save Changes"
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="size-10 text-muted-foreground/60 mb-3" />
            <h3 className="text-base font-semibold text-foreground">No projects found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {projects.length === 0
                ? "You haven't created or been assigned to any projects yet. Click 'New Project' above to start your first project."
                : "No projects match your search criteria."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const isOwner = project.owner.id === currentUserId;

            return (
              <Card
                key={project.id}
                className="flex flex-col justify-between shadow-xs hover:border-primary/40 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
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
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isOwner
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isOwner ? "Owner" : "Member"}
                    </span>
                  </div>
                  <CardTitle className="text-base font-semibold leading-snug mt-2">
                    {project.name}
                  </CardTitle>
                  {project.description && (
                    <CardDescription className="line-clamp-2 text-xs mt-1">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs text-muted-foreground border-t border-border/50 mt-auto">
                  <div className="flex justify-between items-center pt-3">
                    <span>Project Lead</span>
                    <span className="font-medium text-foreground">
                      {isOwner ? "You" : project.owner.name}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Team Members</span>
                    <span className="font-medium text-foreground">
                      {project.members.length} {project.members.length === 1 ? "member" : "members"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>Open Board</span>
                        <ArrowRight className="size-3.5" />
                      </Link>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReportProject(project)}
                        className="gap-1 text-[11px] h-6 px-2 border-primary/30 text-primary hover:bg-primary/5 font-medium"
                      >
                        <FileText className="size-3" />
                        Weekly Report
                      </Button>
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(project)}
                          title="Edit Project"
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(project)}
                          title="Delete Project"
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Weekly Status Report Dialog */}
      {selectedReportProject && (
        <WeeklyReportDialog
          projectId={selectedReportProject.id}
          projectName={selectedReportProject.name}
          isOpen={!!selectedReportProject}
          onClose={() => setSelectedReportProject(null)}
        />
      )}
    </div>
  );
}
