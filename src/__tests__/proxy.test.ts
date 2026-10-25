import { describe, expect, it } from "vitest";
import { handleProxyAuth, config, proxy, middleware } from "@/proxy";

describe("Proxy / Middleware Protection", () => {
  it("has matcher configuration for /dashboard and /projects", () => {
    expect(config.matcher).toContain("/dashboard/:path*");
    expect(config.matcher).toContain("/projects/:path*");
  });

  it("exports proxy, middleware, and default functions", () => {
    expect(typeof proxy).toBe("function");
    expect(typeof middleware).toBe("function");
  });

  it("redirects unauthenticated user accessing /dashboard to /login with callbackUrl", () => {
    const req = {
      auth: null,
      url: "http://localhost:3000/dashboard",
      nextUrl: {
        pathname: "/dashboard",
        search: "",
      },
    };

    const response = handleProxyAuth(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fdashboard"
    );
  });

  it("redirects unauthenticated user accessing /projects/123 to /login with callbackUrl and search params", () => {
    const req = {
      auth: null,
      url: "http://localhost:3000/projects/123?tab=tasks",
      nextUrl: {
        pathname: "/projects/123",
        search: "?tab=tasks",
      },
    };

    const response = handleProxyAuth(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fprojects%2F123%3Ftab%3Dtasks"
    );
  });

  it("allows authenticated user accessing /dashboard to proceed", () => {
    const req = {
      auth: {
        user: {
          id: "u-1",
          name: "Test",
          email: "test@example.com",
          role: "user" as const,
        },
        expires: "2099-01-01",
      },
      url: "http://localhost:3000/dashboard",
      nextUrl: {
        pathname: "/dashboard",
        search: "",
      },
    };

    const response = handleProxyAuth(req);
    // NextResponse.next() produces 200 without redirect header
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows non-protected routes to proceed without authentication", () => {
    const req = {
      auth: null,
      url: "http://localhost:3000/about",
      nextUrl: {
        pathname: "/about",
        search: "",
      },
    };

    const response = handleProxyAuth(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
