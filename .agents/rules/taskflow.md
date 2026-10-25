# TaskFlow project rules

Project: TaskFlow, a project management app with Admin / PM / User roles, a Kanban board, per-task comments and an AI assistant. It is a rebuild of an earlier MERN app in Next.js.

## Stack
- Next.js (App Router) + TypeScript, one project for UI and API
- MongoDB + Mongoose
- Auth.js with a credentials provider, session carries `role`
- Tailwind CSS + shadcn/ui
- dnd-kit for Kanban drag and drop
- Zod for all input validation
- Vercel AI SDK (`ai`, `@ai-sdk/google`) with Gemini, behind `src/lib/ai/provider.ts` so the model/provider can be swapped by changing env vars only

## Hard rules
- Enforce role permissions on the server in every route handler and server action. Hiding UI is never enough.
- Validate every request body and query with Zod.
- AI calls run only on the server. API keys come from env vars and never reach the client.
- No public seed endpoint. Seeding is `npm run seed` (scripts/seed.ts), refuses to run when `NODE_ENV=production`.
- Rate-limit all `/api/ai/*` routes.
- Never send real user data to the AI provider beyond what the feature needs (task titles, descriptions, comments of the current project).
- Passwords hashed with bcrypt. Never log secrets or password hashes.

## Working style
- Prefer the standard library and existing dependencies over adding new ones.
- Do not add abstractions, options or config that nothing currently uses.
- Small files, small functions, clear names.
- A task is done only when `npm run lint`, `npm run typecheck` and `npm test` all pass.
- Commit after each finished task with a clear message.
