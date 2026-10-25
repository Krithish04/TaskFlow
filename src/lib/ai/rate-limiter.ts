import { NextResponse } from "next/server";

export interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetTime: number;
}

// In-memory store for rolling-window timestamps per user: Map<userId, timestamp[]>
const requestTimestamps = new Map<string, number[]>();

const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL_MS = 60 * 1000; // Sweep every minute
let lastCleanupTime = Date.now();

/**
 * Removes entries where all recorded timestamps have expired outside the active window.
 */
export function cleanupExpiredEntries(now: number = Date.now(), maxWindowMs: number = DEFAULT_WINDOW_MS): number {
  let cleanedCount = 0;
  for (const [userId, timestamps] of requestTimestamps.entries()) {
    const validTimestamps = timestamps.filter((t) => t > now - maxWindowMs);
    if (validTimestamps.length === 0) {
      requestTimestamps.delete(userId);
      cleanedCount++;
    } else if (validTimestamps.length !== timestamps.length) {
      requestTimestamps.set(userId, validTimestamps);
    }
  }
  lastCleanupTime = now;
  return cleanedCount;
}

/**
 * Checks whether the given user has exceeded their AI rate limit.
 * Uses a rolling window algorithm.
 */
export function checkAIRateLimit(
  userId: string,
  options?: RateLimitOptions
): RateLimitResult {
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Opportunistic sweep for expired entries of inactive users
  if (now - lastCleanupTime > CLEANUP_INTERVAL_MS || requestTimestamps.size > 1000) {
    cleanupExpiredEntries(now, windowMs);
  }

  const existing = requestTimestamps.get(userId) || [];
  // Filter out timestamps outside the active rolling window
  const activeTimestamps = existing.filter((timestamp) => timestamp > windowStart);

  if (activeTimestamps.length >= maxRequests) {
    const oldest = activeTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    const resetTime = oldest + windowMs;

    requestTimestamps.set(userId, activeTimestamps);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      resetTime,
    };
  }

  // Record this request
  activeTimestamps.push(now);
  requestTimestamps.set(userId, activeTimestamps);

  const remaining = Math.max(0, maxRequests - activeTimestamps.length);
  const resetTime = activeTimestamps[0] + windowMs;

  return {
    allowed: true,
    remaining,
    retryAfterSeconds: 0,
    resetTime,
  };
}

/**
 * Enforces per-user rate limit for AI routes.
 * Returns an HTTP 429 response if the limit is exceeded, or null if allowed.
 */
export function requireAIRateLimit(
  userId: string,
  options?: RateLimitOptions
): NextResponse | null {
  const result = checkAIRateLimit(userId, options);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. You may make up to ${
          options?.maxRequests ?? DEFAULT_MAX_REQUESTS
        } AI requests per minute.`,
        code: "USER_RATE_LIMIT",
        retryAfter: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": result.retryAfterSeconds.toString(),
          "X-RateLimit-Limit": (options?.maxRequests ?? DEFAULT_MAX_REQUESTS).toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.resetTime.toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Reset rate limit cache (useful for testing).
 */
export function resetAIRateLimits(): void {
  requestTimestamps.clear();
}
