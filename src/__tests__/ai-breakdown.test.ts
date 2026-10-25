import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { POST as postAIBreakdown } from "@/app/api/ai/breakdown/route";
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

describe("POST /api/ai/breakdown - API Route", () => {
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

  beforeEach(() => {
    vi.restoreAllMocks();
    rateLimiterModule.resetAIRateLimits();
  });

  it("returns 413 if content-length exceeds 16KB limit", async () => {
    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      headers: { "content-length": "20000" },
      body: JSON.stringify({ projectId }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(413);
  });

  it("returns 400 for invalid body or missing projectId", async () => {
    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({ instructions: "Do something" }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 for malformed projectId format", async () => {
    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({ projectId: "invalid-uuid" }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid project ID");
  });

  it("returns 401 if unauthenticated", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 if regular user attempts to access breakdown (PM/Admin only)", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(regularUserSession as never);

    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 if PM does not own or belong to the project", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOtherSession as never);
    vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(404);
  });

  it("returns 429 if rate limit is exceeded for the user", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(pmOwnerSession as never);
    vi.spyOn(Project, "findById").mockResolvedValue(mockProjectDoc as never);

    // Mock rate limiter returning 429
    vi.spyOn(rateLimiterModule, "requireAIRateLimit").mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Rate limit reached", code: "USER_RATE_LIMIT" }), {
        status: 429,
      }) as never
    );

    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(429);
  });

  it("returns 200 with generated tasks when called by PM owner", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);
    vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

    const mockTasks = [
      {
        title: "Setup Auth API",
        description: "Implement OAuth credentials flow",
        priority: "high",
        estimatedHours: 6,
      },
      {
        title: "Design Billing Page",
        description: "Create responsive billing breakdown",
        priority: "medium",
        estimatedHours: 4,
      },
    ];

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { tasks: mockTasks },
    } as never);

    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        instructions: "Include authentication first",
      }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks[0].title).toBe("Setup Auth API");
    expect(data.tasks[0].estimatedHours).toBe(6);
  });

  it("returns 200 with generated tasks when called by Admin", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);
    vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { tasks: [{ title: "Admin Task", description: "Admin subtask", priority: "low", estimatedHours: 2 }] },
    } as never);

    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].title).toBe("Admin Task");
  });

  it("returns 429 if AI provider triggers rate limit / quota error", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmOwnerSession as never);
    vi.spyOn(Project, "findById").mockResolvedValueOnce(mockProjectDoc as never);

    const quotaError = new Error("RESOURCE_EXHAUSTED: Google AI quota limit reached (429)");
    vi.mocked(generateObject).mockRejectedValueOnce(quotaError);

    const req = new NextRequest("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });

    const res = await postAIBreakdown(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("AI_QUOTA_EXCEEDED");
  });
});
