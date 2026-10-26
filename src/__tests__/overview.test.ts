import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatRelativeTime,
  formatDueDate,
  filterUpcomingDueTasks,
  buildActivityFeed,
} from "../lib/overview-utils";

describe("Overview Tab Utilities - Date Formatting", () => {
  const baseNow = new Date("2026-10-27T12:00:00Z");

  it("formats relative times accurately", () => {
    // 30 seconds ago
    const justNow = new Date("2026-10-27T11:59:30Z");
    assert.equal(formatRelativeTime(justNow, baseNow), "just now");

    // 25 minutes ago
    const minsAgo = new Date("2026-10-27T11:35:00Z");
    assert.equal(formatRelativeTime(minsAgo, baseNow), "25m ago");

    // 4 hours ago
    const hoursAgo = new Date("2026-10-27T08:00:00Z");
    assert.equal(formatRelativeTime(hoursAgo, baseNow), "4h ago");

    // 1 day ago
    const yesterday = new Date("2026-10-26T12:00:00Z");
    assert.equal(formatRelativeTime(yesterday, baseNow), "yesterday");

    // 4 days ago
    const daysAgo = new Date("2026-10-23T12:00:00Z");
    assert.equal(formatRelativeTime(daysAgo, baseNow), "4d ago");

    // 14 days ago -> calendar format
    const longAgo = new Date("2026-10-13T12:00:00Z");
    assert.equal(formatRelativeTime(longAgo, baseNow), "Oct 13");
  });

  it("formats due dates and detects overdue status", () => {
    // Overdue 2 days
    const overdue2d = new Date("2026-10-25T12:00:00Z");
    const resOverdue = formatDueDate(overdue2d, baseNow);
    assert.equal(resOverdue.isOverdue, true);
    assert.equal(resOverdue.label, "2d overdue");

    // Due today
    const dueToday = new Date("2026-10-27T23:59:59Z");
    const resToday = formatDueDate(dueToday, baseNow);
    assert.equal(resToday.isOverdue, false);
    assert.equal(resToday.label, "Due today");

    // Due tomorrow
    const dueTomorrow = new Date("2026-10-28T12:00:00Z");
    const resTomorrow = formatDueDate(dueTomorrow, baseNow);
    assert.equal(resTomorrow.isOverdue, false);
    assert.equal(resTomorrow.label, "Due tomorrow");

    // Due in 4 days
    const due4d = new Date("2026-10-31T12:00:00Z");
    const res4d = formatDueDate(due4d, baseNow);
    assert.equal(res4d.isOverdue, false);
    assert.equal(res4d.label, "Due in 4d");
  });
});

describe("Overview Tab Utilities - Upcoming Due Tasks", () => {
  const baseNow = new Date("2026-10-27T12:00:00Z");

  it("filters out completed tasks and tasks without due date", () => {
    const rawTasks = [
      {
        id: "1",
        number: 1,
        title: "Done Task",
        status: "done",
        dueDate: new Date("2026-10-28T12:00:00Z"),
      },
      {
        id: "2",
        number: 2,
        title: "No Due Date Task",
        status: "todo",
        dueDate: null,
      },
      {
        id: "3",
        number: 3,
        title: "Valid Upcoming Task",
        status: "in_progress",
        priority: "high",
        dueDate: new Date("2026-10-29T12:00:00Z"),
        assignee: { id: "u1", name: "Alice", email: "alice@example.com" },
      },
      {
        id: "4",
        number: 4,
        title: "Overdue Task",
        status: "todo",
        priority: "medium",
        dueDate: new Date("2026-10-24T12:00:00Z"),
      },
    ];

    const upcoming = filterUpcomingDueTasks(rawTasks, "TEST", baseNow);
    assert.equal(upcoming.length, 2);

    // Should sort earliest due date first (overdue task first)
    assert.equal(upcoming[0].formattedKey, "TEST-4");
    assert.equal(upcoming[0].isOverdue, true);
    assert.equal(upcoming[0].dueLabel, "3d overdue");

    assert.equal(upcoming[1].formattedKey, "TEST-3");
    assert.equal(upcoming[1].isOverdue, false);
    assert.equal(upcoming[1].assignee?.name, "Alice");
  });
});

describe("Overview Tab Utilities - Activity Feed Builder", () => {
  it("merges, formats and sorts tasks, comments, messages, and files", () => {
    const feed = buildActivityFeed({
      projectId: "proj-123",
      projectKey: "DEMO",
      tasks: [
        {
          id: "t1",
          number: 1,
          title: "Initial Task",
          createdAt: new Date("2026-10-25T10:00:00Z"),
          createdBy: { name: "Bob" },
        },
        {
          id: "t2",
          number: 2,
          title: "Finished Feature",
          status: "done",
          completedAt: new Date("2026-10-27T09:00:00Z"),
          assignee: { name: "Alice" },
        },
      ],
      comments: [
        {
          id: "c1",
          body: "Looks good to me!",
          createdAt: new Date("2026-10-26T14:00:00Z"),
          author: { name: "Carol" },
          task: { number: 2, title: "Finished Feature" },
        },
      ],
      messages: [
        {
          id: "m1",
          body: "Let's review the sprint goals.",
          createdAt: new Date("2026-10-27T08:00:00Z"),
          authorName: "Dave",
        },
      ],
      files: [
        {
          id: "f1",
          name: "architecture-v2.pdf",
          createdAt: new Date("2026-10-27T10:30:00Z"),
          uploaderName: "Eve",
        },
      ],
      limit: 10,
    });

    assert.equal(feed.length, 5);

    // Check chronological descending order
    // 1st: File uploaded at 10:30 on 10-27
    assert.equal(feed[0].type, "file");
    assert.equal(feed[0].actorName, "Eve");
    assert.equal(feed[0].targetName, "architecture-v2.pdf");

    // 2nd: Task completed at 09:00 on 10-27
    assert.equal(feed[1].type, "task_completed");
    assert.equal(feed[1].actorName, "Alice");
    assert.equal(feed[1].targetKey, "DEMO-2");

    // 3rd: Message sent at 08:00 on 10-27
    assert.equal(feed[2].type, "message");
    assert.equal(feed[2].actorName, "Dave");

    // 4th: Comment on 10-26
    assert.equal(feed[3].type, "comment");
    assert.equal(feed[3].actorName, "Carol");
    assert.equal(feed[3].targetKey, "DEMO-2");

    // 5th: Task created on 10-25
    assert.equal(feed[4].type, "task_created");
    assert.equal(feed[4].actorName, "Bob");
    assert.equal(feed[4].targetKey, "DEMO-1");
  });
});
