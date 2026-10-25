import { describe, expect, it, vi, beforeEach } from "vitest";
import { loginAction, sanitizeCallbackUrl } from "@/app/login/actions";
import LoginPage from "@/app/login/page";
import * as authModule from "@/auth";
import { AuthError } from "next-auth";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;replace;${url};307;;`;
    throw error;
  }),
}));

describe("sanitizeCallbackUrl", () => {
  it("allows valid relative paths", () => {
    expect(sanitizeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/projects/123")).toBe("/projects/123");
  });

  it("rejects absolute URLs, protocol-relative, and backslash paths", () => {
    expect(sanitizeCallbackUrl("https://evil.com")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("//evil.com")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/\\evil.com")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/\t/evil.com")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/\n/evil.com")).toBe("/dashboard");
    expect(sanitizeCallbackUrl(null)).toBe("/dashboard");
    expect(sanitizeCallbackUrl(123)).toBe("/dashboard");
  });
});

describe("loginAction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns error when email is missing", async () => {
    const formData = new FormData();
    formData.set("email", "");
    formData.set("password", "password123");

    const result = await loginAction(undefined, formData);
    expect(result).toEqual({ error: "Please enter both email and password." });
  });

  it("returns error when password is missing", async () => {
    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("password", "");

    const result = await loginAction(undefined, formData);
    expect(result).toEqual({ error: "Please enter both email and password." });
  });

  it("returns error when signIn returns a URL containing error=CredentialsSignin", async () => {
    vi.spyOn(authModule, "signIn").mockResolvedValueOnce(
      "http://localhost:3000/login?error=CredentialsSignin" as never
    );

    const formData = new FormData();
    formData.set("email", "wrong@example.com");
    formData.set("password", "wrongpass");

    const result = await loginAction(undefined, formData);
    expect(result).toEqual({ error: "Invalid email or password." });
  });

  it("returns error when signIn throws CredentialsSignin AuthError", async () => {
    const authError = new AuthError("CredentialsSignin");
    authError.type = "CredentialsSignin";
    vi.spyOn(authModule, "signIn").mockRejectedValueOnce(authError);

    const formData = new FormData();
    formData.set("email", "wrong@example.com");
    formData.set("password", "wrongpass");

    const result = await loginAction(undefined, formData);
    expect(result).toEqual({ error: "Invalid email or password." });
  });

  it("redirects to callbackUrl when signIn succeeds", async () => {
    vi.spyOn(authModule, "signIn").mockResolvedValueOnce(
      "http://localhost:3000/projects/123" as never
    );

    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("password", "password123");
    formData.set("callbackUrl", "/projects/123");

    await expect(loginAction(undefined, formData)).rejects.toThrow(
      "NEXT_REDIRECT: /projects/123"
    );
  });
});

describe("LoginPage Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects authenticated user to /dashboard", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce({
      user: {
        id: "u-1",
        role: "admin",
        name: "Admin",
        email: "admin@example.com",
      },
      expires: "2099-01-01",
    } as never);

    await expect(
      LoginPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NEXT_REDIRECT: /dashboard");
  });

  it("renders login form when user is not authenticated", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

    const jsx = await LoginPage({
      searchParams: Promise.resolve({
        callbackUrl: "/projects",
        error: "CredentialsSignin",
      }),
    });

    expect(jsx).toBeDefined();
    expect(jsx.type).toBe("div");
  });
});
