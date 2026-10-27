import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { TasksPerProjectCard } from "../components/analytics/global-analytics-view";
import type { ProjectTaskDistribution } from "../lib/analytics";

describe("Tasks per Project Chart Component", () => {
  const sampleProjects: ProjectTaskDistribution[] = [
    {
      id: "p1",
      name: "Alpha Project",
      key: "ALP",
      todo: 5,
      in_progress: 3,
      review: 2,
      done: 10,
      total: 20,
      completionRate: 50,
    },
    {
      id: "p2",
      name: "Beta Initiative",
      key: "BET",
      todo: 2,
      in_progress: 1,
      review: 1,
      done: 4,
      total: 8,
      completionRate: 50,
    },
  ];

  it("renders empty state and accessible text when there are no projects", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(TasksPerProjectCard, {
        loading: false,
        isMounted: true,
        tasksPerProject: [],
      })
    );

    assert.ok(html.includes("No projects available"), "Should show empty state title");
    assert.ok(html.includes("Tasks by status for each project"), "Should have subtitle");
    assert.ok(!html.includes("Showing the 10 most active projects"), "Caption should not be shown");
  });

  it("renders single project status donut with counts in center and legend with numbers", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(TasksPerProjectCard, {
        loading: false,
        isMounted: true,
        tasksPerProject: [sampleProjects[0]],
      })
    );

    // Center count
    assert.ok(html.includes("20"), "Should show center total count 20");
    // Legend with numbers
    assert.ok(html.includes("To Do"), "Should have To Do legend");
    assert.ok(html.includes("5"), "Should have To Do count 5");
    assert.ok(html.includes("In Progress"), "Should have In Progress legend");
    assert.ok(html.includes("3"), "Should have In Progress count 3");
    assert.ok(html.includes("Review"), "Should have Review legend");
    assert.ok(html.includes("2"), "Should have Review count 2");
    assert.ok(html.includes("Done"), "Should have Done legend");
    assert.ok(html.includes("10"), "Should have Done count 10");

    // Caption should not be present when only 1 project
    assert.ok(!html.includes("Showing the 10 most active projects"), "Caption must not show when uncapped");
    // Subtitle check
    assert.ok(html.includes("Tasks by status for each project"), "Subtitle must match");
  });

  it("renders horizontal stacked bars, one row per project, with full project name and total at end", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(TasksPerProjectCard, {
        loading: false,
        isMounted: true,
        tasksPerProject: sampleProjects,
      })
    );

    // Full project names
    assert.ok(html.includes("Alpha Project"), "Should display full project name Alpha Project");
    assert.ok(html.includes("Beta Initiative"), "Should display full project name Beta Initiative");

    // Total count at end of each row
    assert.ok(html.includes(">20<"), "Should render total 20 for Alpha Project");
    assert.ok(html.includes(">8<"), "Should render total 8 for Beta Initiative");

    // Accessible text summary
    assert.ok(html.includes("Tasks per Project Summary"), "Should include accessible summary");
    assert.ok(html.includes("Alpha Project: 20 total tasks"), "Accessible summary includes project stats");

    // Subtitle
    assert.ok(html.includes("Tasks by status for each project"), "Subtitle matches requirement");

    // 2 projects <= 10, so not capped
    assert.ok(!html.includes("Showing the 10 most active projects"), "Caption not shown when uncapped");
  });

  it("shows caption only when the project list is capped (> 10 projects)", () => {
    const elevenProjects: ProjectTaskDistribution[] = Array.from({ length: 11 }, (_, i) => ({
      id: `proj-${i + 1}`,
      name: `Project ${i + 1}`,
      key: `P${i + 1}`,
      todo: i + 1,
      in_progress: 1,
      review: 1,
      done: 2,
      total: i + 5,
      completionRate: 20,
    }));

    const html = ReactDOMServer.renderToString(
      React.createElement(TasksPerProjectCard, {
        loading: false,
        isMounted: true,
        tasksPerProject: elevenProjects,
      })
    );

    assert.ok(
      html.includes("Showing the 10 most active projects"),
      "Caption must be shown when project list is capped"
    );
  });
});
