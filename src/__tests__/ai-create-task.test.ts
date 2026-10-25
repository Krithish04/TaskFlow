import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { POST as postAICreateTask } from "@/app/api/ai/create-task/route";
import { Project } from "@/models/Project";
import * as authModule from "@/auth";
import { generateObject } from "ai";
import * as rateLimiterModule from "@/lib/ai/rate-limiter";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateObject: vi.fn(),
  };
});

describe("POST /api/ai/create-task - API Route", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const pmOwnerId = new mongoose.Types.ObjectId().toString();
  const pmOtherId = new mongoose.Types.ObjectId().toString();
  const rahulUserId = new mongoose.Types.ObjectId().toString();
  const regularUserId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const adminSession = {
    user: { id: adminId, name: "Admin", email: "admin@example.com", role: "admin" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const pmOwnerSession = {
    user: { id: pmOwnerId, name: "PM Owner", email: "owner@example.com", role: "pm" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const pmOtherSession = {
    user: { id: pmOtherId, name: "Other PM", email: "other@example.com", role: "pm" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const regularUserSession = {
    user: { id: regularUserId, name: "Dev User", email: "dev@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const mockProjectDoc = {
    _id: projectId,
    name: "Customer Portal",
    description: "Self-service customer portal with billing and tickets",
    owner: {
      _id: pmOwnerId,
      name: "PM Owner",
      email: "owner@example.com",
      role: "pm",
    },
    members: [
      {
        _id: rahulUserId,
        name: "Rahul Sharma",
        email: "rahul@example.com",
        role: "user",
      },
    ],
  };

  function createMockQuery(doc: unknown) {
    const query: {
      populate: ReturnType<typeof vi.fn>;
      lean: ReturnType<typeof vi.fn>;
      then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) => Promise<unknown>;
    } = {
      populate: vi.fn(),
      lean: vi.fn(),
      then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
    };
    query.populate.mockReturnValue(query);
    query.lean.mockResolvedValue(doc);
    return query;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    rateLimiterModule.resetAIRateLimits();
    vi.spyOn(Project, "findById").mockImplementation(() => createMockQuery(mockProjectDoc) as never);
  });

  it("returns 413 if content-length exceeds 16KB limit", async () => {
    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      headers: { "content-length": "20000" },
      body: JSON.stringify({ projectId, prompt: "test" }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(413);
  });

  it("returns 400 for invalid body or missing prompt", async () => {
    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 for malformed projectId format", async () => {
    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({ projectId: "invalid-id", prompt: "Fix login bug" }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid project ID");
  });

  it("returns 401 if unauthenticated", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({ projectId, prompt: "Fix login bug" }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 if regular user attempts to access create-task (PM/Admin only)", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(regularUserSession as never);

    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({ projectId, prompt: "Fix login bug" }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 if PM does not own the project", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOtherSession as never);

    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({ projectId, prompt: "Fix login bug" }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(403);
  });

  it("returns 429 if rate limit is exceeded for the user", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(pmOwnerSession as never);

    vi.spyOn(rateLimiterModule, "requireAIRateLimit").mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Rate limit reached", code: "USER_RATE_LIMIT" }), {
        status: 429,
      }) as never
    );

    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({ projectId, prompt: "Fix login bug" }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(429);
  });

  it("returns 200 with draft task matching assignee and due date when called by PM owner", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);

    const mockAIDraft = {
      title: "Fix login bug",
      description: "Address authentication session expiration issue",
      priority: "high" as const,
      status: "todo" as const,
      assigneeId: rahulUserId,
      assigneeName: "Rahul Sharma",
      dueDate: "2026-10-30",
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockAIDraft,
    } as never);

    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        prompt: "assign login bug to Rahul, high priority, due Friday",
      }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.draft).toBeDefined();
    expect(data.draft.title).toBe("Fix login bug");
    expect(data.draft.priority).toBe("high");
    expect(data.draft.assigneeId).toBe(rahulUserId);
    expect(data.draft.dueDate).toBe("2026-10-30");
  });

  it("matches assignee by name if assigneeId was not returned directly", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);

    const mockAIDraft = {
      title: "Login bug",
      description: "Fix bug",
      priority: "high" as const,
      status: "todo" as const,
      assigneeId: null,
      assigneeName: "Rahul",
      dueDate: null,
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockAIDraft,
    } as never);

    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        prompt: "assign login bug to Rahul",
      }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.draft.assigneeId).toBe(rahulUserId);
  });

  it("returns 200 with draft task when called by Admin", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        title: "Setup Cloudflare DNS",
        description: "Point domain records to Vercel",
        priority: "medium",
        status: "todo",
        assigneeId: null,
        assigneeName: null,
        dueDate: null,
      },
    } as never);

    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({ projectId, prompt: "Setup Cloudflare DNS" }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.draft.title).toBe("Setup Cloudflare DNS");
  });

  it("returns 429 if AI provider triggers rate limit / quota error", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);

    const quotaError = new Error("RESOURCE_EXHAUSTED: Google AI quota limit reached (429)");
    vi.mocked(generateObject).mockRejectedValueOnce(quotaError);

    const req = new NextRequest("http://localhost/api/ai/create-task", {
      method: "POST",
      body: JSON.stringify({ projectId, prompt: "Fix login bug" }),
    });

    const res = await postAICreateTask(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("AI_QUOTA_EXCEEDED");
  });
});
