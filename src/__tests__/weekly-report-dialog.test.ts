import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { WeeklyReportDialog } from "@/app/dashboard/weekly-report-dialog";

describe("WeeklyReportDialog Component", () => {
  it("renders null when isOpen is false", () => {
    const html = renderToString(
      React.createElement(WeeklyReportDialog, {
        projectId: "proj-1",
        projectName: "Test Project",
        isOpen: false,
        onClose: vi.fn(),
      })
    );

    expect(html).toBe("");
  });

  it("renders dialog content when isOpen is true", () => {
    const html = renderToString(
      React.createElement(WeeklyReportDialog, {
        projectId: "proj-1",
        projectName: "Mobile App MVP",
        isOpen: true,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain("Weekly Status Report:");
    expect(html).toContain("Mobile App MVP");
    expect(html).toContain("Gemini Executive PM AI");
  });
});
