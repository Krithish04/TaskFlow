import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { User, Project, Task, Comment } from "../src/models";

// Load environment variables (.env, .env.local)
loadEnvConfig(process.cwd());

export interface SeedResult {
  usersCount: number;
  projectsCount: number;
  tasksCount: number;
  adminEmail: string;
  pmEmail: string;
  userEmails: string[];
}

export async function seedDatabase(): Promise<SeedResult> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run seed script in production environment (NODE_ENV=production)");
  }

  await connectDB();

  // Clear existing records to ensure clean idempotent seed state
  await Comment.deleteMany({});
  await Task.deleteMany({});
  await Project.deleteMany({});
  await User.deleteMany({});

  // 1. Create Users (1 admin, 1 PM, 2 users)
  // Password for demo accounts is 'password123' (hashed with bcrypt, never logged)
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await User.create({
    name: "Admin User",
    email: "admin@example.com",
    passwordHash,
    role: "admin",
  });

  const pm = await User.create({
    name: "Project Manager",
    email: "pm@example.com",
    passwordHash,
    role: "pm",
  });

  const userAlice = await User.create({
    name: "Alice Developer",
    email: "alice@example.com",
    passwordHash,
    role: "user",
  });

  const userBob = await User.create({
    name: "Bob Designer",
    email: "bob@example.com",
    passwordHash,
    role: "user",
  });

  // 2. Create 1 Demo Project
  const project = await Project.create({
    name: "TaskFlow Core Portal",
    description: "Rebuild of the TaskFlow project management portal in Next.js with Kanban and AI features.",
    owner: pm._id,
    members: [pm._id, userAlice._id, userBob._id],
    status: "active",
    color: "blue",
    key: "TF",
    nextTaskNumber: 9,
  });

  // 3. Create 8 Tasks (2 in each column: todo, in_progress, review, done)
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const demoTasks = [
    // Column: todo
    {
      project: project._id,
      number: 1,
      title: "Set up analytics and event tracking",
      description: "Integrate privacy-focused product analytics for Kanban user actions.",
      status: "todo" as const,
      priority: "low" as const,
      assignee: userAlice._id,
      dueDate: new Date(now + 7 * oneDay),
      completedAt: null,
      order: 0,
      createdBy: pm._id,
    },
    {
      project: project._id,
      number: 2,
      title: "Design high-contrast dark mode theme",
      description: "Refine shadcn/ui color tokens for accessible contrast ratios.",
      status: "todo" as const,
      priority: "medium" as const,
      assignee: userBob._id,
      dueDate: new Date(now + 5 * oneDay),
      completedAt: null,
      order: 1,
      createdBy: pm._id,
    },
    // Column: in_progress
    {
      project: project._id,
      number: 3,
      title: "Build role-based session middleware",
      description: "Enforce route protection for admin, pm, and user roles.",
      status: "in_progress" as const,
      priority: "high" as const,
      assignee: userAlice._id,
      dueDate: new Date(now + 2 * oneDay),
      completedAt: null,
      order: 0,
      createdBy: pm._id,
    },
    {
      project: project._id,
      number: 4,
      title: "Implement drag-and-drop Kanban board",
      description: "Use dnd-kit for fluid column and card dragging with keyboard accessibility.",
      status: "in_progress" as const,
      priority: "medium" as const,
      assignee: userBob._id,
      dueDate: new Date(now + 3 * oneDay),
      completedAt: null,
      order: 1,
      createdBy: pm._id,
    },
    // Column: review
    {
      project: project._id,
      number: 5,
      title: "AI task breakdown structured output",
      description: "Generate structured subtasks using Gemini model and Zod validation.",
      status: "review" as const,
      priority: "high" as const,
      assignee: userAlice._id,
      dueDate: new Date(now + 1 * oneDay),
      completedAt: null,
      order: 0,
      createdBy: pm._id,
    },
    {
      project: project._id,
      number: 6,
      title: "Task drawer comments polling",
      description: "Implement 5-second polling thread for new comments on active tasks.",
      status: "review" as const,
      priority: "low" as const,
      assignee: userBob._id,
      dueDate: new Date(now + 2 * oneDay),
      completedAt: null,
      order: 1,
      createdBy: pm._id,
    },
    // Column: done
    {
      project: project._id,
      number: 7,
      title: "Architecture planning and PRD finalization",
      description: "Document roles, data models, and API endpoints for Next.js rebuild.",
      status: "done" as const,
      priority: "high" as const,
      assignee: pm._id,
      dueDate: new Date(now - 3 * oneDay),
      completedAt: new Date(now - 2 * oneDay),
      order: 0,
      createdBy: pm._id,
    },
    {
      project: project._id,
      number: 8,
      title: "Mongoose database schemas and connection helper",
      description: "Set up cached Mongoose client for dev hot reloading with indexed models.",
      status: "done" as const,
      priority: "medium" as const,
      assignee: userAlice._id,
      dueDate: new Date(now - 1 * oneDay),
      completedAt: new Date(now - 12 * 60 * 60 * 1000),
      order: 1,
      createdBy: pm._id,
    },
  ];

  const createdTasks = await Task.insertMany(demoTasks);

  // Optional: Add a demo comment on a review task to showcase the comment thread
  await Comment.create({
    task: createdTasks[4]._id,
    author: pm._id,
    body: "Please verify rate-limiting when the user triggers breakdown multiple times.",
  });

  return {
    usersCount: 4,
    projectsCount: 1,
    tasksCount: createdTasks.length,
    adminEmail: admin.email,
    pmEmail: pm.email,
    userEmails: [userAlice.email, userBob.email],
  };
}

if (process.argv[1] && /scripts[\\/]seed\.ts$/.test(process.argv[1])) {
  seedDatabase()
    .then((result) => {
      console.log("Database seeded successfully:");
      console.log(`- Created ${result.usersCount} users (1 Admin, 1 PM, 2 Users)`);
      console.log(`  * Admin: ${result.adminEmail}`);
      console.log(`  * PM: ${result.pmEmail}`);
      console.log(`  * Users: ${result.userEmails.join(", ")}`);
      console.log(`- Created ${result.projectsCount} demo project`);
      console.log(`- Created ${result.tasksCount} demo tasks across Kanban columns`);
      return mongoose.disconnect();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error instanceof Error ? error.message : error);
      mongoose.disconnect().finally(() => {
        process.exit(1);
      });
    });
}
