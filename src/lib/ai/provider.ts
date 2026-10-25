import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { NextResponse } from "next/server";
import {
  checkAIRateLimit,
  requireAIRateLimit,
  resetAIRateLimits,
  cleanupExpiredEntries,
  type RateLimitOptions,
  type RateLimitResult,
} from "./rate-limiter";

/**
 * Returns the configured LanguageModel instance from Vercel AI SDK.
 * The model identifier is resolved dynamically from the `AI_MODEL` environment variable,
 * falling back to "gemini-2.0-flash" if unset.
 */
export function getAIModel(customModel?: string) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const modelName = customModel || process.env.AI_MODEL || "gemini-2.0-flash";

  const google = createGoogleGenerativeAI({
    apiKey: apiKey || "",
  });

  return google(modelName);
}

/**
 * Detects whether an error was caused by Google AI quota or rate limiting (HTTP 429).
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (err.status === 429 || err.statusCode === 429) {
      return true;
    }
    if (
      err.name === "RateLimitError" ||
      err.name === "QuotaExceededError" ||
      err.name === "TooManyRequestsError"
    ) {
      return true;
    }

    const message = typeof err.message === "string" ? err.message : "";
    const lowerMessage = message.toLowerCase();

    if (
      message.includes("429") ||
      lowerMessage.includes("resource_exhausted") ||
      lowerMessage.includes("quota exceeded") ||
      lowerMessage.includes("rate limit") ||
      lowerMessage.includes("too many requests")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Shared error handler for all /api/ai/* routes.
 * Gracefully formats HTTP 429 when the Google AI free-tier quota is hit,
 * as required by the PRD.
 */
export function handleAIError(error: unknown): NextResponse {
  if (isRateLimitError(error)) {
    return NextResponse.json(
      {
        error:
          "AI free-tier quota or rate limit reached. Please wait a moment and try again.",
        code: "AI_QUOTA_EXCEEDED",
      },
      { status: 429 }
    );
  }

  const message =
    error instanceof Error ? error.message : "AI processing failed";

  return NextResponse.json(
    {
      error: message,
      code: "AI_ERROR",
    },
    { status: 500 }
  );
}

export {
  checkAIRateLimit,
  requireAIRateLimit,
  resetAIRateLimits,
  cleanupExpiredEntries,
  type RateLimitOptions,
  type RateLimitResult,
};
