import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AICreateTaskDialog } from "@/app/projects/[id]/ai-create-task-dialog";

describe("AICreateTaskDialog Component", () => {
  const mockMembers = [
    {
      id: "user-1",
      name: "Rahul Sharma",
      email: "rahul@example.com",
      role: "user",
    },
  ];

  it("renders null when isOpen is false", () => {
    const html = renderToString(
      React.createElement(AICreateTaskDialog, {
        projectId: "proj-1",
        projectName: "Test Project",
        isOpen: false,
        onClose: vi.fn(),
        availableMembers: mockMembers,
        onTaskCreated: vi.fn(),
      })
    );

    expect(html).toBe("");
  });

  it("renders dialog content when isOpen is true", () => {
    const html = renderToString(
      React.createElement(AICreateTaskDialog, {
        projectId: "proj-1",
        projectName: "Mobile App MVP",
        isOpen: true,
        onClose: vi.fn(),
        availableMembers: mockMembers,
        onTaskCreated: vi.fn(),
      })
    );

    expect(html).toContain("Create Task from Plain Language");
    expect(html).toContain("Mobile App MVP");
    expect(html).toContain("What would you like to create?");
    expect(html).toContain("Generate Draft");
    expect(html).toContain("Assign login bug to Rahul, high priority, due Friday");
  });
});
