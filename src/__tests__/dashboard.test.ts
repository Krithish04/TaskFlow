import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import DashboardPage from "@/app/dashboard/page";
import * as authModule from "@/auth";
import * as navigation from "next/navigation";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";

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
    const mockPmId = new mongoose.Types.ObjectId().toString();
    vi.spyOn(authModule, "auth").mockResolvedValueOnce({
      user: {
        id: mockPmId,
        name: "PM User",
        email: "pm@example.com",
        role: "pm",
      },
    } as never);

    vi.spyOn(Project, "find").mockReturnValueOnce({
      populate: vi.fn().mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          sort: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce([
              {
                _id: new mongoose.Types.ObjectId(),
                name: "PM Owned Project",
                status: "active",
                owner: { _id: mockPmId, name: "PM User", email: "pm@example.com" },
                members: [],
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      }),
    } as never);

    vi.spyOn(User, "find").mockReturnValueOnce({
      sort: vi.fn().mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce([
          {
            _id: new mongoose.Types.ObjectId(),
            name: "Member 1",
            email: "m1@example.com",
            role: "user",
          },
        ]),
      }),
    } as never);

    const rendered = await DashboardPage();
    expect(rendered).toBeDefined();
  });

  it("renders Team Member dashboard when user role is user", async () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockProjectId = new mongoose.Types.ObjectId();
    const mockTaskId = new mongoose.Types.ObjectId();

    vi.spyOn(authModule, "auth").mockResolvedValueOnce({
      user: {
        id: mockUserId,
        name: "Team Member",
        email: "member@example.com",
        role: "user",
      },
    } as never);

    vi.spyOn(Project, "find").mockReturnValueOnce({
      populate: vi.fn().mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce([
            {
              _id: mockProjectId,
              name: "User Project",
              description: "A collaborative project",
              status: "active",
              owner: { name: "PM User", email: "pm@example.com" },
            },
          ]),
        }),
      }),
    } as never);

    vi.spyOn(Task, "find")
      .mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          sort: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce([
              {
                _id: mockTaskId,
                project: { _id: mockProjectId, name: "User Project" },
                title: "Assigned Task 1",
                description: "Do the task",
                status: "in_progress",
                priority: "high",
                dueDate: new Date(Date.now() + 86400000).toISOString(),
                createdAt: new Date().toISOString(),
              },
            ]),
          }),
        }),
      } as never)
      .mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce([{ _id: mockTaskId }]),
      } as never);

    vi.spyOn(Comment, "find").mockReturnValueOnce({
      populate: vi.fn().mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          sort: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockReturnValueOnce({
              lean: vi.fn().mockResolvedValueOnce([
                {
                  _id: new mongoose.Types.ObjectId(),
                  task: { _id: mockTaskId, title: "Assigned Task 1", project: { name: "User Project" } },
                  author: { name: "PM User", role: "pm" },
                  body: "Great progress on this!",
                  createdAt: new Date().toISOString(),
                },
              ]),
            }),
          }),
        }),
      }),
    } as never);

    const rendered = await DashboardPage();
    expect(rendered).toBeDefined();
  });
});
