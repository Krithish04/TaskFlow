import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import {
  GET as getProjectTasks,
  POST as postProjectTask,
} from "@/app/api/projects/[id]/tasks/route";
import {
  GET as getTaskById,
  PATCH as patchTaskById,
  DELETE as deleteTaskById,
} from "@/app/api/tasks/[id]/route";
import { POST as moveTaskById } from "@/app/api/tasks/[id]/move/route";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import * as authModule from "@/auth";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

describe("Tasks API - Permissions and Operations", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const pmOwnerId = new mongoose.Types.ObjectId().toString();
  const pmOtherId = new mongoose.Types.ObjectId().toString();
  const assignedUserId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();

  const projectId = new mongoose.Types.ObjectId().toString();
  const taskId = new mongoose.Types.ObjectId().toString();

  const adminSession = {
    user: { id: adminId, name: "Admin", email: "admin@example.com", role: "admin" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const pmOwnerSession = {
    user: { id: pmOwnerId, name: "PM Owner", email: "owner@example.com", role: "pm" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const pmOtherSession = {
    user: { id: pmOtherId, name: "PM Other", email: "other@example.com", role: "pm" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const assignedUserSession = {
    user: { id: assignedUserId, name: "Assigned Dev", email: "dev@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const otherUserSession = {
    user: { id: otherUserId, name: "Other Dev", email: "otherdev@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const mockProjectDoc = {
    _id: projectId,
    name: "Taskflow Project",
    owner: new mongoose.Types.ObjectId(pmOwnerId),
    members: [new mongoose.Types.ObjectId(assignedUserId)],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // GET /api/projects/[id]/tasks
  // =========================================================================
  describe("GET /api/projects/[id]/tasks", () => {
    it("returns 400 for invalid project ID format", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/not-valid/tasks");
      const res = await getProjectTasks(req, {
        params: Promise.resolve({ id: "not-valid" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 when user is not member or owner", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(otherUserSession as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${projectId}/tasks`);
      const res = await getProjectTasks(req, {
        params: Promise.resolve({ id: projectId }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 200 with tasks when user is assigned member", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(assignedUserSession as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      const mockTasks = [
        { _id: taskId, title: "Task 1", status: "todo", order: 0 },
      ];

      vi.spyOn(Task, "find").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            sort: vi.fn().mockReturnValueOnce({
              lean: vi.fn().mockResolvedValueOnce(mockTasks),
            }),
          }),
        }),
      } as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${projectId}/tasks`);
      const res = await getProjectTasks(req, {
        params: Promise.resolve({ id: projectId }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tasks).toHaveLength(1);
    });
  });

  // =========================================================================
  // POST /api/projects/[id]/tasks
  // =========================================================================
  describe("POST /api/projects/[id]/tasks", () => {
    it("returns 403 when regular user attempts to create a task", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(assignedUserSession as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });

      const res = await postProjectTask(req, {
        params: Promise.resolve({ id: projectId }),
      });
      expect(res.status).toBe(403);
    });

    it("returns 404 when non-owner PM attempts to create task", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOtherSession as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });

      const res = await postProjectTask(req, {
        params: Promise.resolve({ id: projectId }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 400 when task title is missing", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title: "" }),
      });

      const res = await postProjectTask(req, {
        params: Promise.resolve({ id: projectId }),
      });
      expect(res.status).toBe(400);
    });

    it("creates task with status 201 when owner PM creates it", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      vi.spyOn(Task, "findOne").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce({ order: 2 }),
          }),
        }),
      } as never);

      const createdId = new mongoose.Types.ObjectId();
      vi.spyOn(Task, "create").mockResolvedValueOnce({ _id: createdId } as never);

      vi.spyOn(Task, "findById").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce({
              _id: createdId,
              title: "Created Task",
              status: "todo",
              order: 3,
            }),
          }),
        }),
      } as never);

      const req = new NextRequest(`http://localhost:3000/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title: "Created Task" }),
      });

      const res = await postProjectTask(req, {
        params: Promise.resolve({ id: projectId }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.task.title).toBe("Created Task");
    });
  });

  // =========================================================================
  // GET /api/tasks/[id]
  // =========================================================================
  describe("GET /api/tasks/[id]", () => {
    it("returns 404 when task is not found", async () => {
      vi.spyOn(Task, "findById").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockResolvedValueOnce(null),
        }),
      } as never);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${taskId}`);
      const res = await getTaskById(req, {
        params: Promise.resolve({ id: taskId }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 200 with task when user has view access", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(assignedUserSession as never);

      const mockTask = {
        _id: taskId,
        project: projectId,
        title: "Test Task",
      };

      vi.spyOn(Task, "findById").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockResolvedValueOnce(mockTask),
        }),
      } as never);

      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${taskId}`);
      const res = await getTaskById(req, {
        params: Promise.resolve({ id: taskId }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.task.title).toBe("Test Task");
    });
  });

  // =========================================================================
  // PATCH /api/tasks/[id]
  // =========================================================================
  describe("PATCH /api/tasks/[id]", () => {
    it("returns 403 when regular user attempts to edit task fields", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(assignedUserSession as never);

      const mockTask = {
        _id: taskId,
        project: projectId,
        title: "Existing Task",
      };
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTask as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated by User" }),
      });

      const res = await patchTaskById(req, {
        params: Promise.resolve({ id: taskId }),
      });
      expect(res.status).toBe(403);
    });

    it("allows owner PM to edit task fields", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);

      const mockTask = {
        _id: taskId,
        project: projectId,
        title: "Existing Task",
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTask as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated by PM", priority: "high" }),
      });

      const res = await patchTaskById(req, {
        params: Promise.resolve({ id: taskId }),
      });
      expect(res.status).toBe(200);
      expect(mockTask.title).toBe("Updated by PM");
      expect(mockTask.save).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // DELETE /api/tasks/[id]
  // =========================================================================
  describe("DELETE /api/tasks/[id]", () => {
    it("returns 403 when regular user attempts to delete a task", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(assignedUserSession as never);

      const mockTask = { _id: taskId, project: projectId };
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTask as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${taskId}`);
      const res = await deleteTaskById(req, {
        params: Promise.resolve({ id: taskId }),
      });
      expect(res.status).toBe(403);
    });

    it("allows Admin to delete task and deletes associated comments", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const mockTask = { _id: taskId, project: projectId };
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTask as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

      const commentSpy = vi.spyOn(Comment, "deleteMany").mockResolvedValueOnce({} as never);
      const taskSpy = vi.spyOn(Task, "findByIdAndDelete").mockResolvedValueOnce({} as never);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${taskId}`);
      const res = await deleteTaskById(req, {
        params: Promise.resolve({ id: taskId }),
      });
      expect(res.status).toBe(200);
      expect(commentSpy).toHaveBeenCalledWith({ task: taskId });
      expect(taskSpy).toHaveBeenCalledWith(taskId);
    });
  });

  // =========================================================================
  // POST /api/tasks/[id]/move
  // =========================================================================
  describe("POST /api/tasks/[id]/move", () => {
    it("returns 403 when regular user attempts to move a task assigned to someone else", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(otherUserSession as never);

      const mockTask = {
        _id: taskId,
        project: projectId,
        assignee: new mongoose.Types.ObjectId(assignedUserId),
      };
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTask as never);

      // Other user is added as member to project to have view access
      const projectWithBothMembers = {
        ...mockProjectDoc,
        members: [
          new mongoose.Types.ObjectId(assignedUserId),
          new mongoose.Types.ObjectId(otherUserId),
        ],
      };
      vi.spyOn(Project, "findById").mockResolvedValueOnce(projectWithBothMembers as never);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${taskId}/move`, {
        method: "POST",
        body: JSON.stringify({ status: "in_progress", order: 1 }),
      });

      const res = await moveTaskById(req, {
        params: Promise.resolve({ id: taskId }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/You can only move tasks assigned to you/i);
    });

    it("allows assigned User to move their own task", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(assignedUserSession as never);

      const mockTask = {
        _id: taskId,
        project: projectId,
        assignee: new mongoose.Types.ObjectId(assignedUserId),
        status: "todo",
        order: 0,
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTask as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);
      const updateManySpy = vi.spyOn(Task, "updateMany").mockResolvedValue({ acknowledged: true, modifiedCount: 1 } as never);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${taskId}/move`, {
        method: "POST",
        body: JSON.stringify({ status: "in_progress", order: 2 }),
      });

      const res = await moveTaskById(req, {
        params: Promise.resolve({ id: taskId }),
      });
      expect(res.status).toBe(200);
      expect(mockTask.status).toBe("in_progress");
      expect(mockTask.order).toBe(2);
      expect(mockTask.save).toHaveBeenCalled();
      expect(updateManySpy).toHaveBeenCalled();
    });

    it("allows PM to move any task in the project", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);

      const mockTask = {
        _id: taskId,
        project: projectId,
        assignee: new mongoose.Types.ObjectId(assignedUserId),
        status: "in_progress",
        order: 1,
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTask as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);
      const updateManySpy = vi.spyOn(Task, "updateMany").mockResolvedValue({ acknowledged: true, modifiedCount: 1 } as never);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${taskId}/move`, {
        method: "POST",
        body: JSON.stringify({ status: "done", order: 0 }),
      });

      const res = await moveTaskById(req, {
        params: Promise.resolve({ id: taskId }),
      });
      expect(res.status).toBe(200);
      expect(mockTask.status).toBe("done");
      expect(mockTask.order).toBe(0);
      expect(updateManySpy).toHaveBeenCalled();
    });
  });
});
