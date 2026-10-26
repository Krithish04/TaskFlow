# TaskFlow Phase 2 Progress

## Task 23: Design tokens and theme per DESIGN.md
- Configured CSS design tokens in `src/app/globals.css` for light and dark themes (foundations, surface/surface-raised, border, radius 8px/12px, tabular-nums, reduced motion, 8 project palette colors, status and priority colors).
- Added `src/lib/design-tokens.ts` with typed helpers for `PROJECT_COLOR_PALETTE`, `STATUS_CONFIG`, and `PRIORITY_CONFIG`.
- Added shared UI components: `Card` (styled to 8px radius), `Badge` (with status/priority variants), `Avatar` (with `AvatarStack`), `EmptyState`, `Skeleton`, `Toast` (with `Toaster` mounted in `layout.tsx`), and `Tabs` (with line and pill variants).
- Test script status: Skipped `npm test` as test scripts were removed during cleanup; verified `npm run lint`, `npm run typecheck`, and `npm run build` all pass cleanly with 0 errors.
- Next run (Task 24): App shell layout with sidebar, breadcrumbs, user menu, theme toggle, and restyling existing screens and dialogs to the new tokens.

## Task 24: App shell and restyled existing views
- Built `AppShell` (`src/components/layout/app-shell.tsx`), `ThemeProvider` (`src/components/theme-provider.tsx`), and `ThemeToggle` (`src/components/theme-toggle.tsx`) supporting light, dark, and system themes with hydration-safe `useSyncExternalStore`.
- Restyled Login page, User/PM/Admin dashboards, Kanban board, Task drawer, Task comments, and AI breakdown dialog to use the new design tokens, Badges, Avatars, Skeletons, and EmptyStates with 0 horizontal overflow.
- Passed `npm run lint`, `npm run typecheck`, and `npm run build` with 0 errors and 0 warnings.
- Tested all screens at 375 px and 1280 px in both light and dark modes with browser automation.
- Next run (Task 25): [review] Data model v2: Project `color`, `key`, `nextTaskNumber`; Task `number` and `completedAt`. Add `scripts/migrate-v2.ts` and `npm run migrate:v2`. Tests for numbering and completedAt.

## Task 25: [review] Data model v2
- Updated `Project` model with `color` (from 8-color palette), `key` (2-5 uppercase letters), and `nextTaskNumber` (default 1). Added `generateProjectKey` helper.
- Updated `Task` model with `number` (indexed with project) and `completedAt`.
- Updated task creation to atomically increment `nextTaskNumber` via `$inc`. Updated task move (`/api/tasks/[id]/move`) and edit (`/api/tasks/[id]`) APIs to set `completedAt` on transition to `done` and clear it on exit from `done`.
- Created idempotent migration script `scripts/migrate-v2.ts` and registered `npm run migrate:v2`. Verified idempotency (run 1 updated 1 project and 8 tasks; run 2 updated 0 projects and 0 tasks).
- Added unit tests in `src/__tests__/datamodel-v2.test.ts` and registered `npm test`. All 9 tests passed cleanly.
- CodeRabbit: `coderabbit review --uncommitted --include-untracked` was launched, but failed due to WebSocket connection abort; proceeding per prompt rules.
- Verified `npm run lint`, `npm run typecheck`, and `npm run build` all pass with 0 errors.
- Next run (Task 26): [review] Workspace layout at `/projects/[id]` with persistent project header and tabs (Overview, Board, Chat, Files, Analytics, Members). Move Kanban to `/board`. Redirect the bare route to overview. Return 404 for projects the user cannot access. Build the `/projects` card grid and a project switcher in the sidebar. Show task ids as `KEY-12` everywhere. Project create and edit dialogs get color and key.

## Task 26: [review] Workspace layout at `/projects/[id]` and project features
- Built persistent workspace layout at `/projects/[id]` with `WorkspaceHeader` (color accent, key badge, status, and navigation tabs: Overview, Board, Chat, Files, Analytics, Members). Returns 404 for projects the user cannot access, and restricts the Members tab to PM and Admin. Moved Kanban to `/board` and redirected bare route `/projects/[id]` to `/projects/[id]/overview`.
- Built `/projects` card grid with search, filter, "+ New Project" button, and responsive cards (color bar, key badge, progress bar, overdue badge, member avatar stack). Added Project Switcher dropdown in the AppShell sidebar.
- Formatted task IDs as `KEY-12` across Kanban cards, task drawer, and dashboards. Created shared `ProjectDialog` with 8-color palette selector and 2-5 letter key derivation for creating/editing projects on `/projects` and PM dashboard.
- Ran CodeRabbit review and addressed security and correctness findings (gated availableMembers query to authorized creators/managers and aligned query with schema). Verified `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all pass with 0 errors.
- Next run (Task 27): Overview tab: description, progress, upcoming due, members, and a recent activity feed (latest tasks, messages and files of this project only).

## Task 27: Overview tab
- Implemented rich Project Overview tab at `/projects/[id]/overview` featuring:
  - Top KPI cards (Total Tasks, In Progress, Completed, Overdue) and project accent progress bar.
  - Project Details with formatted description, status/key badges, and direct links to Kanban and Chat.
  - Upcoming Due list with priority badges, assignees, formatted due dates, and overdue alerts.
  - Project Team members card with roles and owner badge, with "Manage" link for PM/Admin.
  - Chronological Recent Activity feed strictly scoped to the project, merging task creation/completion, task comments, chat messages, and file uploads.
- Created `src/lib/overview-utils.ts` and comprehensive unit tests in `src/__tests__/overview.test.ts`. Enhanced `src/lib/db.ts` to validate connection readyState against stale drops.
- Tested responsive layout at 1280px and 375px in both light and dark modes with browser subagent (0 overflow, clean stacking). All checks passed: `npm run typecheck`, `npm run lint`, `npm test` (13 passed), and `npm run build` (21 routes compiled).
- Next run (Task 28): Members tab (PM and Admin): add and remove project members. Removing a member unassigns their tasks and revokes access immediately.

## Task 28: Members tab (PM and Admin)
- Created dedicated REST API endpoints `GET /api/projects/[id]/members`, `POST /api/projects/[id]/members` (add member with duplication prevention), and `DELETE /api/projects/[id]/members/[userId]` (removes member, unassigns their tasks in this project, and immediately revokes project access; protects owner).
- Built interactive `MembersManager` UI at `/projects/[id]/members` restricted to PM (owner) and Admin (returning 404 for unauthorized users) with member search, role filters, pinned owner card, assigned task counts, add member modal dialog, and remove confirmation with task unassignment warning.
- Added comprehensive unit tests in `src/__tests__/members.test.ts` covering role permissions, owner protection, task unassignment upon member removal, and cross-project isolation. Verified responsive design in light/dark modes at 1280px and 375px via browser testing. Passed `npm run typecheck`, `npm run lint`, `npm test` (21 passed), and `npm run build` (21 routes compiled).
- Next run (Task 29): [review] File storage: GridFS bucket, File model, `POST /api/projects/[id]/files` (multipart) with size, extension, mime and magic-byte checks, filename sanitising, per-project quota and rate limit; `GET /api/files/[id]` with the secure headers in PRD-v2.md; `DELETE /api/files/[id]`. Tests, including a user from project A requesting a file of project B (must be 404).

## Task 29: [review] File storage & isolation
- Implemented MongoDB GridFS file storage using bucket `project_files` with `src/models/File.ts` (`project`, `uploader`, `name`, `mime`, `size`, `storageId`, `taskId`, `messageId`, `deletedAt`, timestamps) and compound index `{ project: 1, deletedAt: 1, createdAt: -1 }`.
- Created robust validation utilities in `src/lib/file-utils.ts`:
  - Path traversal & character sanitization (`sanitizeFilename`).
  - Binary magic-byte detection for PDF, PNG, JPEG, GIF, WEBP, ZIP/Office OpenXML, and plain text/Markdown/CSV without embedded HTML/SVG executable code (`validateFileType`).
  - Secure `Content-Disposition` header logic (`inline` for safe images, `attachment; filename="..."` for all other files).
  - Rolling-window upload rate limiting (20 uploads/min per user) and per-project storage quota enforcement (100 MB max total active bytes; 4 MB max single file size).
- Implemented API route handlers with strict isolation:
  - `POST /api/projects/[id]/files`: multipart form parser, project membership check (404 on access denial), rate limit, magic-byte inspection, quota verification, streaming into GridFS bucket, and File record creation.
  - `GET /api/projects/[id]/files`: lists active files for the project.
  - `GET /api/files/[id]`: derives project from stored file record, returns 404 for non-members (anti-probing), streams binary from GridFS with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox` headers.
  - `DELETE /api/files/[id]`: enforces deletion rights (uploader, project PM/owner, or Admin; 404 for others), soft-deletes database record, and removes binary from GridFS bucket.
- Added comprehensive unit tests in `src/__tests__/files.test.ts` verifying filename sanitization, magic-byte checking, disposition headers, rate limiting, quota logic, cross-project isolation (404), and deletion permissions. All 37 tests across 12 suites pass.
- Ran CodeRabbit review and addressed findings: preserved 401 for `UnauthorizedError` while mapping forbidden access to 404 for anti-probing, and updated README tech stack test runner description.
- Verified all quality gates: `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm test` (37/37 pass), and `npm run build` (all 21 App Router routes compile cleanly).
- Next run (Task 30): [review] Message model and API: `GET` with `after` and `limit`, `POST` with fileIds (files must belong to the same project and not already be attached), `DELETE` with the author/PM/Admin rules. ProjectReadState and an endpoint to mark read. Tests including isolation.

