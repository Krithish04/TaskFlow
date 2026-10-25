import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { POST as postWeeklyReport } from "@/app/api/ai/weekly-report/route";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
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

describe("POST /api/ai/weekly-report - API Route", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const pmOwnerId = new mongoose.Types.ObjectId().toString();
  const pmOtherId = new mongoose.Types.ObjectId().toString();
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
    owner: pmOwnerId,
    members: [regularUserId],
  };

  const mockTasks = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      project: projectId,
      title: "Completed Task 1",
      status: "done",
      priority: "medium",
      assignee: { name: "Alice" },
      dueDate: new Date(Date.now() - 86400000),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      project: projectId,
      title: "In Progress Task",
      status: "in_progress",
      priority: "high",
      assignee: { name: "Bob" },
      dueDate: new Date(Date.now() + 86400000),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      project: projectId,
      title: "Overdue Bug",
      status: "todo",
      priority: "high",
      assignee: null,
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
    rateLimiterModule.resetAIRateLimits();
    vi.spyOn(Project, "findById").mockImplementation(() => createMockQuery(mockProjectDoc) as never);
    vi.spyOn(Task, "find").mockImplementation(() => createMockQuery(mockTasks) as never);
  });

  it("returns 413 if content-length exceeds 16KB limit", async () => {
    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      headers: { "content-length": "20000" },
      body: JSON.stringify({ projectId }),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(413);
  });

  it("returns 400 for invalid body or missing projectId", async () => {
    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 for malformed projectId format", async () => {
    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      body: JSON.stringify({ projectId: "invalid-id" }),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid project ID");
  });

  it("returns 401 if unauthenticated", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 if regular user attempts to access weekly report (PM/Admin only)", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(regularUserSession as never);

    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 if PM does not own the project", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOtherSession as never);

    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(403);
  });

  it("returns 429 if rate limit is exceeded for the user", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(pmOwnerSession as never);

    vi.spyOn(rateLimiterModule, "requireAIRateLimit").mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Rate limit reached", code: "USER_RATE_LIMIT" }), {
        status: 429,
      }) as never
    );

    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(429);
  });

  it("returns 200 with generated report and stats when called by PM owner", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "# Weekly Status Report\n\n## Executive Summary\nProject is advancing on schedule.",
    } as never);

    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.report).toContain("Weekly Status Report");
    expect(data.stats).toBeDefined();
    expect(data.stats.total).toBe(3);
    expect(data.stats.done).toBe(1);
    expect(data.stats.inProgress).toBe(1);
    expect(data.stats.overdue).toBe(1);
  });

  it("returns 200 with generated report when called by Admin", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "# Admin Status Report\n\nOverall portfolio healthy.",
    } as never);

    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.report).toContain("Admin Status Report");
    expect(data.stats.total).toBe(3);
  });

  it("returns 429 if AI provider triggers rate limit / quota error", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);

    const quotaError = new Error("RESOURCE_EXHAUSTED: Google AI quota limit reached (429)");
    vi.mocked(generateText).mockRejectedValueOnce(quotaError);

    const req = new NextRequest("http://localhost/api/ai/weekly-report", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postWeeklyReport(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("AI_QUOTA_EXCEEDED");
  });
});
