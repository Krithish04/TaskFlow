import { NextRequest } from "next/server";

export const DEFAULT_MAX_BODY_BYTES = 32 * 1024; // 32 KB cap

export interface BoundedJsonResult<T = unknown> {
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Safely parses request body as JSON with a strict byte length boundary
 * to defend against Denial-of-Service (memory exhaustion) attacks.
 */
export async function parseBoundedJson<T = unknown>(
  request: NextRequest,
  limitBytes: number = DEFAULT_MAX_BODY_BYTES
): Promise<BoundedJsonResult<T>> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > limitBytes) {
    return {
      error: `Request body too large (maximum ${Math.round(limitBytes / 1024)}KB allowed)`,
      status: 413,
    };
  }

  try {
    if (!request.body) {
      return { data: {} as T };
    }

    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    let rawText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > limitBytes) {
        await reader.cancel();
        return {
          error: `Request body too large (maximum ${Math.round(limitBytes / 1024)}KB allowed)`,
          status: 413,
        };
      }
      rawText += decoder.decode(value, { stream: true });
    }
    rawText += decoder.decode();

    if (!rawText.trim()) {
      return { data: {} as T };
    }

    const data = JSON.parse(rawText) as T;
    return { data };
  } catch {
    return { error: "Invalid JSON body", status: 400 };
  }
}
