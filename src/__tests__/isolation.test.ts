import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { GET as getProjects } from "@/app/api/projects/route";
import {
  GET as getProjectById,
  PATCH as patchProjectById,
  DELETE as deleteProjectById,
} from "@/app/api/projects/[id]/route";
import {
  GET as getProjectTasks,
  POST as postProjectTask,
} from "@/app/api/projects/[id]/tasks/route";
import {
  GET as getTaskById,
  PATCH as patchTaskById,
  DELETE as deleteTaskById,
} from "@/app/api/tasks/[id]/route";
import { POST as moveTask } from "@/app/api/tasks/[id]/move/route";
import {
  GET as getComments,
  POST as postComment,
} from "@/app/api/tasks/[id]/comments/route";
import { GET as getUsers } from "@/app/api/users/route";
import { POST as postAssistant } from "@/app/api/ai/assistant/route";
import { POST as postSummarizeComments } from "@/app/api/ai/summarize-comments/route";
import { POST as postBreakdown } from "@/app/api/ai/breakdown/route";
import { POST as postCreateTask } from "@/app/api/ai/create-task/route";
import { POST as postWeeklyReport } from "@/app/api/ai/weekly-report/route";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { User } from "@/models/User";
import * as authModule from "@/auth";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: vi.fn().mockReturnValue({
      toTextStreamResponse: vi.fn().mockReturnValue(new Response("AI stream content", { status: 200 })),
      toDataStreamResponse: vi.fn().mockReturnValue(new Response("AI stream content", { status: 200 })),
    }),
    generateText: vi.fn().mockResolvedValue({
      text: "Summary of discussion",
    }),
    generateObject: vi.fn().mockResolvedValue({
      object: {
        tasks: [{ title: "Subtask 1", description: "Desc", priority: "medium", estimatedHours: 4 }],
        title: "Drafted Task",
        description: "Drafted description",
        priority: "medium",
        status: "todo",
        assigneeId: null,
        assigneeName: null,
        dueDate: null,
        summary: "Weekly progress summary",
        keyAchievements: ["Achievement 1"],
        blockersAndRisks: [],
        upcomingPriorities: ["Priority 1"],
      },
    }),
  };
});

describe("Strict Project Isolation & Permissions Matrix", () => {
  // Test Identifiers
  const adminId = new mongoose.Types.ObjectId().toString();
  const pmAId = new mongoose.Types.ObjectId().toString();
  const pmBId = new mongoose.Types.ObjectId().toString();
  const user1Id = new mongoose.Types.ObjectId().toString();
  const user2Id = new mongoose.Types.ObjectId().toString();

  const projectAId = new mongoose.Types.ObjectId().toString();
  const projectBId = new mongoose.Types.ObjectId().toString();

  const taskAId = new mongoose.Types.ObjectId().toString();
  const taskBId = new mongoose.Types.ObjectId().toString();

  // Sessions
  const adminSession = {
    user: { id: adminId, name: "Admin", email: "admin@example.com", role: "admin" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const pmASession = {
    user: { id: pmAId, name: "PM Alice (Owner of A)", email: "pma@example.com", role: "pm" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const user1Session = {
    user: { id: user1Id, name: "User 1 (Member of A)", email: "user1@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const user2Session = {
    user: { id: user2Id, name: "User 2 (Member of B)", email: "user2@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  // Model Document Mocks
  const mockProjectA = {
    _id: new mongoose.Types.ObjectId(projectAId),
    name: "Project A",
    description: "Alpha Project",
    status: "active",
    owner: new mongoose.Types.ObjectId(pmAId),
    members: [new mongoose.Types.ObjectId(user1Id)],
    save: vi.fn().mockResolvedValue(true),
    populate: vi.fn().mockResolvedValue(true),
  };

  const mockProjectB = {
    _id: new mongoose.Types.ObjectId(projectBId),
    name: "Project B",
    description: "Beta Project",
    status: "active",
    owner: new mongoose.Types.ObjectId(pmBId),
    members: [new mongoose.Types.ObjectId(user2Id)],
    save: vi.fn().mockResolvedValue(true),
    populate: vi.fn().mockResolvedValue(true),
  };

  const mockTaskA = {
    _id: new mongoose.Types.ObjectId(taskAId),
    title: "Task A",
    description: "Description A",
    status: "todo",
    priority: "high",
    project: new mongoose.Types.ObjectId(projectAId),
    assignee: new mongoose.Types.ObjectId(user1Id),
    order: 0,
    save: vi.fn().mockResolvedValue(true),
    populate: vi.fn().mockResolvedValue(true),
  };

  const mockTaskB = {
    _id: new mongoose.Types.ObjectId(taskBId),
    title: "Task B",
    description: "Description B",
    status: "todo",
    priority: "medium",
    project: new mongoose.Types.ObjectId(projectBId),
    assignee: new mongoose.Types.ObjectId(user2Id),
    order: 0,
    save: vi.fn().mockResolvedValue(true),
    populate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Project Query Isolation (GET /api/projects)
  // =========================================================================
  describe("1. Project Query Isolation (GET /api/projects)", () => {
    it("user1 only receives Project A and never Project B", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);

      const findSpy = vi.spyOn(Project, "find").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            sort: vi.fn().mockReturnValueOnce({
              lean: vi.fn().mockResolvedValueOnce([mockProjectA]),
            }),
          }),
        }),
      } as never);

      const res = await getProjects();
      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith({
        $or: [{ owner: user1Id }, { members: user1Id }],
      });
      const data = await res.json();
      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].name).toBe("Project A");
    });

    it("admin receives all projects (A and B)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const findSpy = vi.spyOn(Project, "find").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            sort: vi.fn().mockReturnValueOnce({
              lean: vi.fn().mockResolvedValueOnce([mockProjectA, mockProjectB]),
            }),
          }),
        }),
      } as never);

      const res = await getProjects();
      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith({});
      const data = await res.json();
      expect(data.projects).toHaveLength(2);
    });
  });

  // =========================================================================
  // 2. Project Item Access & Anti-Probing (GET/PATCH/DELETE /api/projects/[id])
  // =========================================================================
  describe("2. Project Item Access & Anti-Probing", () => {
    it("user1 requesting Project A returns 200", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);

      const req = new NextRequest(`http://localhost/api/projects/${projectAId}`);
      const res = await getProjectById(req, { params: Promise.resolve({ id: projectAId }) });
      expect(res.status).toBe(200);
    });

    it("user1 requesting Project B returns 404 (anti-probing: never 403)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/projects/${projectBId}`);
      const res = await getProjectById(req, { params: Promise.resolve({ id: projectBId }) });
      expect(res.status).toBe(404);
    });

    it("user2 requesting Project B returns 200, and Project A returns 404", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user2Session as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const reqB = new NextRequest(`http://localhost/api/projects/${projectBId}`);
      const resB = await getProjectById(reqB, { params: Promise.resolve({ id: projectBId }) });
      expect(resB.status).toBe(200);

      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user2Session as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);

      const reqA = new NextRequest(`http://localhost/api/projects/${projectAId}`);
      const resA = await getProjectById(reqA, { params: Promise.resolve({ id: projectAId }) });
      expect(resA.status).toBe(404);
    });

    it("user1 attempting to PATCH Project B returns 404", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/projects/${projectBId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Hacked Project B" }),
      });
      const res = await patchProjectById(req, { params: Promise.resolve({ id: projectBId }) });
      expect(res.status).toBe(404);
    });

    it("user1 attempting to DELETE Project B returns 404", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/projects/${projectBId}`, {
        method: "DELETE",
      });
      const res = await deleteProjectById(req, { params: Promise.resolve({ id: projectBId }) });
      expect(res.status).toBe(404);
    });

    it("PM of A attempting to PATCH Project B returns 404", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmASession as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/projects/${projectBId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Attacking B" }),
      });
      const res = await patchProjectById(req, { params: Promise.resolve({ id: projectBId }) });
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 3. Project Tasks Access & Assignee Project Membership
  // =========================================================================
  describe("3. Project Tasks Access & Assignee Project Membership", () => {
    it("user1 can read tasks in Project A (200)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);
      vi.spyOn(Task, "find").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            sort: vi.fn().mockReturnValueOnce({
              lean: vi.fn().mockResolvedValueOnce([mockTaskA]),
            }),
          }),
        }),
      } as never);

      const req = new NextRequest(`http://localhost/api/projects/${projectAId}/tasks`);
      const res = await getProjectTasks(req, { params: Promise.resolve({ id: projectAId }) });
      expect(res.status).toBe(200);
    });

    it("user1 cannot read tasks in Project B (404 anti-probing)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/projects/${projectBId}/tasks`);
      const res = await getProjectTasks(req, { params: Promise.resolve({ id: projectBId }) });
      expect(res.status).toBe(404);
    });

    it("user1 cannot create tasks in Project B (404 anti-probing)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/projects/${projectBId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title: "Infiltrate B" }),
      });
      const res = await postProjectTask(req, { params: Promise.resolve({ id: projectBId }) });
      expect(res.status).toBe(404);
    });

    it("rejects task creation if assignee is not a member of that project (400)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmASession as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);

      // Attempting to assign user2 (who belongs only to Project B) into Project A
      const req = new NextRequest(`http://localhost/api/projects/${projectAId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: "Cross Project Task",
          assignee: user2Id,
        }),
      });

      const res = await postProjectTask(req, { params: Promise.resolve({ id: projectAId }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Assignee must be a member of this project/i);
    });

    it("allows task creation in Project A when assignee is a member of Project A (201)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmASession as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);

      vi.spyOn(Task, "findOne").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce({ order: 0 }),
          }),
        }),
      } as never);

      vi.spyOn(Task, "create").mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId() } as never);
      vi.spyOn(Task, "findById").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce(mockTaskA),
          }),
        }),
      } as never);

      const req = new NextRequest(`http://localhost/api/projects/${projectAId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: "Legitimate Task A",
          assignee: user1Id,
        }),
      });

      const res = await postProjectTask(req, { params: Promise.resolve({ id: projectAId }) });
      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // 4. Task Operations & Scoping (GET/PATCH/DELETE /api/tasks/[id] & move)
  // =========================================================================
  describe("4. Task Operations & Scoping", () => {
    it("user1 accessing task A returns 200", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockResolvedValueOnce(mockTaskA),
        }),
      } as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskAId}`);
      const res = await getTaskById(req, { params: Promise.resolve({ id: taskAId }) });
      expect(res.status).toBe(200);
    });

    it("user1 accessing task B returns 404 (anti-probing)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockResolvedValueOnce(mockTaskB),
        }),
      } as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskBId}`);
      const res = await getTaskById(req, { params: Promise.resolve({ id: taskBId }) });
      expect(res.status).toBe(404);
    });

    it("user1 attempting to PATCH task B returns 404", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTaskB as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskBId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Tampered Task B" }),
      });
      const res = await patchTaskById(req, { params: Promise.resolve({ id: taskBId }) });
      expect(res.status).toBe(404);
    });

    it("PATCH task rejects assigning non-member to task (400)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmASession as never);
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTaskA as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskAId}`, {
        method: "PATCH",
        body: JSON.stringify({ assignee: user2Id }),
      });
      const res = await patchTaskById(req, { params: Promise.resolve({ id: taskAId }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Assignee must be a member of this project/i);
    });

    it("user1 attempting to DELETE task B returns 404", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTaskB as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskBId}`, {
        method: "DELETE",
      });
      const res = await deleteTaskById(req, { params: Promise.resolve({ id: taskBId }) });
      expect(res.status).toBe(404);
    });

    it("user1 attempting to move task B returns 404", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTaskB as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskBId}/move`, {
        method: "POST",
        body: JSON.stringify({ status: "in_progress", order: 1 }),
      });
      const res = await moveTask(req, { params: Promise.resolve({ id: taskBId }) });
      expect(res.status).toBe(404);
    });

    it("user1 moving their own assigned task in Project A succeeds (200)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTaskA as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);
      vi.spyOn(Task, "updateMany").mockResolvedValue({ acknowledged: true } as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskAId}/move`, {
        method: "POST",
        body: JSON.stringify({ status: "done", order: 0 }),
      });
      const res = await moveTask(req, { params: Promise.resolve({ id: taskAId }) });
      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // 5. Task Comments Isolation (GET/POST /api/tasks/[id]/comments)
  // =========================================================================
  describe("5. Task Comments Isolation", () => {
    it("user1 can read comments on task A (200)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTaskA as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);
      vi.spyOn(Comment, "find").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockResolvedValueOnce([
            { _id: new mongoose.Types.ObjectId(), body: "Comment on Task A" },
          ]),
        }),
      } as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskAId}/comments`);
      const res = await getComments(req, { params: Promise.resolve({ id: taskAId }) });
      expect(res.status).toBe(200);
    });

    it("user1 cannot read comments on task B (404 anti-probing)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTaskB as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskBId}/comments`);
      const res = await getComments(req, { params: Promise.resolve({ id: taskBId }) });
      expect(res.status).toBe(404);
    });

    it("user1 cannot POST comments to task B (404 anti-probing)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTaskB as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectB as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskBId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: "Infiltrating Task B" }),
      });
      const res = await postComment(req, { params: Promise.resolve({ id: taskBId }) });
      expect(res.status).toBe(404);
    });

    it("user1 can POST comments to task A (201)", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);
      vi.spyOn(Task, "findById").mockResolvedValueOnce(mockTaskA as never);
      vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectA as never);

      const createdComment = {
        _id: new mongoose.Types.ObjectId(),
        task: mockTaskA._id,
        body: "Hello Task A",
        populate: vi.fn().mockResolvedValue(true),
        toObject: vi.fn().mockReturnValue({
          _id: new mongoose.Types.ObjectId(),
          body: "Hello Task A",
        }),
      };
      vi.spyOn(Comment, "create").mockResolvedValueOnce(createdComment as never);

      const req = new NextRequest(`http://localhost/api/tasks/${taskAId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: "Hello Task A" }),
      });
      const res = await postComment(req, { params: Promise.resolve({ id: taskAId }) });
      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // 6. User Directory Isolation (GET /api/users)
  // =========================================================================
  describe("6. User Directory Isolation (GET /api/users)", () => {
    it("non-admin user1 only sees users sharing a project with them, and only name and id", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(user1Session as never);

      // Project.find returns only Project A for user1
      vi.spyOn(Project, "find").mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce([mockProjectA]),
      } as never);

      // User.find must be called with only shared user IDs (pmA and user1)
      const userFindSpy = vi.spyOn(User, "find").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce([
            { _id: mockProjectA.owner, name: "PM Alice" },
            { _id: new mongoose.Types.ObjectId(user1Id), name: "User 1" },
          ]),
        }),
      } as never);

      const res = await getUsers();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(2);

      // Verify that user2 is NOT present
      const returnedIds = data.users.map((u: { _id: string }) => u._id.toString());
      expect(returnedIds).not.toContain(user2Id);

      // Verify projection: only name and _id, no email or role
      expect(data.users[0].email).toBeUndefined();
      expect(data.users[0].role).toBeUndefined();
      expect(data.users[0].name).toBeDefined();
      expect(data.users[0]._id).toBeDefined();

      // Verify that the query projected only "_id name"
      expect(userFindSpy).toHaveBeenCalledWith(
        expect.any(Object),
        "_id name"
      );
    });

    it("admin sees all users with full metadata including email and role", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      vi.spyOn(User, "find").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce([
            { _id: new mongoose.Types.ObjectId(adminId), name: "Admin", email: "admin@example.com", role: "admin" },
            { _id: new mongoose.Types.ObjectId(pmAId), name: "PM Alice", email: "pma@example.com", role: "pm" },
            { _id: new mongoose.Types.ObjectId(user1Id), name: "User 1", email: "user1@example.com", role: "user" },
            { _id: new mongoose.Types.ObjectId(user2Id), name: "User 2", email: "user2@example.com", role: "user" },
          ]),
        }),
      } as never);

      const res = await getUsers();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(4);
      expect(data.users[0].email).toBe("admin@example.com");
      expect(data.users[0].role).toBe("admin");
    });
  });

  // =========================================================================
  // 7. AI Routes & Context Builders Isolation
  // =========================================================================
  describe("7. AI Routes & Context Builders Isolation", () => {
    it("AI Assistant returns 404 when user1 queries Project B", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValue(user1Session as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectB as never);

      const req = new NextRequest("http://localhost/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify({
          projectId: projectBId,
          messages: [{ role: "user", content: "What is going on in Project B?" }],
        }),
      });

      const res = await postAssistant(req);
      expect(res.status).toBe(404);
    });

    it("AI Assistant succeeds and scopes context to Project A when user1 queries Project A", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValue(user1Session as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectA as never);

      const taskFindSpy = vi.spyOn(Task, "find").mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          sort: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce([mockTaskA]),
          }),
        }),
      } as never);

      const req = new NextRequest("http://localhost/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify({
          projectId: projectAId,
          messages: [{ role: "user", content: "Summary of Project A tasks" }],
        }),
      });

      const res = await postAssistant(req);
      expect(res.status).toBe(200);
      expect(taskFindSpy).toHaveBeenCalledWith({ project: mockProjectA._id });
    });

    it("AI Summarize Comments returns 404 when user1 targets task B", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValue(user1Session as never);
      vi.spyOn(Task, "findById").mockResolvedValue(mockTaskB as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectB as never);

      const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
        method: "POST",
        body: JSON.stringify({ taskId: taskBId }),
      });

      const res = await postSummarizeComments(req);
      expect(res.status).toBe(404);
    });

    it("AI Breakdown returns 404 when outsider targets Project B", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValue(pmASession as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectB as never);

      const req = new NextRequest("http://localhost/api/ai/breakdown", {
        method: "POST",
        body: JSON.stringify({ projectId: projectBId }),
      });

      const res = await postBreakdown(req);
      expect(res.status).toBe(404);
    });

    it("AI Create-Task returns 404 when outsider targets Project B", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValue(pmASession as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectB as never);

      const req = new NextRequest("http://localhost/api/ai/create-task", {
        method: "POST",
        body: JSON.stringify({ projectId: projectBId, prompt: "Draft subtask" }),
      });

      const res = await postCreateTask(req);
      expect(res.status).toBe(404);
    });

    it("AI Weekly Report returns 404 when outsider targets Project B", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValue(pmASession as never);
      vi.spyOn(Project, "findById").mockResolvedValue(mockProjectB as never);

      const req = new NextRequest("http://localhost/api/ai/weekly-report", {
        method: "POST",
        body: JSON.stringify({ projectId: projectBId }),
      });

      const res = await postWeeklyReport(req);
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 8. Member Removal Task Unassignment & Instant Access Revocation
  // =========================================================================
  describe("8. Member Removal Task Unassignment & Access Revocation", () => {
    it("unassigns tasks in project when a member is removed via PATCH /api/projects/[id]", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmASession as never);

      const projectWithMembers = {
        _id: new mongoose.Types.ObjectId(projectAId),
        name: "Project A",
        owner: new mongoose.Types.ObjectId(pmAId),
        members: [new mongoose.Types.ObjectId(user1Id)],
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Project, "findById").mockResolvedValueOnce(projectWithMembers as never);
      const updateManySpy = vi.spyOn(Task, "updateMany").mockResolvedValue({ acknowledged: true } as never);

      // Removing user1 by updating members to []
      const req = new NextRequest(`http://localhost/api/projects/${projectAId}`, {
        method: "PATCH",
        body: JSON.stringify({ members: [] }),
      });

      const res = await patchProjectById(req, { params: Promise.resolve({ id: projectAId }) });
      expect(res.status).toBe(200);

      // Assert that Task.updateMany was called to unassign tasks for user1 in Project A
      expect(updateManySpy).toHaveBeenCalledWith(
        {
          project: projectWithMembers._id,
          assignee: { $in: [new mongoose.Types.ObjectId(user1Id)] },
        },
        { $set: { assignee: null } }
      );
    });
  });
});
