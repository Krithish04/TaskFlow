import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import ProjectPage from "@/app/projects/[id]/page";
import { COLUMNS } from "@/app/projects/[id]/types";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import * as authModule from "@/auth";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

describe("Kanban Board Page and Columns", () => {
  const pmId = new mongoose.Types.ObjectId().toString();
  const memberId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const memberSession = {
    user: { id: memberId, name: "Member", email: "member@example.com", role: "user" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("defines the four required columns in PRD order", () => {
    expect(COLUMNS).toHaveLength(4);
    expect(COLUMNS[0].id).toBe("todo");
    expect(COLUMNS[1].id).toBe("in_progress");
    expect(COLUMNS[2].id).toBe("review");
    expect(COLUMNS[3].id).toBe("done");
  });

  it("calls notFound when project id is malformed", async () => {
    await expect(
      ProjectPage({ params: Promise.resolve({ id: "invalid-id" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("redirects unauthenticated users to /login", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

    await expect(
      ProjectPage({ params: Promise.resolve({ id: projectId }) })
    ).rejects.toThrow(`NEXT_REDIRECT: /login?callbackUrl=/projects/${projectId}`);
  });

  it("renders Kanban board when user has view permissions", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValue(memberSession as never);

    const mockProject = {
      _id: projectId,
      name: "Demo Kanban",
      description: "Project for kanban board",
      status: "active",
      owner: { _id: pmId, name: "PM Lead", email: "pm@example.com", role: "pm" },
      members: [{ _id: memberId, name: "Member", email: "member@example.com", role: "user" }],
      createdAt: new Date(),
    };

    // requireProjectAccess calls Project.findById
    vi.spyOn(Project, "findById")
      .mockResolvedValueOnce(mockProject as never) // first call inside requireProjectAccess
      .mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          populate: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce(mockProject),
          }),
        }),
      } as never); // second call inside page component

    const mockTasks = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Test Kanban Card",
        status: "todo",
        priority: "high",
        order: 0,
        createdAt: new Date(),
      },
    ];

    vi.spyOn(Task, "find").mockReturnValueOnce({
      populate: vi.fn().mockReturnValueOnce({
        populate: vi.fn().mockReturnValueOnce({
          sort: vi.fn().mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce(mockTasks),
          }),
        }),
      }),
    } as never);

    const rendered = await ProjectPage({
      params: Promise.resolve({ id: projectId }),
    });

    expect(rendered).toBeDefined();
  });
});
