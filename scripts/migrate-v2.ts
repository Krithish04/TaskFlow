import { loadEnvConfig } from "@next/env";
import { connectDB } from "../src/lib/db";
import { Project, PROJECT_COLORS, generateProjectKey } from "../src/models/Project";
import { Task } from "../src/models/Task";

loadEnvConfig(process.cwd());

export interface MigrationStats {
  projectsExamined: number;
  projectsUpdated: number;
  tasksExamined: number;
  tasksUpdated: number;
}

export async function migrateV2(): Promise<MigrationStats> {
  await connectDB();

  const stats: MigrationStats = {
    projectsExamined: 0,
    projectsUpdated: 0,
    tasksExamined: 0,
    tasksUpdated: 0,
  };

  const projects = await Project.find({})
    .setOptions({ defaults: false })
    .sort({ createdAt: 1, _id: 1 });
  stats.projectsExamined = projects.length;

  const existingKeys = new Set<string>();
  for (const p of projects) {
    if (p.key && /^[A-Z]{2,5}$/.test(p.key)) {
      existingKeys.add(p.key);
    }
  }

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    let projectDirty = false;

    // 1. Project Color
    if (
      !project.color ||
      !PROJECT_COLORS.includes(project.color as (typeof PROJECT_COLORS)[number])
    ) {
      project.color = PROJECT_COLORS[i % PROJECT_COLORS.length];
      projectDirty = true;
    }

    // 2. Project Key
    if (!project.key || !/^[A-Z]{2,5}$/.test(project.key)) {
      const newKey = generateProjectKey(project.name, existingKeys);
      project.key = newKey;
      existingKeys.add(newKey);
      projectDirty = true;
    }

    // 3. Tasks
    const tasks = await Task.find({ project: project._id })
      .setOptions({ defaults: false })
      .sort({
        createdAt: 1,
        _id: 1,
      });
    stats.tasksExamined += tasks.length;

    let maxTaskNumber = 0;
    const unnumberedTasks: typeof tasks = [];

    for (const t of tasks) {
      if (typeof t.number === "number" && t.number > 0) {
        if (t.number > maxTaskNumber) {
          maxTaskNumber = t.number;
        }
      } else {
        unnumberedTasks.push(t);
      }
    }

    const unnumberedIds = new Set(unnumberedTasks.map((t) => t._id.toString()));

    for (const t of tasks) {
      let taskDirty = false;
      const originalUpdatedAt = t.updatedAt;

      if (unnumberedIds.has(t._id.toString())) {
        maxTaskNumber += 1;
        t.number = maxTaskNumber;
        taskDirty = true;
      }

      if (t.status === "done") {
        if (!t.completedAt) {
          t.completedAt = originalUpdatedAt || t.createdAt || new Date();
          taskDirty = true;
        }
      } else {
        if (t.completedAt) {
          t.completedAt = null;
          taskDirty = true;
        }
      }

      if (taskDirty) {
        await t.save();
        stats.tasksUpdated += 1;
      }
    }

    const expectedNextTaskNumber = maxTaskNumber + 1;
    if (
      !project.nextTaskNumber ||
      project.nextTaskNumber < expectedNextTaskNumber
    ) {
      project.nextTaskNumber = expectedNextTaskNumber;
      projectDirty = true;
    }

    if (projectDirty) {
      await project.save();
      stats.projectsUpdated += 1;
    }
  }

  return stats;
}

async function run() {
  console.log("Running TaskFlow Data Model v2 migration...");
  const stats = await migrateV2();
  console.log("Migration completed:");
  console.log(`- Projects examined: ${stats.projectsExamined}, updated: ${stats.projectsUpdated}`);
  console.log(`- Tasks examined: ${stats.tasksExamined}, updated: ${stats.tasksUpdated}`);
  process.exit(0);
}

if (process.argv[1]?.includes("migrate-v2")) {
  run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
