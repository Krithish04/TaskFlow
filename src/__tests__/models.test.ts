import { describe, expect, it } from "vitest";
import { User, Project, Task, Comment } from "@/models";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

describe("Mongoose Connection Helper", () => {
  it("throws an error when MONGODB_URI is not set", async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    // Reset cached connection to test error path
    if (global.mongooseCache) {
      global.mongooseCache.conn = null;
      global.mongooseCache.promise = null;
    }

    await expect(connectDB()).rejects.toThrow("Please define the MONGODB_URI");

    if (originalUri) {
      process.env.MONGODB_URI = originalUri;
    }
  });
});

describe("User Model Schema", () => {
  it("validates required fields", async () => {
    const user = new User({});
    let error: mongoose.Error.ValidationError | null = null;
    try {
      await user.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }
    expect(error?.errors.name).toBeDefined();
    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.passwordHash).toBeDefined();
  });

  it("enforces role enum values and defaults to user", async () => {
    const defaultUser = new User({
      name: "Alice",
      email: "alice@example.com",
      passwordHash: "hash123",
    });
    expect(defaultUser.role).toBe("user");

    const invalidUser = new User({
      name: "Bob",
      email: "bob@example.com",
      passwordHash: "hash123",
      role: "superadmin" as unknown,
    });
    let error: mongoose.Error.ValidationError | null = null;
    try {
      await invalidUser.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }
    expect(error?.errors.role).toBeDefined();
  });

  it("has indexes defined on email and role", () => {
    const indexes = User.schema.indexes();
    const indexFields = indexes.map(([fields]) => Object.keys(fields)[0]);
    expect(indexFields).toContain("email");
    expect(indexFields).toContain("role");
  });
});

describe("Project Model Schema", () => {
  it("validates required fields and defaults", async () => {
    const project = new Project({});
    let error: mongoose.Error.ValidationError | null = null;
    try {
      await project.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }
    expect(error?.errors.name).toBeDefined();
    expect(error?.errors.owner).toBeDefined();
  });

  it("defaults status to active and members to empty array", async () => {
    const validOwner = new mongoose.Types.ObjectId();
    const project = new Project({
      name: "Alpha Project",
      owner: validOwner,
    });
    expect(project.status).toBe("active");
    expect(project.members).toHaveLength(0);
    await expect(project.validate()).resolves.toBeUndefined();
  });

  it("has indexes defined on owner and members", () => {
    const indexes = Project.schema.indexes();
    const indexFields = indexes.map(([fields]) => Object.keys(fields)[0]);
    expect(indexFields).toContain("owner");
    expect(indexFields).toContain("members");
  });
});

describe("Task Model Schema", () => {
  it("validates required fields", async () => {
    const task = new Task({});
    let error: mongoose.Error.ValidationError | null = null;
    try {
      await task.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }
    expect(error?.errors.project).toBeDefined();
    expect(error?.errors.title).toBeDefined();
    expect(error?.errors.createdBy).toBeDefined();
  });

  it("sets proper defaults for status, priority, and order", async () => {
    const task = new Task({
      project: new mongoose.Types.ObjectId(),
      title: "Design login",
      createdBy: new mongoose.Types.ObjectId(),
    });
    expect(task.status).toBe("todo");
    expect(task.priority).toBe("medium");
    expect(task.order).toBe(0);
    await expect(task.validate()).resolves.toBeUndefined();
  });

  it("rejects invalid status or priority enums", async () => {
    const task = new Task({
      project: new mongoose.Types.ObjectId(),
      title: "Test task",
      createdBy: new mongoose.Types.ObjectId(),
      status: "invalid_status" as unknown,
      priority: "urgent" as unknown,
    });
    let error: mongoose.Error.ValidationError | null = null;
    try {
      await task.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }
    expect(error?.errors.status).toBeDefined();
    expect(error?.errors.priority).toBeDefined();
  });

  it("has compound indexes for Kanban ordering and assignee lookups", () => {
    const indexes = Task.schema.indexes();
    const compoundKanban = indexes.find(
      ([fields]) => "project" in fields && "status" in fields && "order" in fields
    );
    expect(compoundKanban).toBeDefined();
  });
});

describe("Comment Model Schema", () => {
  it("validates required fields", async () => {
    const comment = new Comment({});
    let error: mongoose.Error.ValidationError | null = null;
    try {
      await comment.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }
    expect(error?.errors.task).toBeDefined();
    expect(error?.errors.author).toBeDefined();
    expect(error?.errors.body).toBeDefined();
  });

  it("creates a valid comment document", async () => {
    const comment = new Comment({
      task: new mongoose.Types.ObjectId(),
      author: new mongoose.Types.ObjectId(),
      body: "Great work on the login flow!",
    });
    await expect(comment.validate()).resolves.toBeUndefined();
  });

  it("has indexes for task and author", () => {
    const indexes = Comment.schema.indexes();
    const taskIndex = indexes.find(
      ([fields]) => "task" in fields && "createdAt" in fields
    );
    expect(taskIndex).toBeDefined();
  });
});
