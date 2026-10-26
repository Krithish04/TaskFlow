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
