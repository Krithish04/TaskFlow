import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  generateProjectKey,
  PROJECT_COLORS,
  Project,
  type ProjectColor,
} from "../models/Project";
import { Task, type TaskStatus } from "../models/Task";

describe("Data Model v2 - Project Keys & Color Palette", () => {
  it("generates uppercase project keys matching ^[A-Z]{2,5}$", () => {
    assert.match(generateProjectKey("TaskFlow Core"), /^[A-Z]{2,5}$/);
    assert.equal(generateProjectKey("TaskFlow Core"), "TC");
    assert.equal(generateProjectKey("Design System Tokens"), "DST");
    assert.equal(generateProjectKey("Single"), "SING");
    assert.equal(generateProjectKey("A"), "AP");
  });

  it("handles key collisions with alphabetical suffixes", () => {
    const existing = new Set(["TC", "TCA"]);
    const key = generateProjectKey("TaskFlow Core", existing);
    assert.match(key, /^[A-Z]{2,5}$/);
    assert.ok(!existing.has(key));
  });

  it("provides 8 distinct valid project colors", () => {
    assert.equal(PROJECT_COLORS.length, 8);
    assert.ok(PROJECT_COLORS.includes("blue"));
    assert.ok(PROJECT_COLORS.includes("emerald"));
    assert.ok(PROJECT_COLORS.includes("violet"));
  });

  it("validates project schema fields correctly", async () => {
    const validProj = new Project({
      name: "Alpha Project",
      owner: "507f1f77bcf86cd799439011",
      color: "emerald",
      key: "ALPH",
      nextTaskNumber: 1,
    });
    await validProj.validate();

    const invalidProj = new Project({
      name: "Alpha Project",
      owner: "507f1f77bcf86cd799439011",
      color: "not-a-color" as unknown as ProjectColor,
      key: "TOOLONGKEY",
    });
    let invalidErr: mongoose.Error.ValidationError | null = null;
    try {
      await invalidProj.validate();
    } catch (e) {
      if (e instanceof mongoose.Error.ValidationError) {
        invalidErr = e;
      }
    }
    assert.ok(invalidErr);
    assert.ok(invalidErr.errors["color"]);
    assert.ok(invalidErr.errors["key"]);
  });
});

function applyStatusTransition(
  task: { status: TaskStatus; completedAt?: Date | null },
  nextStatus: TaskStatus
) {
  const prevStatus = task.status;
  if (prevStatus !== nextStatus) {
    if (nextStatus === "done") {
      task.completedAt = new Date();
    } else if (prevStatus === "done") {
      task.completedAt = null;
    }
    task.status = nextStatus;
  }
}

describe("Data Model v2 - Task Numbering & completedAt", () => {
  it("requires task number on Task schema", async () => {
    const taskWithoutNumber = new Task({
      project: "507f1f77bcf86cd799439011",
      title: "Test Task",
      status: "todo",
      priority: "medium",
      createdBy: "507f1f77bcf86cd799439011",
      order: 0,
    });
    let err: mongoose.Error.ValidationError | null = null;
    try {
      await taskWithoutNumber.validate();
    } catch (e) {
      if (e instanceof mongoose.Error.ValidationError) {
        err = e;
      }
    }
    assert.ok(err);
    assert.ok(err.errors["number"]);
  });

  it("validates valid task with number and default completedAt", async () => {
    const task = new Task({
      project: "507f1f77bcf86cd799439011",
      number: 42,
      title: "Valid Task",
      status: "todo",
      priority: "high",
      createdBy: "507f1f77bcf86cd799439011",
      order: 0,
    });
    await task.validate();
    assert.equal(task.number, 42);
    assert.equal(task.completedAt, null);
  });

  it("sets completedAt when transitioning from non-done to done", () => {
    const task = new Task({
      project: "507f1f77bcf86cd799439011",
      number: 1,
      title: "Moving Task",
      status: "todo",
      priority: "low",
      createdBy: "507f1f77bcf86cd799439011",
      order: 0,
    });

    applyStatusTransition(task, "done");

    assert.equal(task.status, "done");
    assert.ok(task.completedAt instanceof Date);
  });

  it("clears completedAt when transitioning out of done", () => {
    const initialCompleted = new Date("2026-01-01T00:00:00Z");
    const task = new Task({
      project: "507f1f77bcf86cd799439011",
      number: 1,
      title: "Reopened Task",
      status: "done",
      priority: "medium",
      completedAt: initialCompleted,
      createdBy: "507f1f77bcf86cd799439011",
      order: 0,
    });

    applyStatusTransition(task, "in_progress");

    assert.equal(task.status, "in_progress");
    assert.equal(task.completedAt, null);
  });

  it("preserves completedAt when remaining in done", () => {
    const existingDate = new Date("2026-01-15T12:00:00Z");
    const task = new Task({
      project: "507f1f77bcf86cd799439011",
      number: 5,
      title: "Done Task Reordered",
      status: "done",
      priority: "medium",
      completedAt: existingDate,
      createdBy: "507f1f77bcf86cd799439011",
      order: 0,
    });

    applyStatusTransition(task, "done");

    assert.equal(task.completedAt?.getTime(), existingDate.getTime());
  });
});
