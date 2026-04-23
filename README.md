# TaskFlow — MERN Stack Project Management Platform

Full-stack project management app with 3 role-based dashboards (Admin / PM / User), Kanban board, and per-task comment chatbox.

## Tech Stack
- **Frontend**: React 18 + Vite + React Router v6
- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + Bcrypt

## Quick Start

### 1. Install all dependencies
```bash
npm run install:all
```

### 2. Configure server environment
```bash
cd server
cp .env.example .env
# Edit MONGO_URI and JWT_SECRET
```

### 3. Seed demo data
```bash
# Start dev servers first, then visit login page
# and click any "Quick Demo Login" button — it auto-seeds
# OR manually:
curl -X POST http://localhost:5000/api/auth/seed
```

### 4. Run both servers
```bash
npm run dev   # runs server (5000) + client (5173) concurrently
```

## Project Deployed
https://taskflow-1-7sax.onrender.com
