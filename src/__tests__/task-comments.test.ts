import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { TaskComments } from "@/app/projects/[id]/task-comments";

describe("TaskComments Component", () => {
  it("renders comments header and Summarize button", () => {
    const html = renderToString(
      React.createElement(TaskComments, {
        taskId: "task-1",
      })
    );

    expect(html).toContain("Comments");
    expect(html).toContain("Summarize");
    expect(html).toContain("Write a comment...");
  });
});
