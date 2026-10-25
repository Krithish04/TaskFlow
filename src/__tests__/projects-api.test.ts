import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { GET as getProjects, POST as postProject } from "@/app/api/projects/route";
import {
  GET as getProjectById,
  PATCH as patchProjectById,
  DELETE as deleteProjectById,
} from "@/app/api/projects/[id]/route";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import * as authModule from "@/auth";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

describe("Projects API - Permissions and Operations", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const pmId = new mongoose.Types.ObjectId().toString();
  const otherPmId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();

  const adminSession = {
    user: { id: adminId, name: "Admin", email: "admin@example.com", role: "admin" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const pmSession = {
    user: { id: pmId, name: "PM Owner", email: "pm@example.com", role: "pm" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const otherPmSession = {
    user: { id: otherPmId, name: "PM Other", email: "pm2@example.com", role: "pm" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const userSession = {
    user: { id: userId, name: "Team Member", email: "user@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // GET /api/projects
  // =========================================================================
  describe("GET /api/projects", () => {
    it("returns 401 when not logged in", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

      const res = await getProjects();
      expect(res.status).toBe(401);
    });

    it("returns 200 with all projects for admin", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const mockProjects = [
        { _id: new mongoose.Types.ObjectId(), name: "Project 1", owner: adminId },
      ];

      const findSpy = vi.spyOn(Project, "find").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            sort: vi.fn().mockReturnValueOnce({
              lean: vi.fn().mockResolvedValueOnce(mockProjects),
            }),
          }),
        }),
      } as never);

      const res = await getProjects();
      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith({});
      const data = await res.json();
      expect(data.projects).toHaveLength(1);
    });

    it("returns 200 with filtered projects for PM/User", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmSession as never);

      const findSpy = vi.spyOn(Project, "find").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            sort: vi.fn().mockReturnValueOnce({
              lean: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        }),
      } as never);

      const res = await getProjects();
      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith({
        $or: [{ owner: pmId }, { members: pmId }],
      });
    });
  });

  // =========================================================================
  // POST /api/projects
  // =========================================================================
  describe("POST /api/projects", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "New Project" }),
      });

      const res = await postProject(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when User role attempts to create project", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(userSession as never);

      const req = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "New Project" }),
      });

      const res = await postProject(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 when project name is missing", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmSession as never);

      const req = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      });

      const res = await postProject(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when member ID is invalid", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmSession as never);

      const req = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Valid Name", members: ["invalid-id"] }),
      });

      const res = await postProject(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid member ID format/i);
    });

    it("creates project successfully for PM with status 201", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmSession as never);

      const createdId = new mongoose.Types.ObjectId();
      vi.spyOn(Project, "create").mockResolvedValueOnce({
        _id: createdId,
      } as never);

      vi.spyOn(Project, "findById").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce({
              _id: createdId,
              name: "New Project",
              owner: { _id: pmId, name: "PM Owner" },
              members: [],
              status: "active",
            }),
          }),
        }),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "New Project", description: "Test Desc" }),
      });

      const res = await postProject(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.project.name).toBe("New Project");
    });
  });

  // =========================================================================
  // GET /api/projects/[id]
  // =========================================================================
  describe("GET /api/projects/[id]", () => {
    const validProjectId = new mongoose.Types.ObjectId().toString();

    it("returns 400 for invalid project ID format", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const req = new NextRequest("http://localhost:3000/api/projects/not-an-id");
      const res = await getProjectById(req, {
        params: Promise.resolve({ id: "not-an-id" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 when project does not exist", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(null as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${validProjectId}`);
      const res = await getProjectById(req, {
        params: Promise.resolve({ id: validProjectId }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 404 when user is not member, owner, or admin", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(userSession as never);

      const mockProject = {
        _id: validProjectId,
        name: "Private Project",
        owner: new mongoose.Types.ObjectId(pmId),
        members: [new mongoose.Types.ObjectId()],
      };
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProject as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${validProjectId}`);
      const res = await getProjectById(req, {
        params: Promise.resolve({ id: validProjectId }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 200 when user is a member of the project", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(userSession as never);

      const mockProject = {
        _id: validProjectId,
        name: "Team Project",
        owner: new mongoose.Types.ObjectId(pmId),
        members: [new mongoose.Types.ObjectId(userId)],
        populate: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProject as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${validProjectId}`);
      const res = await getProjectById(req, {
        params: Promise.resolve({ id: validProjectId }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.project.name).toBe("Team Project");
    });
  });

  // =========================================================================
  // PATCH /api/projects/[id]
  // =========================================================================
  describe("PATCH /api/projects/[id]", () => {
    const validProjectId = new mongoose.Types.ObjectId().toString();

    it("returns 404 when non-owner PM attempts to edit project", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(otherPmSession as never);

      const mockProject = {
        _id: validProjectId,
        name: "Original Name",
        owner: new mongoose.Types.ObjectId(pmId),
      };
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProject as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${validProjectId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });

      const res = await patchProjectById(req, {
        params: Promise.resolve({ id: validProjectId }),
      });
      expect(res.status).toBe(404);
    });

    it("allows owner PM to edit project name and status", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmSession as never);

      const mockProject = {
        _id: validProjectId,
        name: "Original Name",
        owner: new mongoose.Types.ObjectId(pmId),
        status: "active",
        members: [],
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProject as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${validProjectId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name", status: "completed" }),
      });

      const res = await patchProjectById(req, {
        params: Promise.resolve({ id: validProjectId }),
      });
      expect(res.status).toBe(200);
      expect(mockProject.name).toBe("Updated Name");
      expect(mockProject.status).toBe("completed");
      expect(mockProject.save).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // DELETE /api/projects/[id]
  // =========================================================================
  describe("DELETE /api/projects/[id]", () => {
    const validProjectId = new mongoose.Types.ObjectId().toString();

    it("returns 404 when outsider user attempts to delete project", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(userSession as never);

      const mockProject = {
        _id: validProjectId,
        owner: new mongoose.Types.ObjectId(pmId),
        members: [],
      };
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProject as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${validProjectId}`);
      const res = await deleteProjectById(req, {
        params: Promise.resolve({ id: validProjectId }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 403 when project member attempts to delete project", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(userSession as never);

      const mockProject = {
        _id: validProjectId,
        owner: new mongoose.Types.ObjectId(pmId),
        members: [new mongoose.Types.ObjectId(userId)],
      };
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProject as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${validProjectId}`);
      const res = await deleteProjectById(req, {
        params: Promise.resolve({ id: validProjectId }),
      });
      expect(res.status).toBe(403);
    });

    it("allows owner PM to delete project and cascades cleanup", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmSession as never);

      const mockProject = {
        _id: validProjectId,
        owner: new mongoose.Types.ObjectId(pmId),
      };
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProject as never);

      const mockTasks = [{ _id: new mongoose.Types.ObjectId() }];
      vi.spyOn(Task, "find").mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce(mockTasks),
        }),
      } as never);

      const commentDeleteSpy = vi.spyOn(Comment, "deleteMany").mockResolvedValueOnce({} as never);
      const taskDeleteSpy = vi.spyOn(Task, "deleteMany").mockResolvedValueOnce({} as never);
      const projectDeleteSpy = vi.spyOn(Project, "findByIdAndDelete").mockResolvedValueOnce({} as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${validProjectId}`);
      const res = await deleteProjectById(req, {
        params: Promise.resolve({ id: validProjectId }),
      });

      expect(res.status).toBe(200);
      expect(commentDeleteSpy).toHaveBeenCalled();
      expect(taskDeleteSpy).toHaveBeenCalledWith({ project: validProjectId });
      expect(projectDeleteSpy).toHaveBeenCalledWith(validProjectId);
    });
  });
});
