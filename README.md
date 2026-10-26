# TaskFlow

TaskFlow is a role-based project management web application built with Next.js (App Router), MongoDB, Auth.js credentials authentication, Tailwind CSS, dnd-kit, and Google Gemini AI via the Vercel AI SDK.

---

## Features

- **Role-Based Access Control**:
  - **Admin**: Full administrative privileges, user role management, system-wide metrics, global portfolio analytics across all projects.
  - **Project Manager (PM)**: Project creation and lifecycle management, task assignment, status reports, AI breakdown, project portfolio analytics for owned projects.
  - **Team Member (User)**: Personal dashboard with assigned tasks, due dates, personal delivery velocity chart, on-time rate, Kanban movement of assigned tasks, task comments, project chat, and AI assistant.
- **Dedicated Project Workspaces (`/projects/[id]`)**:
  - Persistent workspace header with project color accent (8-color curated palette), key badge (2-5 uppercase letters), and tab navigation: *Overview*, *Board*, *Chat*, *Files*, *Analytics*, *Members* (PM/Admin only).
  - Unambiguous task IDs formatted as `KEY-12` across Kanban cards, task drawers, activity feeds, and dashboards.
  - Dynamic Project Switcher in the collapsible sidebar.
- **Project Chat & Collaboration**:
  - One real-time chat channel per project with author avatars, roles, timestamps, and date divider pills.
  - Bottom composer supporting Enter to send, Shift+Enter for newlines, and staged attachments tray (up to 5 files, 4 MB each).
  - Drag-and-drop file attachment overlay and clipboard paste support for screenshots.
  - Inline zoomable image thumbnails with modal lightbox preview and downloadable file cards.
  - Incremental 3-second polling with automatic pause when browser tab is hidden and resume when visible.
  - Unread badge indicator on the workspace Chat tab.
- **Project File Storage (MongoDB GridFS)**:
  - Secure file uploads (`POST /api/projects/[id]/files`) stored in MongoDB GridFS (`project_files` bucket).
  - **Strict Quotas & Limits**: 4 MB maximum per file, 5 files per message, and 100 MB total storage quota per project.
  - **Allowed File Types**: PDF, PNG, JPG, GIF, WEBP, TXT, MD, CSV, DOCX, XLSX, PPTX, ZIP. Prohibits SVG, HTML, JS, and executables via binary magic-byte detection.
  - **Secure Streaming**: `GET /api/files/[id]` streams files with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox` headers, using `Content-Disposition: attachment` for documents/archives and `inline` for images.
  - *Security Notice*: **No antivirus scanning** is performed in this version. Uploaded files undergo strict extension allowlisting, MIME verification, and binary magic-byte inspection, but files are not scanned by an antivirus engine.
- **Interactive Kanban Board (`/projects/[id]/board`)**:
  - Four workflow columns: *To Do*, *In Progress*, *Review*, *Done*.
  - Drag-and-drop powered by `@dnd-kit` with reordering within and across columns.
  - Instant optimistic updates with automatic rollback on permission rejection or network errors.
- **Task Drawer & Discussion Thread**:
  - Slide-over drawer for viewing and editing task metadata (assignee, priority, status, due date).
  - Direct file attachment to tasks with "Choose Existing" project file picker.
  - Built-in comment feed with background polling every 5 seconds.
  - 1-click comment summarization via Gemini AI.
- **Rich Analytics & Performance Visualizations (Recharts)**:
  - **Project Analytics Tab (`/projects/[id]/analytics`)**: Top KPI cards (Total, Completed, Completion Rate %, Avg Cycle Time, Overdue Tasks), range selector pills (7, 30, 90 days), Recharts Burndown chart with ideal trajectory, Status donut with centered total, Created vs. Completed weekly velocity, Team Workload stacked bars, Priority breakdown, and Overdue tasks list.
  - **Global Portfolio Analytics (`/dashboard/analytics`)**: Organization-wide project health table (progress, overdue counts, last activity date), tasks per project distribution, and most active team members ranking.
  - **Personal Performance on User Dashboard**: Tasks completed over time (weekly delivery velocity) and On-Time Delivery Rate percentage.
  - Accessible design: Every chart includes an accessible screen-reader summary (`sr-only`) and visible caption.
- **Multi-Tenant Isolation & Anti-Probing**:
  - Non-negotiable project isolation enforced on every message, file, and analytics query via `requireProjectAccess()`.
  - Project context is always derived from the stored record, never from client-sent parameters.
  - Anti-probing: Users without access receive HTTP 404 (Not Found), never 403, preventing resource ID probing.
- **Integrated AI Capabilities (Google Gemini)**:
  - **Task Breakdown (`POST /api/ai/breakdown`)**: Generates structured subtasks with priority and hour estimates from project briefs.
  - **Plain-Language Task Creation (`POST /api/ai/create-task`)**: Parses natural language instructions into draft tasks for user review before saving.
  - **Comment Summarization (`POST /api/ai/summarize-comments`)**: Synthesizes lengthy comment threads into action items, key decisions, and blockers.
  - **Weekly Status Report (`POST /api/ai/weekly-report`)**: Produces structured executive updates summarizing milestones, risks, and member workload.
  - **Streaming Project Assistant (`POST /api/ai/assistant`)**: Read-only AI assistant streaming answers based on real-time project task data, deadlines, and workload.

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

## Database Seeding & Migration Notes

### Database Seeding
The database seeder is managed via:
```bash
npm run seed
```

- **Safety Guard**: The script strictly refuses to execute if `NODE_ENV=production` to prevent accidental data erasure in production environments.
- **Idempotency**: Clears existing collections before inserting 1 Admin, 1 PM, 2 Users, and 1 demo project with 8 pre-configured tasks across all Kanban stages, with assignees, due dates, and discussion comments.

### Database Migration (v2)
When upgrading an existing database to TaskFlow v2 data models, run the migration script:
```bash
npm run migrate:v2
```

- **Idempotency**: Running `npm run migrate:v2` repeatedly is completely safe and produces 0 modifications once migrations have completed.
- **Project Keys & Colors**: Backfills each project with a default palette color and derives a 2-5 character uppercase project key (e.g. `TF`) if unassigned.
- **Task Numbering**: Sequentially numbers existing tasks (`KEY-1`, `KEY-2`, ...) and initializes `nextTaskNumber` on the project.
- **Completed Timestamps**: Backfills `completedAt` timestamp for tasks in `done` status.

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

All 31 test suites (250+ tests) cover:
- Data models & database schema validation (v2 project keys, colors, task numbering, and completedAt)
- Authentication & JWT session callbacks
- Server-side permission matrices (`requireRole`, `requireProjectAccess`, `requireAIPermission`)
- Strict multi-tenant isolation (`src/__tests__/isolation.test.ts`) across workspaces, project chat, GridFS storage, and analytics
- REST APIs (Users, Projects, Tasks, Comments, Messages, Files, Analytics)
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
