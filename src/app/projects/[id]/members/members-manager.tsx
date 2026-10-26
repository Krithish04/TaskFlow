"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Check,
  X,
} from "lucide-react";

export interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedTasksCount: number;
  isOwner: boolean;
}

export interface AvailableUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MembersManagerProps {
  projectId: string;
  initialOwner: MemberItem;
  initialMembers: MemberItem[];
  initialAvailableUsers: AvailableUserItem[];
  canManage: boolean;
}

export function MembersManager({
  projectId,
  initialOwner,
  initialMembers,
  initialAvailableUsers,
  canManage,
}: MembersManagerProps) {
  const router = useRouter();
  const [members, setMembers] = React.useState<MemberItem[]>(initialMembers);
  const [availableUsers, setAvailableUsers] = React.useState<AvailableUserItem[]>(initialAvailableUsers);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  // Add Member Modal State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [addSearchQuery, setAddSearchQuery] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);

  // Remove Member Confirmation State
  const [memberToRemove, setMemberToRemove] = React.useState<MemberItem | null>(null);
  const [isRemoving, setIsRemoving] = React.useState(false);

  // Filter existing members
  const filteredMembers = React.useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  // Filter available users in modal
  const filteredAvailableUsers = React.useMemo(() => {
    return availableUsers.filter((u) => {
      return (
        u.name.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(addSearchQuery.toLowerCase())
      );
    });
  }, [availableUsers, addSearchQuery]);

  // Add Member Handler
  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setIsAdding(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add member");
      }

      const addedUser = availableUsers.find((u) => u.id === selectedUserId);
      if (addedUser) {
        setMembers((prev) => [
          ...prev,
          {
            id: addedUser.id,
            name: addedUser.name,
            email: addedUser.email,
            role: addedUser.role,
            assignedTasksCount: 0,
            isOwner: false,
          },
        ]);
        setAvailableUsers((prev) => prev.filter((u) => u.id !== selectedUserId));
      }

      toast({
        title: "Member added",
        description: data.message || "User added to project",
        variant: "default",
      });

      setIsAddOpen(false);
      setSelectedUserId(null);
      setAddSearchQuery("");
      router.refresh();
    } catch (err) {
      toast({
        title: "Error adding member",
        description: err instanceof Error ? err.message : "Failed to add member",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Remove Member Handler
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberToRemove.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      // Remove from members state
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));

      // Add back to available users
      setAvailableUsers((prev) => [
        ...prev,
        {
          id: memberToRemove.id,
          name: memberToRemove.name,
          email: memberToRemove.email,
          role: memberToRemove.role,
        },
      ]);

      toast({
        title: "Member removed",
        description: data.message || "Member removed and tasks unassigned",
        variant: "default",
      });

      setMemberToRemove(null);
      router.refresh();
    } catch (err) {
      toast({
        title: "Error removing member",
        description: err instanceof Error ? err.message : "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Project Members</h2>
            <Badge variant="outline" className="text-xs font-semibold tabular-nums">
              {members.length + 1} total
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage who has access to this workspace. Removing a member unassigns their tasks and
            revokes access immediately.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <UserPlus className="size-4" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members by name or email..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border self-start sm:self-auto">
          {["all", "pm", "user"].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                roleFilter === role
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {role === "all" ? "All Roles" : role.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Members Grid / List */}
      <div className="space-y-4">
        {/* Project Owner Card (Always pinned on top) */}
        {(!searchQuery ||
          initialOwner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          initialOwner.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
          (roleFilter === "all" || initialOwner.role === roleFilter) && (
            <Card className="border-border bg-card overflow-hidden">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar size="default">
                    <AvatarFallback className="text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {initialOwner.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {initialOwner.name}
                      </span>
                      <Badge
                        variant="default"
                        size="sm"
                        className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold flex items-center gap-1"
                      >
                        <ShieldCheck className="size-3" />
                        <span>Project Owner</span>
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground truncate block mt-0.5">
                      {initialOwner.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground tabular-nums px-2.5 py-1 rounded-md bg-muted/30 border border-border/50">
                    {initialOwner.assignedTasksCount} task
                    {initialOwner.assignedTasksCount === 1 ? "" : "s"} assigned
                  </span>
                  <span className="text-xs font-medium text-muted-foreground italic px-2">
                    Cannot be removed
                  </span>
                </div>
              </div>
            </Card>
          )}

        {/* Regular Members Cards */}
        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchQuery ? "No members match your search" : "No additional members yet"}
            description={
              searchQuery
                ? "Try adjusting your search terms or role filter."
                : "Add team members to collaborate on tasks, chat, and share files."
            }
            action={
              canManage && !searchQuery ? (
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                >
                  <UserPlus className="size-3.5" />
                  <span>Add First Member</span>
                </button>
              ) : undefined
            }
            className="py-12"
          />
        ) : (
          <div className="space-y-2.5">
            {filteredMembers.map((member) => {
              const initials = member.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <Card
                  key={member.id}
                  className="border-border bg-card hover:border-border/80 transition-colors"
                >
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar size="sm">
                        <AvatarFallback className="text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {member.name}
                          </span>
                          <Badge
                            variant="outline"
                            size="sm"
                            className="text-[10px] uppercase font-medium"
                          >
                            {member.role}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
                          {member.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <span className="text-xs text-muted-foreground tabular-nums px-2.5 py-1 rounded-md bg-muted/30 border border-border/50">
                        {member.assignedTasksCount} task
                        {member.assignedTasksCount === 1 ? "" : "s"} assigned
                      </span>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setMemberToRemove(member)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent transition-colors"
                          title={`Remove ${member.name} from project`}
                        >
                          <UserMinus className="size-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Add Project Member</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a user to grant access to this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setSelectedUserId(null);
                  setAddSearchQuery("");
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* User Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                placeholder="Search eligible users..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>

            {/* Users Selection List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {filteredAvailableUsers.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {addSearchQuery
                    ? "No eligible users match your search."
                    : "All eligible users are already members of this project."}
                </div>
              ) : (
                filteredAvailableUsers.map((user) => {
                  const isSelected = selectedUserId === user.id;
                  const initials = user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar size="sm">
                          <AvatarFallback className="text-[10px] font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium truncate">{user.name}</span>
                            <Badge
                              variant="outline"
                              size="sm"
                              className="text-[9px] uppercase px-1 py-0"
                            >
                              {user.role}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {user.email}
                          </span>
                        </div>
                      </div>

                      {isSelected && <Check className="size-4 text-primary shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setSelectedUserId(null);
                  setAddSearchQuery("");
                }}
                disabled={isAdding}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedUserId || isAdding}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3.5" />
                    <span>Add Member</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Dialog */}
      {memberToRemove && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-destructive/20 bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground">
                  Remove {memberToRemove.name}?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Are you sure you want to remove{" "}
                  <strong className="text-foreground">{memberToRemove.name}</strong> from this
                  project?
                </p>
                <div className="mt-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <span>Immediate consequences:</span>
                  </p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-foreground/80">
                    <li>Their project access will be revoked immediately.</li>
                    <li>
                      <strong>{memberToRemove.assignedTasksCount} task(s)</strong> currently
                      assigned to them will be unassigned.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemoving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={isRemoving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="size-3.5" />
                    <span>Confirm Removal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
