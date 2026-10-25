import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { TaskDrawer } from "@/app/projects/[id]/task-drawer";
import { KanbanTask, KanbanUser } from "@/app/projects/[id]/types";

describe("TaskDrawer Component", () => {
  const mockTask: KanbanTask = {
    id: "task-1",
    projectId: "proj-1",
    title: "Implement Login Page",
    description: "Write Next.js login page and form action",
    status: "in_progress",
    priority: "high",
    order: 0,
    assignee: {
      id: "user-1",
      name: "Rahul Verma",
      email: "rahul@example.com",
      role: "user",
    },
    dueDate: "2026-11-01T00:00:00.000Z",
    createdBy: {
      id: "pm-1",
      name: "PM Owner",
      email: "pm@example.com",
      role: "pm",
    },
    createdAt: "2026-10-25T10:00:00.000Z",
  };

  const mockMembers: KanbanUser[] = [
    { id: "pm-1", name: "PM Owner", email: "pm@example.com", role: "pm" },
    { id: "user-1", name: "Rahul Verma", email: "rahul@example.com", role: "user" },
  ];

  it("returns empty string when isOpen is false", () => {
    const html = renderToString(
      React.createElement(TaskDrawer, {
        task: mockTask,
        isOpen: false,
        onClose: vi.fn(),
        isOwnerOrAdmin: false,
        availableMembers: mockMembers,
        onTaskUpdated: vi.fn(),
        onTaskDeleted: vi.fn(),
      })
    );

    expect(html).toBe("");
  });

  it("returns empty string when task is null", () => {
    const html = renderToString(
      React.createElement(TaskDrawer, {
        task: null,
        isOpen: true,
        onClose: vi.fn(),
        isOwnerOrAdmin: false,
        availableMembers: mockMembers,
        onTaskUpdated: vi.fn(),
        onTaskDeleted: vi.fn(),
      })
    );

    expect(html).toBe("");
  });

  it("renders read-only details when isOwnerOrAdmin is false", () => {
    const html = renderToString(
      React.createElement(TaskDrawer, {
        task: mockTask,
        isOpen: true,
        onClose: vi.fn(),
        isOwnerOrAdmin: false,
        availableMembers: mockMembers,
        onTaskUpdated: vi.fn(),
        onTaskDeleted: vi.fn(),
      })
    );

    expect(html).toContain("Implement Login Page");
    expect(html).toContain("Rahul Verma");
    expect(html).toContain("high");
    expect(html).toContain("Priority");
    expect(html).not.toContain("Save Changes");
  });

  it("renders editable controls when isOwnerOrAdmin is true", () => {
    const html = renderToString(
      React.createElement(TaskDrawer, {
        task: mockTask,
        isOpen: true,
        onClose: vi.fn(),
        isOwnerOrAdmin: true,
        availableMembers: mockMembers,
        onTaskUpdated: vi.fn(),
        onTaskDeleted: vi.fn(),
      })
    );

    expect(html).toContain("Save Changes");
    expect(html).toContain("Delete Task");
    expect(html).toContain("drawerTaskTitle");
  });
});
