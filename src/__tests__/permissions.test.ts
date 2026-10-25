import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  canManageUsers,
  canCreateProject,
  canEditProject,
  canDeleteProject,
  canAddProjectMembers,
  canCreateTask,
  canEditTask,
  canMoveTask,
  canViewProject,
  canCommentOnTask,
  canUseAIFeature,
  requireRole,
  requireProjectAccess,
  matchesId,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  handleAuthError,
  type AuthUser,
} from "@/lib/permissions";
import { Project } from "@/models/Project";
import * as authModule from "@/auth";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

describe("Permission Matrix - PRD Actions", () => {
  const adminUser: AuthUser = {
    id: new mongoose.Types.ObjectId().toString(),
    role: "admin",
    name: "Admin",
    email: "admin@example.com",
  };

  const pmOwnerUser: AuthUser = {
    id: new mongoose.Types.ObjectId().toString(),
    role: "pm",
    name: "PM Owner",
    email: "pm.owner@example.com",
  };

  const pmOtherUser: AuthUser = {
    id: new mongoose.Types.ObjectId().toString(),
    role: "pm",
    name: "PM Other",
    email: "pm.other@example.com",
  };

  const memberUser: AuthUser = {
    id: new mongoose.Types.ObjectId().toString(),
    role: "user",
    name: "Member User",
    email: "member@example.com",
  };

  const nonMemberUser: AuthUser = {
    id: new mongoose.Types.ObjectId().toString(),
    role: "user",
    name: "Non Member User",
    email: "nonmember@example.com",
  };

  const demoProject = {
    _id: new mongoose.Types.ObjectId(),
    name: "Demo Project",
    owner: new mongoose.Types.ObjectId(pmOwnerUser.id),
    members: [new mongoose.Types.ObjectId(memberUser.id)],
  };

  describe("1. Manage users and roles (Admin only)", () => {
    it("allows admin", () => {
      expect(canManageUsers("admin")).toBe(true);
    });

    it("denies pm and user", () => {
      expect(canManageUsers("pm")).toBe(false);
      expect(canManageUsers("user")).toBe(false);
    });
  });

  describe("2. Create projects", () => {
    it("allows admin and pm", () => {
      expect(canCreateProject("admin")).toBe(true);
      expect(canCreateProject("pm")).toBe(true);
    });

    it("denies regular user", () => {
      expect(canCreateProject("user")).toBe(false);
    });
  });

  describe("3. Edit / Delete projects", () => {
    it("allows admin for any project", () => {
      expect(canEditProject(adminUser, demoProject)).toBe(true);
      expect(canDeleteProject(adminUser, demoProject)).toBe(true);
    });

    it("allows pm for their own projects", () => {
      expect(canEditProject(pmOwnerUser, demoProject)).toBe(true);
      expect(canDeleteProject(pmOwnerUser, demoProject)).toBe(true);
    });

    it("denies pm for another pm's project", () => {
      expect(canEditProject(pmOtherUser, demoProject)).toBe(false);
      expect(canDeleteProject(pmOtherUser, demoProject)).toBe(false);
    });

    it("denies regular user even if member", () => {
      expect(canEditProject(memberUser, demoProject)).toBe(false);
      expect(canDeleteProject(memberUser, demoProject)).toBe(false);
    });
  });

  describe("4. Add members to a project", () => {
    it("allows admin for any project", () => {
      expect(canAddProjectMembers(adminUser, demoProject)).toBe(true);
    });

    it("allows pm for own project", () => {
      expect(canAddProjectMembers(pmOwnerUser, demoProject)).toBe(true);
    });

    it("denies pm for other's project and user", () => {
      expect(canAddProjectMembers(pmOtherUser, demoProject)).toBe(false);
      expect(canAddProjectMembers(memberUser, demoProject)).toBe(false);
    });
  });

  describe("5. Create tasks & 6. Edit any task field", () => {
    it("allows admin for any project", () => {
      expect(canCreateTask(adminUser, demoProject)).toBe(true);
      expect(canEditTask(adminUser, demoProject)).toBe(true);
    });

    it("allows pm for own projects", () => {
      expect(canCreateTask(pmOwnerUser, demoProject)).toBe(true);
      expect(canEditTask(pmOwnerUser, demoProject)).toBe(true);
    });

    it("denies pm for other projects and regular users", () => {
      expect(canCreateTask(pmOtherUser, demoProject)).toBe(false);
      expect(canEditTask(pmOtherUser, demoProject)).toBe(false);
      expect(canCreateTask(memberUser, demoProject)).toBe(false);
      expect(canEditTask(memberUser, demoProject)).toBe(false);
    });
  });

  describe("7. Move own assigned task between columns", () => {
    it("allows admin and pm to move any task", () => {
      expect(canMoveTask(adminUser, { assignee: memberUser.id })).toBe(true);
      expect(canMoveTask(pmOwnerUser, { assignee: memberUser.id })).toBe(true);
      expect(canMoveTask(adminUser, { assignee: null })).toBe(true);
    });

    it("allows user to move their own assigned task", () => {
      expect(
        canMoveTask(memberUser, {
          assignee: new mongoose.Types.ObjectId(memberUser.id),
        })
      ).toBe(true);
    });

    it("denies user from moving tasks assigned to someone else or unassigned", () => {
      expect(
        canMoveTask(memberUser, {
          assignee: new mongoose.Types.ObjectId(nonMemberUser.id),
        })
      ).toBe(false);
      expect(canMoveTask(memberUser, { assignee: null })).toBe(false);
    });
  });

  describe("8. View a project & Comment on a task", () => {
    it("allows admin for any project", () => {
      expect(canViewProject(adminUser, demoProject)).toBe(true);
      expect(canCommentOnTask(adminUser, demoProject)).toBe(true);
    });

    it("allows pm when owner or member", () => {
      expect(canViewProject(pmOwnerUser, demoProject)).toBe(true);
      expect(canCommentOnTask(pmOwnerUser, demoProject)).toBe(true);

      const pmAsMemberProject = {
        _id: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
        members: [new mongoose.Types.ObjectId(pmOtherUser.id)],
      };
      expect(canViewProject(pmOtherUser, pmAsMemberProject)).toBe(true);
    });

    it("denies pm when not owner and not member", () => {
      expect(canViewProject(pmOtherUser, demoProject)).toBe(false);
      expect(canCommentOnTask(pmOtherUser, demoProject)).toBe(false);
    });

    it("allows user when member of project", () => {
      expect(canViewProject(memberUser, demoProject)).toBe(true);
      expect(canCommentOnTask(memberUser, demoProject)).toBe(true);
    });

    it("denies user when not a member of project", () => {
      expect(canViewProject(nonMemberUser, demoProject)).toBe(false);
      expect(canCommentOnTask(nonMemberUser, demoProject)).toBe(false);
    });
  });

  describe("9. Use AI features", () => {
    const allFeatures = [
      "breakdown",
      "create-task",
      "weekly-report",
      "summarize-comments",
      "assistant",
    ] as const;

    it("allows admin and pm access to all AI features", () => {
      for (const feat of allFeatures) {
        expect(canUseAIFeature("admin", feat)).toBe(true);
        expect(canUseAIFeature("pm", feat)).toBe(true);
      }
    });

    it("allows user only summaries and assistant", () => {
      expect(canUseAIFeature("user", "summarize-comments")).toBe(true);
      expect(canUseAIFeature("user", "assistant")).toBe(true);
      expect(canUseAIFeature("user", "breakdown")).toBe(false);
      expect(canUseAIFeature("user", "create-task")).toBe(false);
      expect(canUseAIFeature("user", "weekly-report")).toBe(false);
    });
  });
});

describe("Server Helper: requireRole()", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws UnauthorizedError when session is missing", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

    await expect(requireRole("admin")).rejects.toThrow(UnauthorizedError);
  });

  it("throws ForbiddenError when user does not have required role", async () => {
    const userSession = {
      user: {
        id: "user-1",
        role: "user",
        name: "User",
        email: "user@example.com",
      },
      expires: "2099-01-01",
    };
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(userSession as never);

    await expect(requireRole("admin")).rejects.toThrow(ForbiddenError);
  });

  it("succeeds when user role matches single allowed role", async () => {
    const adminSession = {
      user: {
        id: "admin-1",
        role: "admin",
        name: "Admin",
        email: "admin@example.com",
      },
      expires: "2099-01-01",
    };
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

    const result = await requireRole("admin");
    expect(result.id).toBe("admin-1");
    expect(result.role).toBe("admin");
  });

  it("succeeds when user role matches one in array of allowed roles", async () => {
    const pmUser: AuthUser = {
      id: "pm-1",
      role: "pm",
      name: "PM",
      email: "pm@example.com",
    };

    const result = await requireRole(["admin", "pm"], pmUser);
    expect(result.id).toBe("pm-1");
  });
});

describe("Server Helper: requireProjectAccess()", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const pmUser: AuthUser = {
    id: new mongoose.Types.ObjectId().toString(),
    role: "pm",
    name: "PM",
    email: "pm@example.com",
  };

  const otherUser: AuthUser = {
    id: new mongoose.Types.ObjectId().toString(),
    role: "user",
    name: "User",
    email: "user@example.com",
  };

  const mockProject = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Project",
    owner: new mongoose.Types.ObjectId(pmUser.id),
    members: [],
  };

  it("throws UnauthorizedError when user is not authenticated", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

    await expect(
      requireProjectAccess(mockProject as never, "view")
    ).rejects.toThrow(UnauthorizedError);
  });

  it("throws NotFoundError when project cannot be found by ID", async () => {
    vi.spyOn(Project, "findById").mockResolvedValueOnce(null as never);

    await expect(
      requireProjectAccess(new mongoose.Types.ObjectId().toString(), "view", pmUser)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when project ID is a malformed non-ObjectId string", async () => {
    await expect(
      requireProjectAccess("invalid-project-id", "view", pmUser)
    ).rejects.toThrow(NotFoundError);
  });

  it("allows owner PM to access with 'edit' or 'manage'", async () => {
    const result = await requireProjectAccess(
      mockProject as never,
      "edit",
      pmUser
    );
    expect(result.project).toBe(mockProject);
    expect(result.user).toBe(pmUser);
  });

  it("throws ForbiddenError when non-owner PM tries 'edit'", async () => {
    const nonOwnerPM: AuthUser = {
      id: new mongoose.Types.ObjectId().toString(),
      role: "pm",
      name: "Other PM",
      email: "otherpm@example.com",
    };

    await expect(
      requireProjectAccess(mockProject as never, "edit", nonOwnerPM)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when regular user tries 'manage'", async () => {
    await expect(
      requireProjectAccess(mockProject as never, "manage", otherUser)
    ).rejects.toThrow(ForbiddenError);
  });

  it("fetches project from database when string ID is passed", async () => {
    vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProject as never);

    const result = await requireProjectAccess(
      mockProject._id.toString(),
      "view",
      pmUser
    );
    expect(result.project).toBe(mockProject);
  });
});

describe("matchesId and handleAuthError utilities", () => {
  it("matches string and ObjectId correctly", () => {
    const id = new mongoose.Types.ObjectId();
    expect(matchesId(id, id.toString())).toBe(true);
    expect(matchesId(id, new mongoose.Types.ObjectId())).toBe(false);
    expect(matchesId(null, id)).toBe(false);
  });

  it("handleAuthError returns proper HTTP response status", async () => {
    const unauthRes = handleAuthError(new UnauthorizedError("Unauth"));
    expect(unauthRes?.status).toBe(401);

    const forbiddenRes = handleAuthError(new ForbiddenError("No access"));
    expect(forbiddenRes?.status).toBe(403);

    const notFoundRes = handleAuthError(new NotFoundError("Missing"));
    expect(notFoundRes?.status).toBe(404);

    const genericRes = handleAuthError(new Error("Unknown"));
    expect(genericRes).toBeNull();
  });
});
