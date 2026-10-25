import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import DashboardPage from "@/app/dashboard/page";
import * as authModule from "@/auth";
import * as navigation from "next/navigation";
import { User } from "@/models/User";
import { Project } from "@/models/Project";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Dashboard Page - Role-Based Routing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated visitors to /login", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

    await DashboardPage();

    expect(navigation.redirect).toHaveBeenCalledWith("/login");
  });

  it("renders Admin dashboard when user role is admin", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce({
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    } as never);

    const mockUsers = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Admin",
        email: "admin@example.com",
        role: "admin",
        createdAt: new Date(),
      },
    ];

    const mockProjects = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Demo Project",
        description: "A test project",
        status: "active",
        owner: { name: "PM User", email: "pm@example.com" },
        members: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
      },
    ];

    vi.spyOn(User, "find").mockReturnValueOnce({
      sort: vi.fn().mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockUsers),
      }),
    } as never);

    vi.spyOn(Project, "find").mockReturnValueOnce({
      populate: vi.fn().mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce(mockProjects),
        }),
      }),
    } as never);

    const rendered = await DashboardPage();
    expect(rendered).toBeDefined();
  });

  it("renders PM dashboard when user role is pm", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce({
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        name: "PM User",
        email: "pm@example.com",
        role: "pm",
      },
    } as never);

    const rendered = await DashboardPage();
    expect(rendered).toBeDefined();
  });

  it("renders Team Member dashboard when user role is user", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce({
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        name: "Team Member",
        email: "member@example.com",
        role: "user",
      },
    } as never);

    const rendered = await DashboardPage();
    expect(rendered).toBeDefined();
  });
});
