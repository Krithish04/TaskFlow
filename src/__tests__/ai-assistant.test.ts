import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { POST as postAssistant } from "@/app/api/ai/assistant/route";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import * as authModule from "@/auth";
import { streamText } from "ai";
import * as rateLimiterModule from "@/lib/ai/rate-limiter";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: vi.fn(),
  };
});

describe("POST /api/ai/assistant - Streaming API Route", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const pmOwnerId = new mongoose.Types.ObjectId().toString();
  const regularUserId = new mongoose.Types.ObjectId().toString();
  const nonMemberUserId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const adminSession = {
    user: { id: adminId, name: "Admin", email: "admin@example.com", role: "admin" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const pmOwnerSession = {
    user: { id: pmOwnerId, name: "PM Owner", email: "owner@example.com", role: "pm" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const regularUserSession = {
    user: { id: regularUserId, name: "Dev User", email: "dev@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const nonMemberSession = {
    user: { id: nonMemberUserId, name: "Outsider", email: "outsider@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const mockProjectDoc = {
    _id: projectId,
    name: "TaskFlow Mobile",
    description: "Mobile task management application",
    status: "active",
    owner: pmOwnerId,
    members: [regularUserId],
  };

  const mockTasks = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      project: projectId,
      title: "Completed Task",
      status: "done",
      priority: "medium",
      assignee: { name: "Alice", email: "alice@example.com" },
      dueDate: new Date(Date.now() - 86400000),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      project: projectId,
      title: "In Progress Task",
      status: "in_progress",
      priority: "high",
      assignee: { name: "Bob", email: "bob@example.com" },
      dueDate: new Date(Date.now() + 86400000),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      project: projectId,
      title: "Overdue Critical Bug",
      status: "todo",
      priority: "urgent",
      assignee: { name: "Bob", email: "bob@example.com" },
      dueDate: new Date(Date.now() - 2 * 86400000),
    },
  ];

  function createMockQuery(doc: unknown) {
    const query: {
      populate: ReturnType<typeof vi.fn>;
      sort: ReturnType<typeof vi.fn>;
      lean: ReturnType<typeof vi.fn>;
      then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) => Promise<unknown>;
    } = {
      populate: vi.fn(),
      sort: vi.fn(),
      lean: vi.fn(),
      then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
    };
    query.populate.mockReturnValue(query);
    query.sort.mockReturnValue(query);
    query.lean.mockResolvedValue(doc);
    return query;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(streamText).mockClear();
    rateLimiterModule.resetAIRateLimits();
    vi.spyOn(Project, "findById").mockImplementation(() => createMockQuery(mockProjectDoc) as never);
    vi.spyOn(Task, "find").mockImplementation(() => createMockQuery(mockTasks) as never);

    (streamText as ReturnType<typeof vi.fn>).mockReturnValue({
      toTextStreamResponse: vi.fn(() => new Response("Streaming response chunk...", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })),
    });
  });

  it("returns 413 if content-length exceeds 32KB cap", async () => {
    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      headers: { "content-length": "40000" },
      body: JSON.stringify({ projectId, messages: [{ role: "user", content: "Hi" }] }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toContain("too large");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: "{ not json }",
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 400 for missing messages or invalid schema", async () => {
    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({ projectId, messages: [] }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("At least one message is required");
  });

  it("returns 400 for invalid projectId format", async () => {
    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({ projectId: "invalid-id", messages: [{ role: "user", content: "Hi" }] }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid Project ID format");
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(null as never);

    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [{ role: "user", content: "Who is overloaded?" }],
      }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(401);
  });

  it("returns 403 when a user lacks view access to the project", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(nonMemberSession as never);

    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [{ role: "user", content: "Are any tasks overdue?" }],
      }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(403);
  });

  it("allows regular project members with role 'user' to use the assistant (PRD permission matrix)", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(regularUserSession as never);

    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [{ role: "user", content: "Which tasks are overdue?" }],
      }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toBe("Streaming response chunk...");
    expect(streamText).toHaveBeenCalled();
  });

  it("allows PM project owner to use assistant", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(pmOwnerSession as never);

    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [{ role: "user", content: "Give me workload summary" }],
      }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
    expect(streamText).toHaveBeenCalled();
  });

  it("allows Admin to use assistant on any project", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(adminSession as never);

    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [{ role: "user", content: "What is in progress?" }],
      }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
    expect(streamText).toHaveBeenCalled();
  });

  it("passes real task data, status counts, overdue tasks, and workload to streamText system prompt", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(pmOwnerSession as never);

    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [{ role: "user", content: "Who is overloaded?" }],
      }),
    });

    await postAssistant(req);

    const callArgs = vi.mocked(streamText).mock.calls.at(-1)![0] as {
      system: string;
      messages: unknown;
    };
    expect(callArgs.system).toContain("TaskFlow Mobile");
    expect(callArgs.system).toContain("Total Tasks: 3");
    expect(callArgs.system).toContain("Overdue Critical Bug");
    expect(callArgs.system).toContain("STRICTLY READ-ONLY");
    expect(callArgs.system).toContain("Bob: 2 active task(s)");
    expect(callArgs.messages).toEqual([{ role: "user", content: "Who is overloaded?" }]);
  });

  it("enforces per-user rate limit with 429 response", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(regularUserSession as never);
    vi.spyOn(rateLimiterModule, "requireAIRateLimit").mockReturnValue(
      NextResponse.json(
        {
          error: "Rate limit exceeded. You may make up to 10 AI requests per minute.",
          code: "USER_RATE_LIMIT",
          retryAfter: 45,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "45",
          },
        }
      )
    );

    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("USER_RATE_LIMIT");
    expect(res.headers.get("retry-after")).toBe("45");
  });

  it("handles AI free-tier quota error with 429 AI_QUOTA_EXCEEDED", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(regularUserSession as never);
    (streamText as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const err = new Error("Resource has been exhausted (e.g. check quota)");
      Object.assign(err, { status: 429 });
      throw err;
    });

    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [{ role: "user", content: "What's up?" }],
      }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("AI_QUOTA_EXCEEDED");
  });

  it("permits prior assistant responses up to 8000 characters in conversation history", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(regularUserSession as never);

    const longAssistantReply = "Detailed task status: " + "a".repeat(3000);
    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [
          { role: "user", content: "Previous question" },
          { role: "assistant", content: longAssistantReply },
          { role: "user", content: "Follow-up question" },
        ],
      }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
  });

  it("returns 500 Internal server error fallback when a non-auth database error occurs during access check", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(regularUserSession as never);
    vi.spyOn(Project, "findById").mockImplementation(() => {
      throw new Error("Mongoose connection dropped");
    });

    const req = new NextRequest("http://localhost/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messages: [{ role: "user", content: "Any updates?" }],
      }),
    });

    const res = (await postAssistant(req))!;
    expect(res).toBeDefined();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });
});
