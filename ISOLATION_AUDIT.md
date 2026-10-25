# TaskFlow Project Isolation & Data Access Security Audit

**Audit Date**: October 26, 2026  
**Auditor**: Antigravity Assistant  
**Objective**: Audit every API route, server action, server component, and dashboard query reading/writing `Project`, `Task`, or `Comment` data, or invoking AI features with project context. Verify project isolation: users can only read or change data for projects where they are the owner or a member; Administrators can access all projects per PRD.md.

---

## 1. Executive Summary

TaskFlow implements role-based access control across Admin, PM, and User tiers. While project-level permission checks (`requireProjectAccess`) exist on most routes, several critical isolation gaps and ID probing vectors were identified:

1. **Information Leakage via HTTP 403 instead of 404**: Unauthorized requests to projects, tasks, or comments return `403 Forbidden` instead of `404 Not Found`, allowing unauthorized users to probe whether specific IDs exist in the database.
2. **Dashboard Task & Comment Leaks**: The User Dashboard queries assigned tasks via `{ assignee: user.id }` without constraining by `project: { $in: accessibleProjectIds }`. If a user is assigned a task in a project they no longer belong to, that task, its deadline alerts, and its discussion comments leak into their dashboard.
3. **Overexposed User Directory**: `GET /api/users` is currently restricted to Admin only (returning 403 to non-admins). However, PMs and members require a user picker to assign tasks and view teammates. The PM dashboard currently runs `User.find({}, "name email role")`, exposing every user, email, and role across the system to any PM. Non-admins must only see users who share a project with them, and only `name` and `id`.
4. **Unconstrained Task Assignment**: When creating (`POST /api/projects/[id]/tasks`) or updating (`PATCH /api/tasks/[id]`) a task, the `assignee` is not validated against the project's roster (`owner` + `members`). Any arbitrary user ID can be assigned to a project's task.
5. **Orphaned Assignments on Member Removal**: When updating project members (`PATCH /api/projects/[id]`), removed members retain their assigned tasks in that project instead of having them set to `assignee: null`.

---

## 2. API Routes Audit

| Route & Method | Reads/Writes Data | Current Access Check | Isolation Status & Findings |
|---|---|---|---|
| `GET /api/projects` | Reads `Project` | Role check (`admin` vs non-admin). Non-admin queries `{ $or: [{ owner: id }, { members: id }] }`. | **PARTIAL**: Correctly filters projects, but does not use a shared helper `getAccessibleProjectIds`. |
| `POST /api/projects` | Writes `Project` | `canCreateProject(role)` (Admin/PM). Sets `owner: user.id`. | **SECURE**: Owner is always authenticated user. Members are validated ObjectIds. |
| `GET /api/projects/[id]` | Reads `Project` | `requireProjectAccess(id, "view")` | **VULNERABILITY (ID Probing)**: Throws `ForbiddenError` (403) when user lacks access, revealing the project exists. Must return 404. |
| `PATCH /api/projects/[id]` | Writes `Project` | `requireProjectAccess(id, "edit")` | **VULNERABILITIES**: <br>1. Throws 403 instead of 404 when user has no access to the project.<br>2. When members are removed, their assigned tasks in this project are not unassigned. |
| `DELETE /api/projects/[id]` | Writes `Project`, `Task`, `Comment` | `requireProjectAccess(id, "manage")` | **VULNERABILITY (ID Probing)**: Throws 403 instead of 404 when user lacks access. Cascading deletion of project tasks/comments is present. |
| `GET /api/projects/[id]/tasks` | Reads `Task` | `requireProjectAccess(id, "view")` | **VULNERABILITY (ID Probing)**: Throws 403 instead of 404 when user lacks access to project `id`. |
| `POST /api/projects/[id]/tasks` | Writes `Task` | `requireProjectAccess(id, "edit")` | **VULNERABILITIES**: <br>1. Throws 403 instead of 404 when user lacks access to project.<br>2. `assignee` is not validated against project owner and members. Any user ID can be assigned. |
| `GET /api/tasks/[id]` | Reads `Task` | `Task.findById(id)` then `requireProjectAccess(task.project, "view")` | **VULNERABILITY (ID Probing)**: Uses task's own project (good), but throws 403 instead of 404 when user lacks access, revealing task existence. |
| `PATCH /api/tasks/[id]` | Writes `Task` | `Task.findById(id)` then `requireProjectAccess(task.project, "edit")` | **VULNERABILITIES**: <br>1. Throws 403 instead of 404 when user lacks access.<br>2. `assignee` is not validated to be an owner or member of `task.project`. |
| `DELETE /api/tasks/[id]` | Writes `Task`, `Comment` | `Task.findById(id)` then `requireProjectAccess(task.project, "edit")` | **VULNERABILITY (ID Probing)**: Throws 403 instead of 404 when user lacks access. |
| `POST /api/tasks/[id]/move` | Writes `Task` | `Task.findById(id)` then `requireProjectAccess(task.project, "view")`, then `canMoveTask` | **VULNERABILITY (ID Probing)**: Uses `task.project` (good), but throws 403 instead of 404 if user cannot access the project. |
| `GET /api/tasks/[id]/comments` | Reads `Comment` | `Task.findById(id)` then `requireProjectAccess(task.project, "view")` | **VULNERABILITY (ID Probing)**: Throws 403 instead of 404 if user lacks access to `task.project`. |
| `POST /api/tasks/[id]/comments` | Writes `Comment` | `Task.findById(id)` then `requireProjectAccess(task.project, "comment")` | **VULNERABILITY (ID Probing)**: Uses `task.project` (good), but throws 403 instead of 404 if user lacks access. |
| `GET /api/users` | Reads `User` | `requireRole("admin")` | **VULNERABILITY (Over-restriction & Member Picker)**: Non-admins get 403. However, non-admins should be able to fetch users who share a project with them (returning only `id` and `name`). |
| `GET /api/users/[id]` | Reads `User` | `requireRole("admin")` | **SECURE**: Admin-only administrative user management. |
| `PATCH /api/users/[id]` | Writes `User` | `requireRole("admin")` | **SECURE**: Admin-only role modification. |

---

## 3. AI Routes Audit

| Route & Method | Reads Data | Access Check & Scoping | Isolation Status & Findings |
|---|---|---|---|
| `POST /api/ai/breakdown` | Reads `Project` | `requireRole(["admin", "pm"])`, `requireAIPermission("breakdown")`, `requireProjectAccess(projectId, "edit")` | **VULNERABILITY (ID Probing)**: Returns 403 instead of 404 if user cannot access `projectId`. Prompt context strictly contains requested project's name and description. |
| `POST /api/ai/create-task` | Reads `Project` | `requireRole(["admin", "pm"])`, `requireAIPermission("create-task")`, `requireProjectAccess(projectId, "edit")` | **VULNERABILITY (ID Probing)**: Returns 403 instead of 404. Candidate members are correctly scoped to `project.owner` and `project.members`. |
| `POST /api/ai/summarize-comments` | Reads `Task`, `Comment`, `Project` | Finds task, then `requireProjectAccess(task.project, "view")` | **VULNERABILITY (ID Probing)**: Checks `task.project` (never client projectId), but returns 403 instead of 404 if unauthorized. Comments fetched strictly from `task._id`. |
| `POST /api/ai/weekly-report` | Reads `Project`, `Task` | `requireRole(["admin", "pm"])`, `requireAIPermission("weekly-report")`, `requireProjectAccess(projectId, "edit")` | **VULNERABILITY (ID Probing)**: Returns 403 instead of 404. Tasks queried strictly by `{ project: projectId }`. |
| `POST /api/ai/assistant` | Reads `Project`, `Task` | `requireRole(["admin", "pm", "user"])`, `requireAIPermission("assistant")`, `requireProjectAccess(projectId, "view")` | **VULNERABILITY (ID Probing)**: Returns 403 instead of 404. Tasks and workload queried strictly by `{ project: project._id }`. |

---

## 4. Server Components & Dashboard Queries Audit

### 4.1. Admin Dashboard (`src/app/dashboard/page.tsx` - `role === "admin"`)
- **Queries**:
  - `User.find({}, "name email role createdAt")`
  - `Project.find({}).populate("owner", "name email")`
- **Isolation Assessment**: **SECURE**. Admins are authorized to view all projects, metrics, and manage user roles across the organization per PRD.md.

### 4.2. Project Manager Dashboard (`src/app/dashboard/page.tsx` - `role === "pm"`)
- **Queries**:
  - `Project.find({ $or: [{ owner: session.user.id }, { members: session.user.id }] })`: Scoped to PM's projects.
  - `User.find({}, "name email role")`:
    - **VULNERABILITY (Privacy Violation & Cross-Project Leak)**: Passes every registered user, email, and role to `PMProjects` as `availableUsers`.
    - **Fix Required**: A non-admin must only see users who share a project with them, and only `name` and `id`.

### 4.3. Team Member Dashboard (`src/app/dashboard/page.tsx` - `role === "user"`)
- **Queries**:
  - `Project.find({ $or: [{ owner: session.user.id }, { members: session.user.id }] })`: Scoped to user's projects.
  - `Task.find({ assignee: session.user.id })`:
    - **VULNERABILITY (Cross-Project Leak)**: Does not restrict `project: { $in: projectIds }`. If a user was assigned a task in a project they are not a member of (or were removed from), that task leaks into their active list, stats count, and "Due Soon" alert.
  - `Task.find({ $or: [{ assignee: session.user.id }, { project: { $in: projectIds } }] }, "_id")`:
    - **VULNERABILITY (Cross-Project Comment Leak)**: Collects task IDs where `assignee: session.user.id` even when `project` is NOT in `projectIds`. Subsequent query `Comment.find({ task: { $in: relevantTaskIds } })` leaks discussion threads from unaccessible projects into the user's recent activity feed.

### 4.4. Kanban Board Page (`src/app/projects/[id]/page.tsx`)
- **Queries**:
  - `requireProjectAccess(id, "view")` inside try/catch -> calls Next.js `notFound()`.
  - `Project.findById(id)`
  - `Task.find({ project: id })`
- **Isolation Assessment**: **SECURE**. Correctly triggers 404 `notFound()`, queries only tasks belonging to `id`, and limits `availableMembers` strictly to the project's owner and members.

---

## 5. Server Actions Audit

- `src/app/login/actions.ts`: Contains `loginAction` using Auth.js credentials verification. No project or task data is queried or updated.
- `src/app/dashboard/page.tsx`: Contains inline `signOut` server actions. No project data accessed.

---

## 6. Required Fixes Plan

1. **Shared Access Helper (`src/lib/permissions.ts`)**:
   - Implement `getAccessibleProjectIds(user: AuthUser): Promise<Types.ObjectId[]>`:
     - Returns all project IDs for Admins.
     - Returns project IDs where `owner == user.id || members CONTAINS user.id` for PM/User.
   - Update `requireProjectAccess`:
     - Throw `NotFoundError` (status 404) instead of `ForbiddenError` (403) whenever a user has no view access to the requested project, or when requesting a non-existent project.
     - When a user has view access to a project but lacks `edit`/`manage` access, throw `ForbiddenError` (403).
2. **Dashboard Query Hardening (`src/app/dashboard/page.tsx`)**:
   - For Member dashboard: Constrain `Task.find` to `{ assignee: user.id, project: { $in: projectIds } }`.
   - Constrain `Comment` task query strictly to tasks belonging to `projectIds`.
   - For PM dashboard: Restrict `availableUsers` to users who share a project with the PM, projecting only `id` and `name`.
3. **Users API (`src/app/api/users/route.ts`)**:
   - For Admin: Return all users with full fields (`id`, `name`, `email`, `role`, `createdAt`).
   - For Non-Admin (PM and User): Return only users sharing at least one project with the requesting user, with only `id` and `name`.
4. **Task Assignment Validation**:
   - In `POST /api/projects/[id]/tasks` and `PATCH /api/tasks/[id]`: Validate that any non-null `assignee` is either the project owner or listed in `project.members`. Return 400 if an outsider is assigned.
5. **Member Removal Cleanup (`PATCH /api/projects/[id]`)**:
   - Compute `removedMembers = previousMembers.filter(m => !newMembers.includes(m))`.
   - Run `Task.updateMany({ project: id, assignee: { $in: removedMembers } }, { $set: { assignee: null } })`.
6. **Task & Comment Routes ID Probing Guard**:
   - In `GET/PATCH/DELETE /api/tasks/[id]`, `POST /api/tasks/[id]/move`, and `GET/POST /api/tasks/[id]/comments`, ensure unauthorized access to the task's project returns 404.
