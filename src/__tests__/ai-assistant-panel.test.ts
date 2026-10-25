import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AIAssistantPanel } from "@/app/projects/[id]/ai-assistant-panel";

describe("AIAssistantPanel Component", () => {
  it("renders null when isOpen is false", () => {
    const html = renderToString(
      React.createElement(AIAssistantPanel, {
        projectId: "proj-123",
        projectName: "Test Project",
        isOpen: false,
        onClose: vi.fn(),
      })
    );

    expect(html).toBe("");
  });

  it("renders panel header, badges, and quick questions when isOpen is true", () => {
    const html = renderToString(
      React.createElement(AIAssistantPanel, {
        projectId: "proj-123",
        projectName: "Redesign Mobile App",
        isOpen: true,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain("Project Assistant");
    expect(html).toContain("Read-only");
    expect(html).toContain("Redesign Mobile App");
    expect(html).toContain("Which tasks are overdue?");
    expect(html).toContain("Who is overloaded?");
    expect(html).toContain("Ask about overdue tasks, workload, blockers...");
  });
});
