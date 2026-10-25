import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AIBreakdownDialog } from "@/app/projects/[id]/ai-breakdown-dialog";

describe("AIBreakdownDialog Component", () => {
  it("renders null when isOpen is false", () => {
    const html = renderToString(
      React.createElement(AIBreakdownDialog, {
        projectId: "proj-1",
        projectName: "Test Project",
        isOpen: false,
        onClose: vi.fn(),
        onTasksCreated: vi.fn(),
      })
    );

    expect(html).toBe("");
  });

  it("renders dialog content when isOpen is true", () => {
    const html = renderToString(
      React.createElement(AIBreakdownDialog, {
        projectId: "proj-1",
        projectName: "Mobile App MVP",
        isOpen: true,
        onClose: vi.fn(),
        onTasksCreated: vi.fn(),
      })
    );

    expect(html).toContain("AI Task Breakdown");
    expect(html).toContain("Mobile App MVP");
    expect(html).toContain("Additional Instructions");
    expect(html).toContain("Generate Breakdown");
  });
});
