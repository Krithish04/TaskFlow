export function sanitizeCallbackUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string" || !rawUrl.startsWith("/")) {
    return "/dashboard";
  }
  if (rawUrl.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(rawUrl)) {
    return "/dashboard";
  }
  try {
    const base = "http://localhost";
    return new URL(rawUrl, base).origin === base ? rawUrl : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
