# TaskFlow

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.3-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-green?logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38bdf8?logo=tailwindcss)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI%20SDK-orange?logo=google)
![License](https://img.shields.io/badge/License-MIT-purple)

**Modern, role-based project management platform featuring interactive Kanban boards, project collaboration chat, secure GridFS file storage, aggregation-driven analytics, and Google Gemini AI assistance.**

[Key Features](#features) • [Tech Stack](#tech-stack) • [Project Structure](#project-structure) • [Getting Started](#local-setup--installation) • [API Reference](#api-reference) • [Deployment](#deployment-notes)

</div>

---

## Features

### Role-Based Access Control (RBAC)
- **Admin**: Full administrative privileges across all workspaces, user role management, system-wide metrics, and global portfolio analytics.
- **Project Manager (PM)**: Project creation, configuration (keys, colors, team membership), task lifecycle management, AI-assisted task breakdown, status reports, and project portfolio analytics for owned projects.
- **Team Member (User)**: Personal dashboard with assigned tasks, due date tracking, personal delivery velocity charts, on-time completion rates, interactive Kanban movement of assigned tasks, task comments, project chat, and read-only AI project assistant.

### Dedicated Project Workspaces (`/projects/[id]`)
- **Workspace Navigation & Header**: Persistent workspace header featuring curated 8-color project accents, 2–5 character project keys (e.g., `TF`), and tab navigation:
  - **Overview**: Executive summary with KPI metrics (Total Tasks, In Progress, Completed, Overdue), accent progress bar, project details, upcoming due dates, team roster, and chronological activity feed.
  - **Board (`/board`)**: Interactive 4-column Kanban board (*To Do*, *In Progress*, *Review*, *Done*) powered by `@dnd-kit` with cross-column drag-and-drop, optimistic updates, and automatic rollback on error.
  - **Chat (`/chat`)**: Real-time project collaboration channel with author roles, avatars, timestamps, date dividers, 3-second incremental polling (pauses when browser tab is inactive), drag-and-drop attachments, clipboard screenshot paste, and image lightbox previews.
  - **Files (`/files`)**: Project storage view with quota progress meter (100 MB limit), search, category filters (*Images*, *Docs*, *Sheets*, *Zips*), uploader filter, direct downloads, and task attachment linkage.
  - **Analytics (`/analytics`)**: Recharts visualizations for cycle times, task burndown curves with ideal trajectories, status distribution donut, weekly creation vs. completion velocity, member workload distribution, and urgency-sorted overdue task lists.
  - **Members (`/members`)**: *(PM & Admin only)* Dedicated member management interface to add and remove project contributors with automatic task unassignment upon member removal.
- **Sequential Task Identifiers**: Unambiguous task numbering formatted as `KEY-12` across cards, drawers, activity streams, and dashboards.
- **Project Switcher & Card Grid (`/projects`)**: Responsive card grid with project health progress, overdue badges, member avatars, and quick-switch dropdown in the application sidebar.

### Project File Storage (MongoDB GridFS)
- **GridFS Integration**: Uploaded files stored directly in MongoDB GridFS (`project_files` bucket).
- **Storage Quotas & Constraints**:
  - Maximum 4 MB per file.
  - Maximum 5 attachments per chat message.
  - 100 MB total active file storage quota per project.
- **Strict File Type Verification**: Validates file extensions, MIME types, and binary magic-bytes for allowed types: PDF, PNG, JPG, GIF, WEBP, TXT, MD, CSV, DOCX, XLSX, PPTX, ZIP. Prohibits SVG, HTML, JS, and executables.
- **Secure File Streaming (`GET /api/files/[id]`)**: Streams with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox` headers, serving images `inline` and documents/archives as `attachment`.
- *Security Notice*: Uploaded files undergo extension allowlisting, MIME verification, and binary magic-byte inspection; however, **no antivirus scanning engine is run in this version**.

### Integrated AI Capabilities (Google Gemini)
- **Task Breakdown (`POST /api/ai/breakdown`)**: Converts user stories or feature requirements into structured subtasks with priority ratings and estimated hours.
- **Natural Language Task Creation (`POST /api/ai/create-task`)**: Parses free-form text into draft tasks for user review and one-click creation.
- **Comment Summarization (`POST /api/ai/summarize-comments`)**: Synthesizes long task discussion threads into key decisions, action items, and blockers.
- **Weekly Status Report (`POST /api/ai/weekly-report`)**: Generates structured executive summaries covering milestones achieved, blockers encountered, and upcoming risks.
- **Contextual Project Assistant (`POST /api/ai/assistant`)**: Read-only AI assistant streaming answers based on real-time project task data, deadlines, and team workload.

### Global & Personal Analytics (Recharts)
- **Global Portfolio Analytics (`/dashboard/analytics`)**: Available to Admin and PMs. Features organization-wide project health tables, overdue task alerts, horizontal stacked bar distributions, and most active contributor rankings.
- **Personal Delivery Metrics**: Displayed on user dashboards, including 4-week delivery velocity bar charts and on-time delivery rates.
- **Accessibility**: All charts include visible summary captions and screen-reader accessible (`sr-only`) summaries.

### Multi-Tenant Isolation & Anti-Probing Security
- **Strict Project Isolation**: Enforced on every message, file, task, and analytics query via server-side verification (`requireProjectAccess`).
- **Anti-Probing Defense**: Requests for resources outside a user's assigned projects return `404 Not Found` rather than `403 Forbidden`, preventing resource ID enumeration.
- **Centralized Permission Helpers**: Secure permission rules for task editing, comment creation, file deletion, and message management.

---

## Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router, Server & Client Components, Server Actions |
| **Runtime & Language** | [Node.js](https://nodejs.org/) & [TypeScript 5](https://www.typescriptlang.org/) | Type-safe fullstack application |
| **Database** | [MongoDB](https://www.mongodb.com/) & [Mongoose 9](https://mongoosejs.com/) | Document database with GridFS binary streaming |
| **Authentication** | [Auth.js v5](https://authjs.dev/) (`next-auth`) | Credentials provider with JWT sessions and bcryptjs hashing |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS, CSS variables, and design tokens |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) & [Lucide React](https://lucide.dev/) | Accessible components and icons |
| **Drag & Drop** | [`@dnd-kit`](https://dndkit.com/) | Kanban board drag-and-drop interactions |
| **Data Visualization** | [Recharts 3](https://recharts.org/) | Burndown, donut, bar, and stacked workload charts |
| **AI Integration** | [Vercel AI SDK](https://sdk.vercel.ai/) & [Google Gemini](https://ai.google.dev/) | Structured output generation and streaming assistant |
| **Validation** | [Zod 4](https://zod.dev/) | Schema and input validation |

---

## Project Structure

```
TaskFlow/
├── scripts/
│   ├── migrate-v2.ts              # Idempotent migration script (keys, colors, task numbering)
│   └── seed.ts                    # Development database seeder with demo accounts
├── src/
│   ├── app/
│   │   ├── api/                   # Next.js App Router API Route Handlers
│   │   │   ├── ai/                # AI endpoints (breakdown, create-task, assistant, etc.)
│   │   │   ├── analytics/         # Global portfolio analytics endpoint
│   │   │   ├── auth/              # Auth.js authentication routes
│   │   │   ├── files/             # File download, streaming & deletion
│   │   │   ├── messages/          # Chat message endpoints
│   │   │   ├── projects/          # Project CRUD, members, files, messages, analytics
│   │   │   ├── tasks/             # Task CRUD, moves, comments
│   │   │   └── users/             # User management endpoints
│   │   ├── dashboard/             # Role dashboards (Admin, PM, User) & Global Analytics
│   │   ├── login/                 # Authentication page with demo autofill buttons
│   │   ├── projects/              # Projects grid & workspace routes (/board, /chat, etc.)
│   │   ├── globals.css            # Tailwind CSS v4 design tokens and theme variables
│   │   └── layout.tsx             # Root layout with ThemeProvider and Toaster
│   ├── components/
│   │   ├── analytics/             # Recharts visualizations (project & global views)
│   │   ├── chat/                  # Chat interface, composer, lightbox, attachments
│   │   ├── files/                 # Files list, quota indicator, category filters
│   │   ├── layout/                # AppShell, sidebar navigation, project switcher
│   │   ├── projects/              # Project modal dialogs and color pickers
│   │   └── ui/                    # Base UI components (buttons, badges, cards, dialogs)
│   ├── lib/
│   │   ├── api-utils.ts           # Bounded JSON reader defending against memory exhaustion
│   │   ├── analytics.ts           # MongoDB aggregation pipelines for metrics & KPIs
│   │   ├── db.ts                  # Mongoose connection manager with cache pooling
│   │   ├── design-tokens.ts       # Design tokens, color palettes, status/priority configs
│   │   ├── file-utils.ts          # Magic-byte detection, filename sanitizing, quotas
│   │   ├── permissions.ts         # Role and project access control helpers
│   │   └── project-utils.ts       # Key derivation and project utility functions
│   └── models/                    # Mongoose data models
│       ├── Comment.ts
│       ├── File.ts                # GridFS metadata model
│       ├── Message.ts             # Project chat message model
│       ├── Project.ts             # Project workspace model
│       ├── ProjectReadState.ts    # Unread chat badge tracker
│       ├── Task.ts                # Task model with KEY-N numbering
│       └── User.ts                # User model with role definitions
├── .env.example                   # Environment variable template
├── package.json                   # Dependencies and npm scripts
└── tsconfig.json                  # TypeScript compiler configuration
```

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
   Create `.env.local` and specify `MONGODB_URI`, `AUTH_SECRET`, and `GOOGLE_GENERATIVE_AI_API_KEY`.

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

> **Tip**: The `/login` page includes one-click autofill buttons for Admin, PM, and User demo credentials.

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `next dev` | Starts local Next.js development server at `localhost:3000` |
| `npm run build` | `next build` | Creates optimized production build |
| `npm run start` | `next start` | Runs the production server after building |
| `npm run lint` | `eslint` | Runs ESLint checks across codebase |
| `npm run typecheck` | `tsc --noEmit` | Validates TypeScript types across the project |
| `npm run seed` | `tsx scripts/seed.ts` | Seeds demo users, project, tasks, and initial comments |
| `npm run migrate:v2` | `tsx scripts/migrate-v2.ts` | Runs idempotent migration for project keys, colors, and task numbering |

---

## Database Seeding & Migration Notes

### Database Seeding
```bash
npm run seed
```
- **Safety Guard**: Refuses to run if `NODE_ENV=production` to avoid accidental data overwriting in production.
- **Idempotency**: Clears existing collections before inserting 1 Admin, 1 PM, 2 Users, and a demo project with 8 tasks across all Kanban stages with discussion threads.

### Database Migration (v2)
When upgrading an existing database to TaskFlow v2 data models:
```bash
npm run migrate:v2
```
- **Idempotency**: Running `npm run migrate:v2` repeatedly is completely safe and produces 0 modifications once migrations have completed.
- **Project Keys & Colors**: Backfills each project with a default palette color and derives a 2–5 character uppercase key (e.g. `TF`) if unassigned.
- **Task Numbering**: Sequentially numbers existing tasks (`KEY-1`, `KEY-2`, ...) and initializes `nextTaskNumber` on the project.
- **Completed Timestamps**: Backfills `completedAt` timestamps for tasks in `done` status.

---

## API Reference

### Projects & Workspaces
- `GET /api/projects`: List accessible projects.
- `POST /api/projects`: Create a new project (Admin/PM).
- `GET /api/projects/[id]`: Get project metadata and configuration.
- `PATCH /api/projects/[id]`: Update project title, description, color, or key.
- `DELETE /api/projects/[id]`: Delete project (Admin/PM owner).
- `GET /api/projects/[id]/members`: List project members.
- `POST /api/projects/[id]/members`: Add a member to the project.
- `DELETE /api/projects/[id]/members/[userId]`: Remove a member (unassigns their project tasks).

### Tasks & Kanban
- `GET /api/projects/[id]/tasks`: List tasks for a project.
- `POST /api/projects/[id]/tasks`: Create a new task with sequential numbering.
- `GET /api/tasks/[id]`: Retrieve task details.
- `PATCH /api/tasks/[id]`: Update task fields (status, assignee, priority, due date).
- `DELETE /api/tasks/[id]`: Delete task.
- `PATCH /api/tasks/[id]/move`: Reorder tasks or change status column during Kanban drag-and-drop.
- `GET /api/tasks/[id]/comments`: Retrieve task comments thread.
- `POST /api/tasks/[id]/comments`: Post a comment to a task.

### Project Chat
- `GET /api/projects/[id]/messages`: Retrieve messages (supports `after` timestamp for polling).
- `POST /api/projects/[id]/messages`: Post a chat message with up to 5 file attachments.
- `DELETE /api/messages/[id]`: Delete a message (author, PM owner, Admin).
- `GET /api/projects/[id]/messages/read`: Check unread message count.
- `POST /api/projects/[id]/messages/read`: Update user's last-read timestamp.

### File Storage (GridFS)
- `POST /api/projects/[id]/files`: Upload files (multipart form data, max 4 MB each, 100 MB quota).
- `GET /api/projects/[id]/files`: List active project files with category filtering.
- `GET /api/files/[id]`: Securely stream file contents from GridFS.
- `DELETE /api/files/[id]`: Delete file from GridFS and database.
- `PATCH /api/files/[id]`: Attach or detach a file to/from a task.

### Analytics
- `GET /api/projects/[id]/analytics?range=7|30|90`: Aggregate KPIs, burndown, velocity, and workload.
- `GET /api/analytics/global`: Global portfolio health metrics (Admin/PM only).

### Gemini AI
- `POST /api/ai/breakdown`: Generate subtasks from project brief.
- `POST /api/ai/create-task`: Parse natural language prompt into structured task.
- `POST /api/ai/summarize-comments`: Summarize task discussion thread into action items.
- `POST /api/ai/weekly-report`: Generate executive status report.
- `POST /api/ai/assistant`: Real-time streaming assistant answering project-scoped queries.

---

## Deployment Notes

### 1. MongoDB Atlas Setup
1. Create an **M0 Sandbox** cluster on [MongoDB Atlas](https://cloud.mongodb.com/).
2. In **Database Access**, create a user with `readWrite` permissions scoped to your database (e.g. `taskflow`).
3. In **Network Access**, allow access from anywhere (`0.0.0.0/0`) or configure specific IP ranges for serverless deployment.
4. Obtain the connection string (SRV URI) and configure `MONGODB_URI`.

### 2. Vercel Deployment
1. Import the repository into [Vercel](https://vercel.com/).
2. In **Project Settings** -> **Environment Variables**, configure:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI.
   - `AUTH_SECRET`: Generated 32-character string (`openssl rand -base64 32`).
   - `GOOGLE_GENERATIVE_AI_API_KEY`: Your Google AI Studio API key.
   - `AI_MODEL`: Set to `gemini-2.0-flash` or `gemini-1.5-flash`.
3. Keep default build settings (`next build`) and deploy.

---

## License

This project is licensed under the [MIT License](LICENSE).
