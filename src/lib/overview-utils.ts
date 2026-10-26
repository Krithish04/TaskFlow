export interface ActivityItem {
  id: string;
  type: "task_created" | "task_completed" | "task_updated" | "comment" | "message" | "file";
  actorName: string;
  actorEmail?: string;
  action: string;
  targetName?: string;
  targetKey?: string;
  timestamp: Date;
  link: string;
}

export interface UpcomingTaskItem {
  id: string;
  number: number;
  formattedKey: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: string;
  dueDate: Date;
  isOverdue: boolean;
  dueLabel: string;
  assignee?: {
    id: string;
    name: string;
    email?: string;
  } | null;
}

/**
 * Formats a timestamp into a concise human-readable relative time string.
 */
export function formatRelativeTime(dateInput: Date | string | number, referenceNow?: Date): string {
  const date = new Date(dateInput);
  const now = referenceNow ? new Date(referenceNow) : new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    return "just now";
  }

  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) {
    return "just now";
  }

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a due date and determines overdue status.
 */
export function formatDueDate(
  dateInput: Date | string,
  referenceNow?: Date
): { label: string; isOverdue: boolean } {
  const dueDate = new Date(dateInput);
  const now = referenceNow ? new Date(referenceNow) : new Date();

  // Reset time portions for day comparison using UTC
  const dueDay = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const dayDiff = Math.round((dueDay - today) / (1000 * 60 * 60 * 24));

  if (dayDiff < -1) {
    const overdueDays = Math.abs(dayDiff);
    return {
      label: `${overdueDays}d overdue`,
      isOverdue: true,
    };
  }
  if (dayDiff === -1) {
    return { label: "1d overdue", isOverdue: true };
  }
  if (dayDiff === 0) {
    return { label: "Due today", isOverdue: false };
  }
  if (dayDiff === 1) {
    return { label: "Due tomorrow", isOverdue: false };
  }
  if (dayDiff < 7) {
    return { label: `Due in ${dayDiff}d`, isOverdue: false };
  }

  return {
    label: `Due ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    isOverdue: false,
  };
}

/**
 * Filters and sorts tasks with upcoming due dates (excluding completed tasks).
 */
export function filterUpcomingDueTasks(
  tasks: Array<{
    _id?: unknown;
    id?: string;
    number?: number;
    title?: string;
    priority?: string;
    status?: string;
    dueDate?: Date | string | null;
    assignee?: { _id?: unknown; id?: string; name?: string; email?: string } | null;
  }>,
  projectKey: string,
  referenceNow?: Date,
  limit: number = 5
): UpcomingTaskItem[] {
  const now = referenceNow ? new Date(referenceNow) : new Date();

  return tasks
    .filter((task) => {
      if (task.status === "done") return false;
      if (!task.dueDate) return false;
      return true;
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, limit)
    .map((task) => {
      const taskId = task._id?.toString() || task.id || "";
      const num = task.number || 1;
      const { label, isOverdue } = formatDueDate(task.dueDate!, now);

      let assigneeObj: UpcomingTaskItem["assignee"] = null;
      if (task.assignee) {
        assigneeObj = {
          id: task.assignee._id?.toString() || task.assignee.id || "",
          name: task.assignee.name || "Assigned",
          email: task.assignee.email,
        };
      }

      return {
        id: taskId,
        number: num,
        formattedKey: `${projectKey}-${num}`,
        title: task.title || "Untitled Task",
        priority: (task.priority as "low" | "medium" | "high") || "medium",
        status: task.status || "todo",
        dueDate: new Date(task.dueDate!),
        isOverdue,
        dueLabel: label,
        assignee: assigneeObj,
      };
    });
}

/**
 * Builds a unified recent activity feed for a project.
 * Merges tasks (created/completed), task comments, messages, and files.
 */
export function buildActivityFeed(params: {
  projectId: string;
  projectKey: string;
  tasks?: Array<{
    _id?: unknown;
    id?: string;
    number?: number;
    title?: string;
    status?: string;
    createdAt?: Date | string;
    completedAt?: Date | string | null;
    createdBy?: { name?: string; email?: string } | null;
    assignee?: { name?: string; email?: string } | null;
  }>;
  comments?: Array<{
    _id?: unknown;
    id?: string;
    body?: string;
    createdAt?: Date | string;
    author?: { name?: string; email?: string } | null;
    task?: { number?: number; title?: string } | null;
  }>;
  messages?: Array<{
    _id?: unknown;
    id?: string;
    body?: string;
    createdAt?: Date | string;
    authorName?: string;
    authorEmail?: string;
  }>;
  files?: Array<{
    _id?: unknown;
    id?: string;
    name?: string;
    createdAt?: Date | string;
    uploaderName?: string;
    uploaderEmail?: string;
  }>;
  limit?: number;
}): ActivityItem[] {
  const { projectId, projectKey, tasks = [], comments = [], messages = [], files = [], limit = 10 } = params;
  const items: ActivityItem[] = [];

  // 1. Process tasks: creation and completion events
  for (const t of tasks) {
    const taskId = t._id?.toString() || t.id || "";
    const taskNum = t.number || 1;
    const taskKey = `${projectKey}-${taskNum}`;

    // Completion event
    if (t.status === "done" && t.completedAt) {
      items.push({
        id: `task-completed-${taskId}`,
        type: "task_completed",
        actorName: t.assignee?.name || t.createdBy?.name || "Team member",
        actorEmail: t.assignee?.email || t.createdBy?.email,
        action: "completed task",
        targetName: t.title,
        targetKey: taskKey,
        timestamp: new Date(t.completedAt),
        link: `/projects/${projectId}/board`,
      });
    }

    // Creation event
    if (t.createdAt) {
      items.push({
        id: `task-created-${taskId}`,
        type: "task_created",
        actorName: t.createdBy?.name || "Team member",
        actorEmail: t.createdBy?.email,
        action: "created task",
        targetName: t.title,
        targetKey: taskKey,
        timestamp: new Date(t.createdAt),
        link: `/projects/${projectId}/board`,
      });
    }
  }

  // 2. Process comments
  for (const c of comments) {
    const commentId = c._id?.toString() || c.id || "";
    const taskNum = c.task?.number;
    const taskKey = taskNum ? `${projectKey}-${taskNum}` : undefined;
    const snippet = c.body ? (c.body.length > 50 ? `${c.body.slice(0, 50)}…` : c.body) : "";

    if (c.createdAt) {
      items.push({
        id: `comment-${commentId}`,
        type: "comment",
        actorName: c.author?.name || "Team member",
        actorEmail: c.author?.email,
        action: "commented on",
        targetName: snippet ? `"${snippet}"` : c.task?.title || "task",
        targetKey: taskKey,
        timestamp: new Date(c.createdAt),
        link: `/projects/${projectId}/board`,
      });
    }
  }

  // 3. Process chat messages
  for (const m of messages) {
    const msgId = m._id?.toString() || m.id || "";
    const snippet = m.body ? (m.body.length > 50 ? `${m.body.slice(0, 50)}…` : m.body) : "";

    if (m.createdAt) {
      items.push({
        id: `msg-${msgId}`,
        type: "message",
        actorName: m.authorName || "Team member",
        actorEmail: m.authorEmail,
        action: "sent a message",
        targetName: snippet ? `"${snippet}"` : undefined,
        timestamp: new Date(m.createdAt),
        link: `/projects/${projectId}/chat`,
      });
    }
  }

  // 4. Process files
  for (const f of files) {
    const fileId = f._id?.toString() || f.id || "";
    if (f.createdAt) {
      items.push({
        id: `file-${fileId}`,
        type: "file",
        actorName: f.uploaderName || "Team member",
        actorEmail: f.uploaderEmail,
        action: "uploaded file",
        targetName: f.name || "attachment",
        timestamp: new Date(f.createdAt),
        link: `/projects/${projectId}/files`,
      });
    }
  }

  // Sort descending by timestamp
  return items
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}
