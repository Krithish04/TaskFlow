# Progress log

(The agent appends here after every task.)

## Task 1: Scaffold Next.js, scripts, and Vitest
- Scaffolded Next.js (App Router, TypeScript, Tailwind CSS, ESLint) in repo root.
- Added `typecheck` and `test` scripts, configured Vitest with path aliases, and verified `npm run lint`, `npm run typecheck`, and `npm test` pass cleanly.
- Next run needs to know: Vitest is installed with @types/node@^22; proceed to Task 2 (shadcn/ui, base layout, .env.example).

## Task 2: Add shadcn/ui, base layout, and .env.example
- Initialized shadcn/ui with Tailwind v4, imported button component and utility helpers (`src/lib/utils.ts`).
- Created responsive base layout with header, brand logo, navigation links, and footer; verified `.env.example` has all required variables.
- Next run needs to know: proceed to Task 3 (Mongoose connection helper cached for dev hot reload, and the four models User, Project, Task, Comment with indexes).

## Task 3: Mongoose connection helper and data models
- Created cached connection helper `src/lib/db.ts` with global caching for development hot reloading.
- Defined Mongoose models and interfaces in `src/models/` for User, Project, Task, and Comment with required enums and indexes; added test suite in `src/__tests__/models.test.ts`.
- Next run needs to know: proceed to Task 4 (`scripts/seed.ts` and `npm run seed` creating 1 admin, 1 PM, 2 users, 1 demo project with 8 tasks; refuses to run in production).

## Task 4: Database seed script and command
- Created `scripts/seed.ts` and added `seed` script to `package.json`, creating 1 admin, 1 PM, 2 users, and 1 demo project with 8 tasks across all Kanban columns; passwords hashed with bcrypt without logging secrets.
- Enforced strict refusal to run when `NODE_ENV=production` with unit test in `src/__tests__/seed.test.ts`.
- Next run needs to know: proceed to Task 5 (Auth.js credentials login with bcrypt; session includes `id` and `role` [review]).

## Task 5: Auth.js credentials login with bcrypt and role sessions [review]
- Integrated Auth.js (v5) with credentials provider, Zod validation, and bcrypt password verification; session and JWT callbacks attach `id` and `role`.
- Added App Router route handler `src/app/api/auth/[...nextauth]/route.ts`, TypeScript session augmentation (`src/types/next-auth.d.ts`), and unit tests (`src/__tests__/auth.test.ts`). Ran CodeRabbit review with 0 findings.
- Next run needs to know: proceed to Task 6 (`requireRole()` and `requireProjectAccess()` server helpers plus middleware protecting `/dashboard` and `/projects`, and unit tests for the permission matrix in PRD.md [review]).

## Task 6: Role helpers, project access helpers, and route protection [review]
- Implemented `requireRole()` and `requireProjectAccess()` server enforcement helpers along with full PRD permission matrix checkers in `src/lib/permissions.ts`.
- Configured route protection via Next.js 16 proxy/middleware in `src/proxy.ts` redirecting unauthenticated visits on `/dashboard` and `/projects` to `/login?callbackUrl=...`; validated with unit test suites in `src/__tests__/permissions.test.ts` and `src/__tests__/proxy.test.ts`. Ran CodeRabbit review and addressed malformed ObjectId validation.
- Next run needs to know: proceed to Task 7 (Login page).

## Task 7: Login page
- Built responsive login page (`src/app/login/page.tsx`) with automatic redirect to `/dashboard` for authenticated users and `callbackUrl` support.
- Implemented `loginAction` server action (`src/app/login/actions.ts`) with credentials verification and error mapping, along with `LoginForm` (`src/app/login/login-form.tsx`) featuring demo account autofill buttons for Admin, PM, and User roles; added unit tests in `src/__tests__/login.test.ts`.
## Task 8: Users API and Admin dashboard [review]
- Implemented admin-only Users API (`GET /api/users`, `PATCH /api/users`, and `GET/PATCH /api/users/[id]`) with Zod validation, ObjectId verification, and guard against removing the last administrator.
- Built Admin dashboard (`/dashboard`) with user metrics, all projects overview, and an interactive `UserTable` with search, role filtering, and dynamic role changes; addressed CodeRabbit review feedback (open redirect sanitization and last admin protection). Added unit tests in `src/__tests__/users-api.test.ts` and `src/__tests__/dashboard.test.ts`.
- Next run needs to know: proceed to Task 9 (Projects API with Zod validation and permission checks, plus the PM dashboard project list [review]).

## Task 9: Projects API and PM dashboard project list [review]
- Implemented Projects API (`GET /api/projects`, `POST /api/projects`, and `GET/PATCH/DELETE /api/projects/[id]`) with Zod schema validation, ObjectId checks, cascading task/comment cleanup on deletion, and server-side permission checks matching the PRD matrix.
- Built PM dashboard project list (`src/app/dashboard/pm-projects.tsx`) featuring project metrics, search/status filter, interactive project creation & editing dialogs, and links to Kanban boards. Hardened `sanitizeCallbackUrl` against control characters and backslashes following CodeRabbit review. Added 16 tests in `src/__tests__/projects-api.test.ts` (117 total tests passing).
- Next run needs to know: proceed to Task 10 (Tasks API [list, create, edit, delete, move] with permission checks and tests [review]).

## Task 10: Tasks API with permission checks and tests [review]
- Implemented full Tasks API: `GET/POST /api/projects/[id]/tasks`, `GET/PATCH/DELETE /api/tasks/[id]`, and `POST /api/tasks/[id]/move` with Zod validation, ObjectId verification, auto-calculated column order, and cascading comment cleanup.
- Enforced PRD permission matrix: only Admin/owner PM can create, edit, or delete tasks; members can view; assigned users can move their own tasks. Extracted `sanitizeCallbackUrl` to `src/lib/callback-url.ts` per CodeRabbit review. Added 16 unit tests in `src/__tests__/tasks-api.test.ts` (133 total tests passing).
- Next run needs to know: proceed to Task 11 (Kanban board page with dnd-kit: four columns, drag between and within columns, persists status and order).

## Task 11: Kanban board page with dnd-kit
- Installed `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` and created responsive Kanban board page (`src/app/projects/[id]/page.tsx`, `kanban-board.tsx`, `kanban-column.tsx`, `kanban-card.tsx`).
- Implemented four columns (To Do, In Progress, Review, Done) with smooth drag-and-drop between and within columns, optimistic UI updates, drag overlay, rollback on permission failure, and automatic persistence of `status` and `order` via `POST /api/tasks/[id]/move`. Added unit tests in `src/__tests__/kanban.test.ts` (137 total tests passing).
- Next run needs to know: proceed to Task 12 (Task drawer: edit fields [PM/Admin], view details).

## Task 12: Task drawer: edit fields (PM/Admin), view details
- Built interactive Task drawer (`src/app/projects/[id]/task-drawer.tsx`) integrated with `KanbanBoard`, `KanbanColumn`, and `KanbanCard` upon card click.
- Implemented read-only task metadata and details view for members and full editing capabilities (title, description, status, priority, assignee, due date) plus task deletion for project owners and Admins via `PATCH/DELETE /api/tasks/[id]`. Added unit tests in `src/__tests__/task-drawer.test.ts` (141 total tests passing).
- Next run needs to know: proceed to Task 13 (Comments API and comment thread in the drawer, polling every 5 s [review]).

## Task 13: Comments API and comment thread in the drawer, polling every 5 s [review]
- Implemented Comments API (`GET/POST /api/tasks/[id]/comments`) with Zod validation, request size limits (413 payload guard), safe author population fallback, and project-level permission enforcement (Admin and project members/owners).
- Built `TaskComments` component with 5-second polling interval, error handling for background polling, accessible textarea, and immediate optimistic updates, integrated into `TaskDrawer`. Added 14 unit tests in `src/__tests__/comments-api.test.ts` (155 total tests passing) and verified clean passing review with CodeRabbit.
- Next run needs to know: proceed to Task 14 (User dashboard [assigned tasks, due soon, recent comments]).

## Task 14: User dashboard (assigned tasks, due soon, recent comments)
- Built comprehensive Team Member dashboard (`src/app/dashboard/user-dashboard.tsx` integrated in `src/app/dashboard/page.tsx`) rendering assigned task overview, overdue alerts, due soon filtering, text search, project memberships, and recent comments feed.
- Added database queries and unit test suites in `src/__tests__/dashboard.test.ts` and `src/__tests__/user-dashboard.test.ts` (158 total tests passing).
- Next run needs to know: proceed to Task 15 (`src/lib/ai/provider.ts` [Gemini via Vercel AI SDK, model from `AI_MODEL`], shared error handling for 429, and a per-user rate limiter for `/api/ai/*` [review]).

## Task 15: AI provider, shared 429 error handling, and rate limiter [review]
- Installed `ai` and `@ai-sdk/google`; implemented `src/lib/ai/provider.ts` with dynamic model resolution from `AI_MODEL` (fallback `gemini-2.0-flash`) and shared `handleAIError` returning 429 with `AI_QUOTA_EXCEEDED` on Google AI free-tier quota limits.
- Built rolling-window per-user rate limiter (`src/lib/ai/rate-limiter.ts`) enforcing limits on `/api/ai/*` routes with automatic cleanup of expired inactive user entries, and added `requireAIPermission` in `src/lib/permissions.ts`.
- Added 18 unit tests in `src/__tests__/ai-provider.test.ts` (176 total tests passing) and completed CodeRabbit review pass with zero findings.
- Next run needs to know: proceed to Task 16 (`POST /api/ai/breakdown` with structured output [Zod schema] and a button on the project page [review]).

## Task 16: AI task breakdown with structured output and project dialog [review]
- Implemented `POST /api/ai/breakdown` with Zod validation, bounded stream body parsing (16KB cap), project edit access check, rate limiting, and structured output via Vercel AI SDK `generateObject`.
- Built interactive `AIBreakdownDialog` on `/projects/[id]` allowing PMs and Admins to input guidance, generate subtasks with priority and hourly estimates, review/select tasks, and batch-save them to the Kanban board.
- Addressed CodeRabbit review feedback (bounded body stream DoS guard, estimate preservation, dialog ARIA attributes, incremental task saving, checkbox event propagation); added 12 unit tests across `ai-breakdown.test.ts` and `ai-breakdown-dialog.test.ts` (188 total tests passing).
- Next run needs to know: proceed to Task 17 (`POST /api/ai/create-task`: returns a draft task, UI shows it for confirmation before saving [review]).
