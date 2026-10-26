"use client";

import * as React from "react";
import { PROJECT_COLOR_PALETTE } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { X, Loader2, Check } from "lucide-react";
import { generateProjectKey } from "@/lib/project-utils";

export interface ProjectFormData {
  name: string;
  key: string;
  color: string;
  description: string;
  status: "active" | "archived" | "completed";
  memberIds: string[];
}

export interface AvailableMember {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  initialData?: Partial<ProjectFormData> | null;
  availableMembers?: AvailableMember[];
  title?: string;
  description?: string;
}

export function ProjectDialog(props: ProjectDialogProps) {
  if (!props.isOpen) return null;

  const dialogKey = `${props.initialData?.name || "new"}-${props.initialData?.key || ""}`;
  return <ProjectDialogForm key={dialogKey} {...props} />;
}

function ProjectDialogForm({
  onClose,
  onSubmit,
  initialData,
  availableMembers = [],
  title,
  description,
}: ProjectDialogProps) {
  const isEditing = Boolean(initialData?.name);

  const [formData, setFormData] = React.useState<ProjectFormData>({
    name: initialData?.name || "",
    key: initialData?.key || "",
    color: initialData?.color || "blue",
    description: initialData?.description || "",
    status: initialData?.status || "active",
    memberIds: initialData?.memberIds || [],
  });

  const [hasManuallyEditedKey, setHasManuallyEditedKey] = React.useState(
    Boolean(initialData?.key)
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      const updated = { ...prev, name: val };
      if (!hasManuallyEditedKey) {
        updated.key = generateProjectKey(val);
      }
      return updated;
    });
  };

  const handleKeyChange = (val: string) => {
    setHasManuallyEditedKey(true);
    const sanitized = val.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);
    setFormData((prev) => ({ ...prev, key: sanitized }));
  };

  const handleMemberToggle = (memberId: string) => {
    setFormData((prev) => {
      const exists = prev.memberIds.includes(memberId);
      return {
        ...prev,
        memberIds: exists
          ? prev.memberIds.filter((id) => id !== memberId)
          : [...prev.memberIds, memberId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!formData.key.trim() || formData.key.length < 2 || formData.key.length > 5) {
      setError("Project key must be 2 to 5 uppercase letters.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-0">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl border-border bg-card">
        <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-border">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              {title || (isEditing ? "Edit Project" : "Create New Project")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {description ||
                (isEditing
                  ? "Update project settings, color accent, key, and members."
                  : "Set up a new workspace with a distinct color and key.")}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name" className="text-xs font-medium">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="e.g. Mobile App Redesign"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              maxLength={100}
              required
            />
          </div>

          {/* Project Key & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="project-key" className="text-xs font-medium">
                  Key <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] text-muted-foreground">2-5 letters</span>
              </div>
              <Input
                id="project-key"
                placeholder="e.g. MAR"
                value={formData.key}
                onChange={(e) => handleKeyChange(e.target.value)}
                disabled={isSubmitting}
                maxLength={5}
                className="font-mono uppercase tracking-wider"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-status" className="text-xs font-medium">
                Status
              </Label>
              <select
                id="project-status"
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as ProjectFormData["status"],
                  }))
                }
                disabled={isSubmitting}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Color Palette Picker */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Project Accent Color</Label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {PROJECT_COLOR_PALETTE.map((colorOption) => {
                const isSelected = formData.color === colorOption.id;
                return (
                  <button
                    key={colorOption.id}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, color: colorOption.id }))
                    }
                    className={`size-7 rounded-full flex items-center justify-center transition-all ${
                      colorOption.dotClass
                    } ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-xs"
                        : "opacity-80 hover:opacity-100 hover:scale-105"
                    }`}
                    aria-label={`Select ${colorOption.name} color`}
                  >
                    {isSelected && <Check className="size-3.5 text-white stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="project-desc" className="text-xs font-medium">
              Description
            </Label>
            <textarea
              id="project-desc"
              rows={3}
              placeholder="Brief overview of project goals and scope..."
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              disabled={isSubmitting}
              maxLength={1000}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Team Members */}
          {availableMembers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Team Members</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-border rounded-lg bg-muted/20">
                {availableMembers.map((member) => {
                  const isChecked = formData.memberIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs transition-colors ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 text-foreground"
                          : "bg-background border-border hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleMemberToggle(member.id)}
                        className="rounded-xs border-input text-primary focus:ring-primary size-3.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{member.name}</p>
                        {member.email && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
