import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { POST as postSummarizeComments } from "@/app/api/ai/summarize-comments/route";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { Project } from "@/models/Project";
import * as authModule from "@/auth";
import { generateText } from "ai";
import * as rateLimiterModule from "@/lib/ai/rate-limiter";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

describe("POST /api/ai/summarize-comments - API Route", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const pmOwnerId = new mongoose.Types.ObjectId().toString();
  const regularUserId = new mongoose.Types.ObjectId().toString();
  const outsiderUserId = new mongoose.Types.ObjectId().toString();
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

  const regularUserSession = {
    user: { id: regularUserId, name: "Dev User", email: "dev@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const outsiderSession = {
    user: { id: outsiderUserId, name: "Outsider", email: "out@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const mockProjectDoc = {
    _id: projectId,
    name: "Customer Portal",
    description: "Self-service customer portal with billing and tickets",
    owner: pmOwnerId,
    members: [regularUserId],
  };

  const mockTaskDoc = {
    _id: taskId,
    project: projectId,
    title: "Implement SSO Auth",
    description: "Connect SAML and OAuth 2.0 login",
    status: "in_progress",
    priority: "high",
  };

  const mockComments = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      task: taskId,
      author: {
        _id: pmOwnerId,
        name: "PM Owner",
        email: "owner@example.com",
        role: "pm",
      },
      body: "Please ensure Okta is prioritized first.",
      createdAt: new Date("2026-10-25T10:00:00Z"),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      task: taskId,
      author: {
        _id: regularUserId,
        name: "Dev User",
        email: "dev@example.com",
        role: "user",
      },
      body: "Okta integration is done. Working on Azure AD next.",
      createdAt: new Date("2026-10-25T11:00:00Z"),
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
    rateLimiterModule.resetAIRateLimits();
    vi.spyOn(Task, "findById").mockResolvedValue(mockTaskDoc as never);
    vi.spyOn(Project, "findById").mockImplementation(() => createMockQuery(mockProjectDoc) as never);
    vi.spyOn(Comment, "find").mockImplementation(() => createMockQuery(mockComments) as never);
  });

  it("returns 413 if content-length exceeds 16KB limit", async () => {
    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      headers: { "content-length": "20000" },
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(413);
  });

  it("returns 400 for invalid body or missing taskId", async () => {
    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 for malformed taskId format", async () => {
    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId: "invalid-id" }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid task ID");
  });

  it("returns 401 if unauthenticated", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 if task is not found", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(regularUserSession as never);
    vi.spyOn(Task, "findById").mockResolvedValueOnce(null as never);

    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 if user does not belong to project", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(outsiderSession as never);

    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(403);
  });

  it("returns 429 if rate limit is exceeded for the user", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(regularUserSession as never);

    vi.spyOn(rateLimiterModule, "requireAIRateLimit").mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Rate limit reached", code: "USER_RATE_LIMIT" }), {
        status: 429,
      }) as never
    );

    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(429);
  });

  it("returns 200 with empty notice if task has 0 comments without calling AI", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(regularUserSession as never);
    vi.spyOn(Comment, "find").mockImplementation(() => createMockQuery([]) as never);

    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary).toContain("No comments");
    expect(data.commentCount).toBe(0);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns 200 with summary when called by team member (User role)", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(regularUserSession as never);

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "Okta implementation was prioritized and completed. Azure AD is currently in progress.",
    } as never);

    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary).toContain("Okta implementation was prioritized");
    expect(data.commentCount).toBe(2);
  });

  it("returns 200 with summary when called by PM owner", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "Summary generated for PM owner.",
    } as never);

    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary).toBe("Summary generated for PM owner.");
  });

  it("returns 200 with summary when called by Admin", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "Summary generated for admin overview.",
    } as never);

    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary).toBe("Summary generated for admin overview.");
  });

  it("returns 429 if AI provider triggers rate limit / quota error", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(regularUserSession as never);

    const quotaError = new Error("RESOURCE_EXHAUSTED: Google AI quota limit reached (429)");
    vi.mocked(generateText).mockRejectedValueOnce(quotaError);

    const req = new NextRequest("http://localhost/api/ai/summarize-comments", {
      method: "POST",
      body: JSON.stringify({ taskId }),
    });

    const res = await postSummarizeComments(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("AI_QUOTA_EXCEEDED");
  });
});
