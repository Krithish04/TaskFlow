import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  UserDashboard,
  type UserTask,
  type UserComment,
  type UserProjectItem,
} from "@/app/dashboard/user-dashboard";

describe("UserDashboard Component", () => {
  const mockTasks: UserTask[] = [
    {
      id: "t1",
      projectId: "p1",
      projectName: "TaskFlow Core",
      title: "Build Login Screen",
      description: "Implement OAuth and credentials form",
      status: "in_progress",
      priority: "high",
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // Due in 2 days
      createdAt: new Date().toISOString(),
    },
    {
      id: "t2",
      projectId: "p1",
      projectName: "TaskFlow Core",
      title: "Write Database Migrations",
      description: "Update schemas for comments",
      status: "todo",
      priority: "medium",
      dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), // Overdue 2 days
      createdAt: new Date().toISOString(),
    },
    {
      id: "t3",
      projectId: "p2",
      projectName: "Analytics Dashboard",
      title: "Setup Vitest Configuration",
      description: "Unit testing foundation",
      status: "done",
      priority: "low",
      dueDate: null,
      createdAt: new Date().toISOString(),
    },
  ];

  const mockComments: UserComment[] = [
    {
      id: "c1",
      taskId: "t1",
      taskTitle: "Build Login Screen",
      projectId: "p1",
      projectName: "TaskFlow Core",
      authorName: "Sarah Connor",
      authorRole: "pm",
      body: "Please make sure error messages are clearly styled.",
      createdAt: new Date().toISOString(),
    },
  ];

  const mockProjects: UserProjectItem[] = [
    {
      id: "p1",
      name: "TaskFlow Core",
      description: "Main workspace",
      status: "active",
      ownerName: "Sarah Connor",
    },
  ];

  it("renders assigned tasks, stats, and project details", () => {
    const html = renderToString(
      React.createElement(UserDashboard, {
        assignedTasks: mockTasks,
        recentComments: mockComments,
        userProjects: mockProjects,
      })
    );

    expect(html).toContain("Build Login Screen");
    expect(html).toContain("TaskFlow Core");
    expect(html).toContain("Write Database Migrations");
    expect(html).toContain("Assigned Tasks");
    expect(html).toContain("Recent Comments");
    expect(html).toContain("Sarah Connor");
    expect(html).toContain("Please make sure error messages are clearly styled.");
    expect(html).toContain("My Projects");
  });

  it("renders overdue alert when overdue tasks exist", () => {
    const html = renderToString(
      React.createElement(UserDashboard, {
        assignedTasks: mockTasks,
        recentComments: mockComments,
        userProjects: mockProjects,
      })
    );

    expect(html).toContain("Overdue");
    expect(html).toContain("The following task deadlines have passed");
  });

  it("renders empty state messages when tasks and comments are empty", () => {
    const html = renderToString(
      React.createElement(UserDashboard, {
        assignedTasks: [],
        recentComments: [],
        userProjects: [],
      })
    );

    expect(html).toContain("No tasks found");
    expect(html).toContain("No recent comments on your projects or tasks.");
    expect(html).toContain("You are not a member of any project yet.");
  });
});
