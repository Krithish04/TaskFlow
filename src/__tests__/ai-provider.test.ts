import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getAIModel,
  isRateLimitError,
  handleAIError,
  checkAIRateLimit,
  requireAIRateLimit,
  resetAIRateLimits,
  cleanupExpiredEntries,
} from "@/lib/ai/provider";
import { requireAIPermission } from "@/lib/permissions";

describe("AI Provider & Error Handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetAIRateLimits();
  });

  describe("getAIModel", () => {
    it("returns a configured model from process.env.AI_MODEL", () => {
      process.env.AI_MODEL = "gemini-2.0-flash";
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-api-key";

      const model = getAIModel();
      expect(model).toBeDefined();
      expect(model.modelId).toBe("gemini-2.0-flash");
    });

    it("falls back to gemini-2.0-flash if AI_MODEL is unset", () => {
      delete process.env.AI_MODEL;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-api-key";

      const model = getAIModel();
      expect(model).toBeDefined();
      expect(model.modelId).toBe("gemini-2.0-flash");
    });

    it("respects customModel parameter over environment variable", () => {
      process.env.AI_MODEL = "gemini-2.0-flash";
      const model = getAIModel("gemini-1.5-pro");
      expect(model.modelId).toBe("gemini-1.5-pro");
    });
  });

  describe("isRateLimitError", () => {
    it("identifies status 429 as rate limit error", () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
      expect(isRateLimitError({ statusCode: 429 })).toBe(true);
    });

    it("identifies known quota and rate limit names and messages", () => {
      expect(isRateLimitError({ name: "RateLimitError" })).toBe(true);
      expect(isRateLimitError({ name: "QuotaExceededError" })).toBe(true);
      expect(
        isRateLimitError(new Error("RESOURCE_EXHAUSTED: quota exceeded for quota group"))
      ).toBe(true);
      expect(
        isRateLimitError(new Error("Rate limit exceeded. Too many requests (429)"))
      ).toBe(true);
    });

    it("returns false for generic errors", () => {
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
      expect(isRateLimitError(new Error("Database connection timed out"))).toBe(false);
      expect(isRateLimitError({ status: 500 })).toBe(false);
    });
  });

  describe("handleAIError", () => {
    it("returns HTTP 429 response when rate limit or quota is hit", async () => {
      const quotaErr = new Error("RESOURCE_EXHAUSTED: free-tier quota exceeded");
      const res = handleAIError(quotaErr);

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.code).toBe("AI_QUOTA_EXCEEDED");
      expect(data.error).toContain("quota or rate limit reached");
    });

    it("returns HTTP 500 for generic AI failure", async () => {
      const genericErr = new Error("Model failed to parse input");
      const res = handleAIError(genericErr);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.code).toBe("AI_ERROR");
      expect(data.error).toBe("Model failed to parse input");
    });
  });
});

describe("Per-User AI Rate Limiter", () => {
  beforeEach(() => {
    resetAIRateLimits();
  });

  it("allows requests under the specified limit", () => {
    const userId = "user-123";
    for (let i = 0; i < 5; i++) {
      const result = checkAIRateLimit(userId, { maxRequests: 5, windowMs: 10000 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it("blocks requests once the limit is exceeded", () => {
    const userId = "user-123";
    for (let i = 0; i < 3; i++) {
      checkAIRateLimit(userId, { maxRequests: 3, windowMs: 10000 });
    }

    const blocked = checkAIRateLimit(userId, { maxRequests: 3, windowMs: 10000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates rate limits between different users", () => {
    const userA = "user-A";
    const userB = "user-B";

    for (let i = 0; i < 2; i++) {
      checkAIRateLimit(userA, { maxRequests: 2, windowMs: 10000 });
    }

    // userA is blocked
    expect(checkAIRateLimit(userA, { maxRequests: 2, windowMs: 10000 }).allowed).toBe(false);

    // userB is not affected
    expect(checkAIRateLimit(userB, { maxRequests: 2, windowMs: 10000 }).allowed).toBe(true);
  });

  it("requireAIRateLimit returns 429 NextResponse with headers when blocked", async () => {
    const userId = "user-heavy";
    for (let i = 0; i < 2; i++) {
      requireAIRateLimit(userId, { maxRequests: 2, windowMs: 10000 });
    }

    const res = requireAIRateLimit(userId, { maxRequests: 2, windowMs: 10000 });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBeDefined();
    expect(res?.headers.get("X-RateLimit-Remaining")).toBe("0");

    const data = await res?.json();
    expect(data.code).toBe("USER_RATE_LIMIT");
  });

  it("returns null when request is within limit", () => {
    const res = requireAIRateLimit("user-ok", { maxRequests: 10, windowMs: 10000 });
    expect(res).toBeNull();
  });

  it("cleans up expired entries for inactive users", () => {
    const inactiveUser = "inactive-user";
    checkAIRateLimit(inactiveUser, { maxRequests: 5, windowMs: 1000 });

    // Advance time beyond window
    const cleaned = cleanupExpiredEntries(Date.now() + 2000, 1000);
    expect(cleaned).toBeGreaterThanOrEqual(1);

    // User's counter was removed and now has full quota again
    const result = checkAIRateLimit(inactiveUser, { maxRequests: 5, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});

describe("AI Permission Enforcement", () => {
  it("allows Admin to access any AI feature", async () => {
    const admin = { id: "a1", role: "admin" as const };
    await expect(requireAIPermission("breakdown", admin)).resolves.toEqual(admin);
    await expect(requireAIPermission("weekly-report", admin)).resolves.toEqual(admin);
    await expect(requireAIPermission("assistant", admin)).resolves.toEqual(admin);
  });

  it("allows PM to access any AI feature", async () => {
    const pm = { id: "pm1", role: "pm" as const };
    await expect(requireAIPermission("breakdown", pm)).resolves.toEqual(pm);
    await expect(requireAIPermission("weekly-report", pm)).resolves.toEqual(pm);
    await expect(requireAIPermission("create-task", pm)).resolves.toEqual(pm);
  });

  it("allows regular User to access only summaries and assistant", async () => {
    const user = { id: "u1", role: "user" as const };
    await expect(requireAIPermission("summarize-comments", user)).resolves.toEqual(user);
    await expect(requireAIPermission("assistant", user)).resolves.toEqual(user);
  });

  it("forbids regular User from using PM-only AI features", async () => {
    const user = { id: "u1", role: "user" as const };
    await expect(requireAIPermission("breakdown", user)).rejects.toThrow("Forbidden");
    await expect(requireAIPermission("create-task", user)).rejects.toThrow("Forbidden");
    await expect(requireAIPermission("weekly-report", user)).rejects.toThrow("Forbidden");
  });
});
