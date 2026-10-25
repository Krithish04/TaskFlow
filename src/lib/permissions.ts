import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project, type IProject } from "@/models/Project";
import type { UserRole } from "@/models/User";

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Not Found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface AuthUser {
  id: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
}

export type ProjectAccessLevel = "view" | "edit" | "manage" | "comment";

export type AIFeature =
  | "breakdown"
  | "create-task"
  | "weekly-report"
  | "summarize-comments"
  | "assistant";

/**
 * Compare two identifiers (string, ObjectId, or populated document).
 */
export function matchesId(a: unknown, b: unknown): boolean {
  if (!a || !b) return false;
  const idA =
    typeof a === "object" && a !== null && "_id" in a
      ? (a as { _id: unknown })._id
      : a;
  const idB =
    typeof b === "object" && b !== null && "_id" in b
      ? (b as { _id: unknown })._id
      : b;
  return idA?.toString() === idB?.toString();
}

/* ==========================================================================
   Permission Matrix Helpers (matching PRD.md exactly)
   ========================================================================== */

/**
 * Manage users and roles: Admin only.
 */
export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}

/**
 * Create projects: Admin can create any, PM can create their own.
 */
export function canCreateProject(role: UserRole): boolean {
  return role === "admin" || role === "pm";
}

/**
 * Edit / delete projects: Admin can edit any, PM can edit only own projects.
 */
export function canEditProject(
  user: AuthUser,
  project: { owner: unknown }
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "pm") return matchesId(project.owner, user.id);
  return false;
}

export function canDeleteProject(
  user: AuthUser,
  project: { owner: unknown }
): boolean {
  return canEditProject(user, project);
}

/**
 * Add members to a project: Admin can for any, PM for own projects.
 */
export function canAddProjectMembers(
  user: AuthUser,
  project: { owner: unknown }
): boolean {
  return canEditProject(user, project);
}

/**
 * Create tasks: Admin for any, PM for own projects.
 */
export function canCreateTask(
  user: AuthUser,
  project: { owner: unknown }
): boolean {
  return canEditProject(user, project);
}

/**
 * Edit any task field: Admin for any, PM for own projects.
 */
export function canEditTask(
  user: AuthUser,
  project: { owner: unknown }
): boolean {
  return canEditProject(user, project);
}

/**
 * Move own assigned task between columns:
 * Admin: yes, PM: yes, User: yes (only if assigned).
 */
export function canMoveTask(
  user: AuthUser,
  task: { assignee?: unknown }
): boolean {
  if (user.role === "admin" || user.role === "pm") return true;
  if (user.role === "user") {
    return matchesId(task.assignee, user.id);
  }
  return false;
}

/**
 * View a project: Admin: all, PM & User: projects they belong to (owner or member).
 */
export function canViewProject(
  user: AuthUser,
  project: { owner: unknown; members?: unknown[] }
): boolean {
  if (user.role === "admin") return true;
  if (matchesId(project.owner, user.id)) return true;
  return project.members?.some((m) => matchesId(m, user.id)) ?? false;
}

/**
 * Comment on a task: Admin: all, PM & User: projects they belong to.
 */
export function canCommentOnTask(
  user: AuthUser,
  project: { owner: unknown; members?: unknown[] }
): boolean {
  return canViewProject(user, project);
}

/**
 * Use AI features:
 * Admin: all, PM: all, User: summaries and assistant only.
 */
export function canUseAIFeature(role: UserRole, feature: AIFeature): boolean {
  if (role === "admin" || role === "pm") return true;
  if (role === "user") {
    return feature === "summarize-comments" || feature === "assistant";
  }
  return false;
}

/* ==========================================================================
   Server Enforcement Helpers
   ========================================================================== */

/**
 * Enforce that the requesting client is authenticated and holds one of the required roles.
 * Returns the authenticated user or throws UnauthorizedError / ForbiddenError.
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[],
  sessionUser?: AuthUser | null
): Promise<AuthUser> {
  let user = sessionUser;
  if (user === undefined) {
    const session = await auth();
    user = session?.user
      ? {
          id: session.user.id,
          role: session.user.role,
          name: session.user.name,
          email: session.user.email,
        }
      : null;
  }

  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(user.role)) {
    throw new ForbiddenError("Insufficient permissions");
  }

  return user;
}

/**
 * Enforce that the requesting client has access to the specified project.
 * Supports "view", "comment" (member/owner/admin) or "edit", "manage" (owner/admin).
 * Accepts project ID string, ObjectId, or loaded project object.
 */
export async function requireProjectAccess(
  projectIdOrProject: string | Types.ObjectId | IProject,
  accessLevel: ProjectAccessLevel = "view",
  sessionUser?: AuthUser | null
): Promise<{ user: AuthUser; project: IProject }> {
  let user = sessionUser;
  if (user === undefined) {
    const session = await auth();
    user = session?.user
      ? {
          id: session.user.id,
          role: session.user.role,
          name: session.user.name,
          email: session.user.email,
        }
      : null;
  }

  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  let project: IProject;
  if (
    typeof projectIdOrProject === "string" ||
    projectIdOrProject instanceof Types.ObjectId
  ) {
    if (!Types.ObjectId.isValid(projectIdOrProject)) {
      throw new NotFoundError("Project not found");
    }
    await connectDB();
    const found = await Project.findById(projectIdOrProject);
    if (!found) {
      throw new NotFoundError("Project not found");
    }
    project = found;
  } else {
    project = projectIdOrProject;
  }

  if (accessLevel === "edit" || accessLevel === "manage") {
    if (!canEditProject(user, project)) {
      throw new ForbiddenError(
        "Forbidden: Only project owner or admin can perform this action"
      );
    }
  } else {
    if (!canViewProject(user, project)) {
      throw new ForbiddenError(
        "Forbidden: You do not have access to this project"
      );
    }
  }

  return { user, project };
}

/**
 * Enforce that the requesting client is permitted to use the specified AI feature.
 */
export async function requireAIPermission(
  feature: AIFeature,
  sessionUser?: AuthUser | null
): Promise<AuthUser> {
  let user = sessionUser;
  if (user === undefined) {
    const session = await auth();
    user = session?.user
      ? {
          id: session.user.id,
          role: session.user.role,
          name: session.user.name,
          email: session.user.email,
        }
      : null;
  }

  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  if (!canUseAIFeature(user.role, feature)) {
    throw new ForbiddenError(
      `Forbidden: Role '${user.role}' is not allowed to use AI feature '${feature}'`
    );
  }

  return user;
}

/**
 * Helper to convert auth errors into appropriate JSON responses in route handlers.
 */
export function handleAuthError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return null;
}
