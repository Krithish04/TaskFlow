import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import {
  GET as getTaskComments,
  POST as postTaskComment,
} from "@/app/api/tasks/[id]/comments/route";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import * as authModule from "@/auth";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

describe("Comments API - GET & POST /api/tasks/[id]/comments", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const pmOwnerId = new mongoose.Types.ObjectId().toString();
  const memberUserId = new mongoose.Types.ObjectId().toString();
  const outsideUserId = new mongoose.Types.ObjectId().toString();

  const projectId = new mongoose.Types.ObjectId().toString();
  const taskId = new mongoose.Types.ObjectId().toString();

  const adminSession = {
    user: { id: adminId, name: "Admin", email: "admin@example.com", role: "admin" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const pmOwnerSession = {
    user: { id: pmOwnerId, name: "PM Owner", email: "pm@example.com", role: "pm" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const memberUserSession = {
    user: { id: memberUserId, name: "Member User", email: "member@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const outsideUserSession = {
    user: { id: outsideUserId, name: "Outside User", email: "outside@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const mockProjectDoc = {
    _id: projectId,
    name: "TaskFlow Core",
    owner: pmOwnerId,
    members: [memberUserId],
  };

  const mockTaskDoc = {
    _id: taskId,
    title: "Implement Drawer Comments",
    project: projectId,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/tasks/[id]/comments", () => {
    it("returns 400 for invalid task ID", async () => {
      const res = await getTaskComments(
        new NextRequest("http://localhost/api/tasks/not-an-id/comments"),
        { params: Promise.resolve({ id: "not-an-id" }) }
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid task ID");
    });

    it("returns 404 if task is not found", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(null as never);

      const res = await getTaskComments(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Task not found");
    });

    it("returns 401 if unauthenticated", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(mockTaskDoc as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectDoc as never);
      vi.spyOn(authModule, "auth").mockResolvedValue(null as never);

      const res = await getTaskComments(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 if user is not in the project and not admin", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(mockTaskDoc as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectDoc as never);
      vi.spyOn(authModule, "auth").mockResolvedValue(outsideUserSession as never);

      const res = await getTaskComments(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 200 with comments for project member", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(mockTaskDoc as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectDoc as never);
      vi.spyOn(authModule, "auth").mockResolvedValue(memberUserSession as never);

      const mockComments = [
        {
          _id: "c1",
          task: taskId,
          body: "First comment",
          author: { _id: memberUserId, name: "Member User", email: "member@example.com" },
          createdAt: new Date().toISOString(),
        },
      ];

      const findQuery = {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockComments),
      };
      vi.spyOn(Comment, "find").mockReturnValue(findQuery as never);

      const res = await getTaskComments(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.comments).toHaveLength(1);
      expect(data.comments[0].body).toBe("First comment");
    });

    it("returns 200 with comments for Admin even if not a member", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(mockTaskDoc as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectDoc as never);
      vi.spyOn(authModule, "auth").mockResolvedValue(adminSession as never);

      const findQuery = {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(Comment, "find").mockReturnValue(findQuery as never);

      const res = await getTaskComments(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.comments).toEqual([]);
    });
  });

  describe("POST /api/tasks/[id]/comments", () => {
    it("returns 400 for invalid task ID", async () => {
      const res = await postTaskComment(
        new NextRequest("http://localhost/api/tasks/bad-id/comments", {
          method: "POST",
          body: JSON.stringify({ body: "Hello" }),
        }),
        { params: Promise.resolve({ id: "bad-id" }) }
      );
      expect(res.status).toBe(400);
    });

    it("returns 413 if content-length exceeds maximum body size", async () => {
      const res = await postTaskComment(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`, {
          method: "POST",
          headers: {
            "content-length": "20000",
          },
          body: JSON.stringify({ body: "Big payload" }),
        }),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(413);
      const data = await res.json();
      expect(data.error).toBe("Request body too large");
    });

    it("returns 400 for invalid body or empty comment", async () => {
      const res = await postTaskComment(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: "   " }),
        }),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
    });

    it("returns 404 if task does not exist", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(null as never);

      const res = await postTaskComment(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: "Valid comment text" }),
        }),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 401 if unauthenticated", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(mockTaskDoc as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectDoc as never);
      vi.spyOn(authModule, "auth").mockResolvedValue(null as never);

      const res = await postTaskComment(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: "Valid comment text" }),
        }),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 if user does not belong to project", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(mockTaskDoc as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectDoc as never);
      vi.spyOn(authModule, "auth").mockResolvedValue(outsideUserSession as never);

      const res = await postTaskComment(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: "Valid comment text" }),
        }),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 201 and creates comment when called by project member", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(mockTaskDoc as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectDoc as never);
      vi.spyOn(authModule, "auth").mockResolvedValue(memberUserSession as never);

      const createdDoc = {
        _id: new mongoose.Types.ObjectId().toString(),
        task: taskId,
        author: memberUserId,
        body: "Hello from team member",
        populate: vi.fn().mockResolvedValue({
          _id: "c1",
          task: taskId,
          body: "Hello from team member",
          author: { _id: memberUserId, name: "Member User", email: "member@example.com" },
        }),
      };

      vi.spyOn(Comment, "create").mockResolvedValue(createdDoc as never);

      const res = await postTaskComment(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: "Hello from team member" }),
        }),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.comment).toBeDefined();
      expect(Comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          task: taskId,
          author: memberUserId,
          body: "Hello from team member",
        })
      );
    });

    it("returns 201 and creates comment when called by PM owner", async () => {
      vi.spyOn(Task, "findById").mockResolvedValue(mockTaskDoc as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectDoc as never);
      vi.spyOn(authModule, "auth").mockResolvedValue(pmOwnerSession as never);

      const createdDoc = {
        _id: "c2",
        task: taskId,
        author: pmOwnerId,
        body: "PM comment",
        populate: vi.fn().mockResolvedValue({
          _id: "c2",
          body: "PM comment",
          author: { _id: pmOwnerId, name: "PM Owner" },
        }),
      };
      vi.spyOn(Comment, "create").mockResolvedValue(createdDoc as never);

      const res = await postTaskComment(
        new NextRequest(`http://localhost/api/tasks/${taskId}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: "PM comment" }),
        }),
        { params: Promise.resolve({ id: taskId }) }
      );
      expect(res.status).toBe(201);
    });
  });
});
