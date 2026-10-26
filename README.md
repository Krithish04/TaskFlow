# TaskFlow

TaskFlow is a role-based project management web application built with Next.js (App Router), MongoDB, Auth.js credentials authentication, Tailwind CSS, dnd-kit, and Google Gemini AI via the Vercel AI SDK.

---

## Features

- **Role-Based Access Control**:
  - **Admin**: Full administrative privileges, user role management, system-wide metrics, project oversight.
  - **Project Manager (PM)**: Project creation and lifecycle management, task assignment, status reports, AI breakdown.
  - **Team Member (User)**: Personal dashboard with assigned tasks and due dates, Kanban movement of assigned tasks, task comments, comment summaries, and project AI assistant.
- **Interactive Kanban Board**:
  - Four workflow columns: *To Do*, *In Progress*, *Review*, *Done*.
  - Drag-and-drop powered by `@dnd-kit` with reordering within and across columns.
  - Instant optimistic updates with automatic rollback on permission rejection or network errors.
- **Task Drawer & Discussion Thread**:
  - Slide-over drawer for viewing and editing task metadata (assignee, priority, status, due date).
  - Built-in comment feed with background polling every 5 seconds.
  - 1-click comment summarization via Gemini AI.
- **Role-Tailored Dashboards (`/dashboard`)**:
  - **Admin Dashboard**: Real-time user metrics, searchable user table with inline role updates, and project directory.
  - **PM Dashboard**: Active projects summary, workload distribution, overdue task alerts, and weekly AI status reports.
  - **User Dashboard**: Assigned tasks, due-soon deadlines, project memberships, and recent discussion activity.
- **Integrated AI Capabilities (Google Gemini)**:
  - **Task Breakdown (`POST /api/ai/breakdown`)**: Generates structured subtasks with priority and hour estimates from project briefs.
  - **Plain-Language Task Creation (`POST /api/ai/create-task`)**: Parses natural language instructions (e.g., *"Assign urgent auth bug to Alice due Friday"*) into draft tasks for user review before saving.
  - **Comment Summarization (`POST /api/ai/summarize-comments`)**: Synthesizes lengthy comment threads into action items, key decisions, and blockers.
  - **Weekly Status Report (`POST /api/ai/weekly-report`)**: Produces structured executive updates summarizing milestones, risks, and member workload.
  - **Streaming Project Assistant (`POST /api/ai/assistant`)**: Read-only AI assistant streaming answers based on real-time project task data, deadlines, and workload.
- **Project File Storage (MongoDB GridFS)**:
  - Secure file uploads (`POST /api/projects/[id]/files`) stored in MongoDB GridFS (`project_files` bucket).
  - Strict extension allowlisting and binary magic-byte verification (PDF, PNG, JPG, GIF, WEBP, TXT, MD, CSV, DOCX, XLSX, PPTX, ZIP). Prohibits SVG, HTML, and executables.
  - Per-file limit of 4 MB and per-project storage quota of 100 MB.
  - Secure file streaming (`GET /api/files/[id]`) with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox` headers.
  - Strict project data isolation (non-members receive 404).
  - *Security notice*: There is no antivirus scanning in this version.
- **Robust Security & Architecture**:
  - Server-side authorization in all route handlers and server actions (`src/lib/permissions.ts`).
  - Rolling-window per-user rate limiting on all `/api/ai/*` and file upload routes.
  - Graceful handling of Google AI free-tier quota limits (HTTP 429 `AI_QUOTA_EXCEEDED`).
  - Bounded request body parsers and strict Zod schema validation across all API endpoints.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server & Client Components)
- **Language**: TypeScript 5
- **Database & ODM**: MongoDB & Mongoose 9
- **Authentication**: Auth.js (v5 Beta) with Credentials Provider and bcryptjs password hashing
- **Styling & UI**: Tailwind CSS v4, Lucide React icons, and shadcn/ui base primitives
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **AI Integration**: Vercel AI SDK (`ai`, `@ai-sdk/google`) with Google Gemini
- **Validation**: Zod 4
- **Testing**: Node.js test runner via tsx (`npm test`)

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or v22 LTS
- [npm](https://www.npmjs.com/) v10+
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (or local MongoDB v6+)
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini models

---

## Environment Variables

Create a `.env.local` file in the root directory based on `.env.example`:

```bash
cp .env.example .env.local
```

Configure the following variables:

| Variable | Description | Example / Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string (local or Atlas) | `mongodb+srv://<user>:<password>@cluster.mongodb.net/taskflow?retryWrites=true&w=majority` |
| `AUTH_SECRET` | Secret key used by Auth.js to sign session JWTs | Generate with `openssl rand -base64 32` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio API key | `AIzaSy...` |
| `AI_MODEL` | Gemini model identifier (free tier compatible) | `gemini-2.0-flash` or `gemini-1.5-flash` |

---

## Local Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Krithish04/TaskFlow.git
   cd TaskFlow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create `.env.local` and fill in `MONGODB_URI`, `AUTH_SECRET`, and `GOOGLE_GENERATIVE_AI_API_KEY`.

4. **Seed the database**:
   Populate the database with sample users and a demo project:
   ```bash
   npm run seed
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open TaskFlow**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Accounts

The seed script creates four accounts across all three permission tiers:

| Role | Email | Password | Access & Capabilities |
|---|---|---|---|
| **Admin** | `admin@example.com` | `password123` | Full system access, user role management, all projects |
| **Project Manager** | `pm@example.com` | `password123` | Owns "TaskFlow Launch MVP", task creation, AI breakdown & reports |
| **User (Member)** | `alice@example.com` | `password123` | Member of demo project, assigned tasks, comments, AI assistant |
| **User (Member)** | `bob@example.com` | `password123` | Member of demo project, assigned tasks, comments, AI assistant |

> **Tip**: The `/login` page includes quick one-click autofill buttons for Admin, PM, and User roles.

---

## Database Seeding Notes

The database seeder is managed via:
```bash
npm run seed
```

- **Safety Guard**: The script strictly refuses to execute if `NODE_ENV=production` to prevent accidental data erasure in production environments.
- **Idempotency**: Clears existing collections before inserting 1 Admin, 1 PM, 2 Users, and 1 demo project with 8 pre-configured tasks across all Kanban stages, with assignees, due dates, and discussion comments.

---

## Quality Assurance & Testing

Run the full automated verification suite:

```bash
# Run ESLint linter
npm run lint

# Run TypeScript compiler checks
npm run typecheck

# Run Vitest unit & integration test suites
npm test
```

All 26 test suites (240+ tests) cover:
- Data models & database schema validation
- Authentication & JWT session callbacks
- Server-side permission matrices (`requireRole`, `requireProjectAccess`, `requireAIPermission`)
- REST APIs (Users, Projects, Tasks, Comments)
- AI routes (Breakdown, Create-Task, Summarize-Comments, Weekly-Report, Assistant)
- Rate limiting & 429 quota handling
- UI dialogs and panel rendering

---

## Deployment Notes

### 1. MongoDB Atlas Setup
1. Create a free **M0 Sandbox** cluster on [MongoDB Atlas](https://cloud.mongodb.com/).
2. Under **Database Access**, create a database user with the `readWrite` role scoped to the `taskflow` database only.
3. Under **Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere) to permit connections from serverless hosting environments like Vercel.
4. Copy the connection string (SRV format) and replace `<password>` and database name:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/taskflow?retryWrites=true&w=majority
   ```
5. Run `npm run seed` only with an isolated non-production database. Never point it at the application production database. Create production admin accounts with unique passwords.

### 2. Vercel Deployment
1. Push your repository to GitHub or GitLab.
2. Sign in to [Vercel](https://vercel.com/) and click **Add New Project** -> **Import Git Repository**.
3. In **Project Settings**, configure the Environment Variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `AUTH_SECRET`: A secure 32-character random string (e.g., generated with `openssl rand -base64 32`).
   - `GOOGLE_GENERATIVE_AI_API_KEY`: Your Google AI Studio API key.
   - `AI_MODEL`: Set to `gemini-2.0-flash` or `gemini-1.5-flash`.
4. Leave build command as default (`next build`) and output directory as default.
5. Click **Deploy**. Vercel will build the production bundle and provision edge routing.

---

## License

MIT
