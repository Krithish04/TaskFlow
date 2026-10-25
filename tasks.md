# Tasks

Work top to bottom. One task per iteration. Tasks marked `[review]` also get a CodeRabbit review before they are checked off.

## Foundation
- [x] 1. Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint) in the repo root, add `typecheck` and `test` scripts, set up Vitest.
- [x] 2. Add shadcn/ui, a base layout, and `.env.example` (MONGODB_URI, AUTH_SECRET, GOOGLE_GENERATIVE_AI_API_KEY, AI_MODEL).
- [x] 3. Mongoose connection helper (cached for dev hot reload) and the four models: User, Project, Task, Comment, with indexes.
- [x] 4. `scripts/seed.ts` and `npm run seed`: 1 admin, 1 PM, 2 users, 1 demo project with 8 tasks. Refuse to run in production.

## Auth and roles
- [x] 5. [review] Auth.js credentials login with bcrypt; session includes `id` and `role`.
- [x] 6. [review] `requireRole()` and `requireProjectAccess()` server helpers plus middleware protecting `/dashboard` and `/projects`. Unit tests for the permission matrix in PRD.md.
- [x] 7. Login page.

## Core features
- [x] 8. [review] Users API (admin only) and Admin dashboard (user table, change role).
- [x] 9. [review] Projects API with Zod validation and permission checks, plus the PM dashboard project list.
- [x] 10. [review] Tasks API (list, create, edit, delete, move) with permission checks and tests.
- [x] 11. Kanban board page with dnd-kit: four columns, drag between and within columns, persists `status` and `order`.
- [x] 12. Task drawer: edit fields (PM/Admin), view details.
- [ ] 13. [review] Comments API and comment thread in the drawer, polling every 5 s.
- [ ] 14. User dashboard (assigned tasks, due soon, recent comments).

## AI
- [ ] 15. [review] `src/lib/ai/provider.ts` (Gemini via Vercel AI SDK, model from `AI_MODEL`), shared error handling for 429, and a per-user rate limiter for `/api/ai/*`.
- [ ] 16. [review] `POST /api/ai/breakdown` with structured output (Zod schema) and a button on the project page.
- [ ] 17. [review] `POST /api/ai/create-task`: returns a draft task, UI shows it for confirmation before saving.
- [ ] 18. [review] `POST /api/ai/summarize-comments` and a Summarize button in the task drawer.
- [ ] 19. [review] `POST /api/ai/weekly-report` (PM/Admin only) and a report view on the PM dashboard.
- [ ] 20. [review] `POST /api/ai/assistant`: streaming chat panel answering from the project's real task data, read-only.

## Finish
- [ ] 21. README with setup, env vars, seed, and deployment notes (Vercel + MongoDB Atlas).
- [ ] 22. Final pass: run lint, typecheck, tests, and `coderabbit review --plain` on the whole branch; fix real issues; ensure no secrets are committed.
