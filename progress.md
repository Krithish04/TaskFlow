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
