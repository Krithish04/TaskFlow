# TaskFlow PRD (Next.js rebuild with AI)

## Goal
Recreate TaskFlow as a single Next.js app with role-based dashboards, a Kanban board, task comments, and AI features.

## Roles and permissions

| Action | Admin | PM | User |
|---|---|---|---|
| Manage users and roles | yes | no | no |
| Create / edit / delete projects | yes | own projects | no |
| Add members to a project | yes | own projects | no |
| Create tasks | yes | own projects | no |
| Edit any task field | yes | own projects | no |
| Move own assigned task between columns | yes | yes | yes |
| Comment on a task | yes | projects they belong to | projects they belong to |
| View a project | all | projects they belong to | projects they belong to |
| Use AI features | yes | yes | summaries and assistant only |

## Data models
- **User**: name, email (unique), passwordHash, role (`admin` | `pm` | `user`), createdAt
- **Project**: name, description, owner (User), members (User[]), status, createdAt
- **Task**: project, title, description, status (`todo` | `in_progress` | `review` | `done`), priority (`low` | `medium` | `high`), assignee (User), dueDate, order (number, position inside its column), createdBy, createdAt
- **Comment**: task, author (User), body, createdAt

## Pages
- `/login`
- `/dashboard` renders the dashboard for the signed-in role:
  - Admin: user table, role editing, all projects overview
  - PM: own projects, overdue tasks, workload per member, weekly report button
  - User: assigned tasks, due soon, recent comments
- `/projects/[id]` Kanban board (four columns, drag to move)
- Task drawer with details and comment thread (polling every 5 s for new comments)
- Assistant chat panel inside a project

## API (Route Handlers under `src/app/api`)
- `POST /api/auth/[...nextauth]`
- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/[id]`
- `GET/POST /api/projects/[id]/tasks`, `PATCH/DELETE /api/tasks/[id]`, `POST /api/tasks/[id]/move`
- `GET/POST /api/tasks/[id]/comments`
- `GET/PATCH /api/users`, `PATCH /api/users/[id]` (admin only)
- `POST /api/ai/breakdown`, `/api/ai/create-task`, `/api/ai/summarize-comments`, `/api/ai/weekly-report`, `/api/ai/assistant`

## AI features
1. **Task breakdown**: from a project description, return subtasks with priority and estimate (structured output validated with Zod).
2. **Create task from plain language**: "assign login bug to Rahul, high priority, due Friday" returns a draft task the user confirms before saving.
3. **Comment summary**: summarize a long comment thread on one task.
4. **Weekly report**: PM-only. Summarize done, in-progress, overdue and at-risk work for one project.
5. **Project assistant**: answers questions about one project using its real task data (overdue, who is overloaded). Read-only.

AI rules: server-side only, streamed where it helps, rate-limited per user, provider chosen by env (`AI_MODEL`), graceful message when the free-tier quota is hit (HTTP 429).

## Non-goals (for now)
Email notifications, file attachments, real-time websockets, multi-tenant organizations.

## Definition of done
Every task in `tasks.md` is checked, lint, typecheck and tests pass, and `npm run seed` creates one admin, one PM, two users and a demo project.
