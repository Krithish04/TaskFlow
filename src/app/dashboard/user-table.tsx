"use client";

import * as React from "react";
import type { UserRole } from "@/models/User";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Search,
  ShieldCheck,
  Briefcase,
  User as UserIcon,
  Loader2,
  Check,
  AlertCircle,
  Filter,
  Users,
} from "lucide-react";

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

interface UserTableProps {
  initialUsers: DashboardUser[];
  currentUserId: string;
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  admin: {
    label: "Admin",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: ShieldCheck,
  },
  pm: {
    label: "Project Manager",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: Briefcase,
  },
  user: {
    label: "Member",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: UserIcon,
  },
};

export function UserTable({ initialUsers, currentUserId }: UserTableProps) {
  const [users, setUsers] = React.useState<DashboardUser[]>(initialUsers);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [updatingUserId, setUpdatingUserId] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || targetUser.role === newRole) return;

    setUpdatingUserId(userId);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      setStatusMessage({
        type: "success",
        text: `Role for ${targetUser.name} updated to ${ROLE_CONFIG[newRole].label}.`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error updating role",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
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
              <Check className="size-4 shrink-0" />
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

      {/* Toolbar: Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="pm">Project Managers</option>
            <option value="user">Members</option>
          </select>
          <span className="text-xs text-muted-foreground ml-2">
            {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
          </span>
        </div>
      </div>

      {/* User Table */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs uppercase font-medium text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">User</th>
                <th scope="col" className="px-4 py-3">Current Role</th>
                <th scope="col" className="px-4 py-3 hidden md:table-cell">Joined</th>
                <th scope="col" className="px-4 py-3 text-right">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4">
                    <EmptyState
                      icon={Users}
                      title="No users match your criteria"
                      description="Try adjusting your search query or role filter."
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role];
                  const Icon = roleConfig.icon;
                  const isCurrent = user.id === currentUserId;
                  const isUpdating = updatingUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground truncate text-xs sm:text-sm">
                                {user.name}
                              </span>
                              {isCurrent && (
                                <Badge variant="secondary" size="sm" className="px-1.5 py-0 text-[10px]">
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="block text-xs text-muted-foreground truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            user.role === "admin"
                              ? "default"
                              : user.role === "pm"
                              ? "status-in-progress"
                              : "status-done"
                          }
                          size="sm"
                          className="gap-1 font-medium"
                        >
                          <Icon className="size-3" />
                          {roleConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground tabular-nums">
                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isUpdating && (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          )}
                          <select
                            value={user.role}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value as UserRole)
                            }
                            aria-label={`Change role for ${user.name}`}
                            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                          >
                            <option value="admin">Admin</option>
                            <option value="pm">Project Manager</option>
                            <option value="user">Member</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
