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

## Task 30: [review] Message model, API & read state
- Created `src/models/Message.ts` with fields `project`, `author`, `body` (max 4000 chars, trimmed), `attachments` (File refs, max 5), `deletedAt`, and indexes for chronological `after` queries.
- Created `src/models/ProjectReadState.ts` with `user`, `project`, `lastReadAt`, and unique compound index `{ user: 1, project: 1 }`. Re-exported both in `src/models/index.ts`.
- Added `canDeleteMessage` helper to `src/lib/permissions.ts` enforcing: author can delete own message, PM owner can delete messages in their project, and Admin can delete any message.
- Implemented API route handlers with strict isolation & anti-probing:
  - `GET /api/projects/[id]/messages`: checks project view access (404 on access denial), supports `after` ISO timestamp filtering and bounded `limit` (default 50, max 100), populates author and active attachments.
  - `POST /api/projects/[id]/messages`: enforces project membership, validates body and max 5 attachments, checks that attached files belong to the same project and are not already attached (`messageId != null`), updates attached files with `messageId`, updates sender's `ProjectReadState`, and returns `201 Created`.
  - `DELETE /api/messages/[id]`: derives project association from stored message record (never client input), verifies project access with anti-probing 404, enforces `canDeleteMessage`, soft-deletes message, and releases file `messageId` attachments.
  - `POST & GET /api/projects/[id]/messages/read` and alias `/api/projects/[id]/read`: updates `lastReadAt` timestamp on POST, and returns `{ lastReadAt, unreadCount }` on GET.
- Added comprehensive unit tests in `src/__tests__/messages.test.ts` covering message validation, attachment eligibility, cross-project isolation, deletion permissions, timestamp filtering with `after`, and unread count computation. All 48 tests across 16 suites pass.
- Ran CodeRabbit review and addressed findings: refactored `DELETE /api/messages/[id]` to utilize the centralized `canDeleteMessage` helper.
- Verified all quality gates: `npm test` (48/48 pass), `npm run typecheck` (0 errors), `npm run lint` (0 errors), and `npm run build` (all 25 App Router routes compile cleanly).
- Next run (Task 31): Chat tab UI: message list, composer with attach button, drag and drop and paste, upload progress, image previews, file cards with size and download, 3 s polling that pauses when the tab is hidden, auto-scroll that does not jump while reading older messages, unread badge on the tab, empty state, mobile layout.

## Task 31: Chat tab UI
- Built responsive, full-featured `ChatView` client component in `src/components/chat/chat-view.tsx`:
  - Chronological message list with author avatars, roles, timestamps, and date divider pills.
  - Distinction between own messages (tinted accent bubble, right-aligned) and others' messages (left-aligned neutral bubble).
  - Pinned bottom composer with auto-growing textarea, Enter to send, Shift+Enter for newlines, and paperclip attach button.
  - Staged attachments tray supporting up to 5 files (max 4 MB each) with image thumbnails, file badges, and remove buttons.
  - Full drag-and-drop file attachment overlay and clipboard paste support (pasting screenshots or files directly stages them).
  - Multi-file upload progress tracking that streams files to `POST /api/projects/[id]/files` before sending the message.
  - Rich attachment rendering: inline zoomable image thumbnails with lightbox zoom modal, and document/archive file cards with file-type icons, sizes, and direct download buttons.
  - 3-second incremental polling via `after` timestamp that automatically pauses when the browser tab is hidden and resumes when visible (`visibilitychange`).
  - Smart auto-scroll that scrolls to bottom when user sends a message or is already at bottom, while maintaining scroll position and displaying a "New messages ↓" pill if reading older messages.
  - Message deletion with confirmation for author, PM owner, or Admin.
  - Empty state when channel has no messages and loading skeletons on initial load.
- Updated `WorkspaceHeader` with live unread badge polling (`/api/projects/[id]/messages/read`) that renders an unread count badge on the Chat tab when the user is on other tabs.
- Verified visual design and responsive layout with browser subagent at 1280px and 375px in both light and dark modes, successfully sending messages with zero layout defects.
- Quality gates passed: `npm test` (48/48 pass), `npm run typecheck` (0 errors), `npm run lint` (0 errors), and `npm run build` (all 25 App Router routes compile cleanly).
- Next run (Task 32): [review] Files tab (list, filter by type and uploader, delete) and attach and remove files on tasks in the task drawer.

## Task 32: [review] Files tab and task drawer attachments
- Built full-featured `FilesView` at `/projects/[id]/files`:
  - Storage quota indicator displaying used storage vs 100 MB limit with a progress bar and percentage badge.
  - Search input with debounce/immediate filtering by file name.
  - Type filter pills (`All`, `Images`, `Docs`, `Sheets`, `Zips`) and dynamic Uploader dropdown populated from project files.
  - File upload with drag-and-drop zone and multi-file upload button.
  - Responsive file cards featuring file-type specific icons, formatted sizes, relative upload dates, uploader avatar, associated task badge (`KEY-12`), inline image zoom modal, direct download button, and confirmation-protected deletion (uploader, PM owner, Admin).
  - Clean empty states when no files are uploaded or when filter queries yield 0 matches.
- Enhanced backend APIs:
  - `GET /api/projects/[id]/files`: supports `?taskId=<id>` filtering, populates `taskId` (`title number`), populates `uploader` (`name email role`), and computes `totalBytesUsed` and `maxProjectStorageBytes` (100 MB).
  - `PATCH /api/files/[id]`: attaches (`taskId: "<id>"`) or detaches (`taskId: null`) files to/from tasks with project isolation (404 for non-members, 400 for tasks not in the same project).
- Integrated `TaskAttachments` component into `TaskDrawer` right above comments:
  - Lists attached files with file-type icons, sizes, and direct download links.
  - Direct file upload to task with validation (4 MB max file limit, magic byte checks).
  - "Choose Existing" picker allowing members to attach unattached project files to the task.
  - Detach button (`X`) to remove attachments without deleting the underlying project file.
- Ran CodeRabbit review and addressed findings:
  - Only showed truly unattached files (`!f.taskId`) in the task drawer's "Choose Existing" picker.
  - Moved `fetchFiles()` into `finally` during multi-file uploads so partial uploads refresh the list and storage count.
- Added comprehensive unit tests in `src/__tests__/files.test.ts` covering category and uploader filtering, storage quota calculation, and cross-project isolation when attaching/detaching files. All 54 tests across 18 test suites pass.
- Verified visual design at 1280px and 375px in both light and dark modes with browser subagent. Passed `npm run typecheck`, `npm run lint`, and `npm run build` (all 25 routes compile cleanly).
- Next run (Task 33): [review] Analytics library and `GET /api/projects/[id]/analytics?range=7|30|90` using MongoDB aggregation: KPIs, status counts, created vs completed per week, burndown, workload per member, priority counts, overdue list. Unit tests with fixed dates.

## Task 33: [review] Analytics library and API
- Implemented `src/lib/analytics.ts` computing all analytics server-side via MongoDB aggregation pipelines (0 tasks loaded into memory):
  - KPIs: `totalTasks`, `completedTasks`, `inProgressTasks`, `todoTasks`, `reviewTasks`, `overdueTasks`, `completionRate`, `avgCycleTimeDays` (from `createdAt` to `completedAt`), `createdInRange`, `completedInRange`.
  - Status counts and breakdown with chart colors (`todo`, `in_progress`, `review`, `done`).
  - Priority counts and breakdown with chart colors (`low`, `medium`, `high`).
  - Burndown: remaining tasks and ideal linear trajectory across range dates computed via cumulative daily created and completed counts.
  - Created vs completed per week trends across range buckets.
  - Workload per member grouped by status (`todo`, `in_progress`, `review`, `done`, `total`) including project members with 0 tasks and unassigned tasks.
  - Overdue list of non-done tasks with past due dates, sorted by urgency and including `daysOverdue`.
- Added `GET /api/projects/[id]/analytics?range=7|30|90` with strict project isolation (returns 404 for non-members via `requireProjectAccess(id, "view")`, 401 when unauthenticated).
- Added unit tests with fixed dates in `src/__tests__/analytics.test.ts` covering date utilities, KPI math, status/priority percentages, burndown points, weekly buckets, and access control isolation.
- Quality gates passed: `npm test` (66/66 passed), `npm run typecheck` (0 errors), `npm run lint` (0 errors), and `npm run build` (all 26 App Router routes compile cleanly).
- Ran CodeRabbit review (`coderabbit review --uncommitted --include-untracked`) with 0 new findings.
- Next run (Task 34): Project Analytics tab with Recharts: KPI cards, status donut, created vs completed, burndown, workload, priority, overdue list, range selector, empty states, text summaries.

## Task 34: Project Analytics tab with Recharts
- Installed `recharts` and created `ProjectAnalyticsView` in `src/components/analytics/project-analytics-view.tsx` with hydration-safe `useSyncExternalStore` mount handling.
- Implemented comprehensive visualizations and interactive controls:
  - Top KPI cards: Total Tasks, Completed Tasks, Completion Rate %, Avg Cycle Time (days), and Overdue Tasks (highlighted with destructive border/text when > 0).
  - Time range selector pills: `7 Days`, `30 Days`, `90 Days`, with live reload button and range-aware KPI deltas.
  - Task Burndown chart: Recharts `AreaChart` with gradient fill, remaining open tasks curve, and ideal guideline over time.
  - Status Distribution donut: Recharts `PieChart` with centered total task count and legend pills.
  - Created vs Completed velocity: Recharts `BarChart` comparing weekly task volume.
  - Priority Breakdown: Stacked distribution bars and count metrics for low, medium, and high priority.
  - Team Workload by Status: Responsive horizontal stacked bars with assignee avatars and count breakdown across all project members.
  - Overdue Tasks list: Displays task ID (`KEY-12`), title, status badge, priority badge, assignee avatar, and urgency badge (`X days overdue`).
  - Integrated empty states and accessible text summaries (`sr-only` and visible text summaries) on every chart component.
- Updated `src/app/projects/[id]/analytics/page.tsx` with project authorization check via `requireProjectAccess(id, "view")` and project metadata.
- Tested responsive design and interactions with browser subagent at 1280px and 375px in both light and dark modes (verified charts, range switches, and zero layout overflow).
- Quality gates passed: `npm test` (66/66 passed), `npm run typecheck` (0 errors), `npm run lint` (0 errors), and `npm run build` (all 26 App Router routes compile cleanly).
- Next run (Task 35): [review] Global analytics page `/dashboard/analytics` (Admin: all projects, PM: own projects) with project health table, and personal stats on the User dashboard.

## Task 35: [review] Global analytics page & User personal stats
- Implemented `getGlobalAnalytics` (Admin: all projects, PM: own projects) and `getUserPersonalStats` in `src/lib/analytics.ts` using MongoDB aggregation (0 tasks loaded into memory).
- Added `GET /api/analytics/global` with role guards (Admin/PM only; anti-probing 404 for regular users).
- Built Global Analytics page at `/dashboard/analytics` with `GlobalAnalyticsView` (`src/components/analytics/global-analytics-view.tsx`):
  - Top portfolio KPI cards: Total Projects, Total Tasks, Completed Tasks, Overall Completion Rate, and Overdue Tasks.
  - Interactive Project Health Table with client-side project search, progress bars, overdue counts, last activity date, and direct workspace links.
  - Recharts `BarChart` for Tasks per Project distribution (Done, In Progress, Review, To Do) with accessible text summary.
  - Most active team members ranking with avatars, completion volume, and delivery rates.
- Integrated Personal Stats into User dashboard (`/dashboard`):
  - Recharts `BarChart` for Personal Delivery Velocity across rolling 4-week intervals.
  - On-Time Delivery Rate KPI card with deadline delivery metrics and completion rate indicators.
  - Empty states and accessible screen reader summaries for all visualizations.
- Updated `AppShell` with direct "Analytics" navigation link for Admin and PM users, and added "Portfolio Analytics" header action buttons on Admin Console and PM Hub.
- Added comprehensive unit tests in `src/__tests__/analytics.test.ts` for role scoping, PM project isolation, global KPI calculations, on-time delivery rates, and deadline evaluations. All 76 tests across 26 test suites pass.
- Ran CodeRabbit review (`coderabbit review --uncommitted --include-untracked`), and resolved hydration mismatch on relative time in the Project Health table.
- Verified responsive layouts at 1280px and 375px across both light and dark themes with browser automation (0 horizontal overflow), including anti-probing 404 verification for regular users on `/dashboard/analytics`.
- Quality gates passed: `npm test` (76/76 pass), `npm run typecheck` (0 errors), `npm run lint` (0 errors), and `npm run build` (all 27 App Router routes compile cleanly).
- Next run (Task 36): Extend `src/__tests__/isolation.test.ts` for messages, files and analytics. Accessibility pass (keyboard navigation, focus rings, contrast, aria labels on charts and the chat list). Update README with new limits, GridFS note, migration step and the "no antivirus scanning" note.




