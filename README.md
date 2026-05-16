# Team Task Manager

A full-stack web application for creating projects, assigning tasks, and tracking progress with **role-based access control** (Admin / Member).

## Live demo

> Deploy to Railway and add your live URL here after deployment.

## Features

- **Authentication** — Sign up and log in with JWT
- **Projects & teams** — Create projects, invite members by email, assign Admin or Member roles
- **Tasks** — Create, assign, update status (To Do / In Progress / Done), set due dates
- **Dashboard** — Summary stats, tasks by status, overdue tasks, your assignments, recent activity
- **RBAC** — Admins manage members, delete tasks/projects; Members work on assigned tasks

## Tech stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, Vite, React Router        |
| Backend  | Node.js, Express 5, Prisma ORM      |
| Database | PostgreSQL                          |
| Auth     | JWT + bcrypt                        |
| Deploy   | Railway                             |

## Project structure

```
├── backend/          # REST API + Prisma
│   ├── prisma/       # Database schema
│   └── src/          # Routes, middleware, RBAC
├── frontend/         # React SPA
└── README.md
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard` | Dashboard data |
| GET/POST | `/api/projects` | List / create projects |
| GET/PATCH/DELETE | `/api/projects/:id` | Project CRUD |
| POST | `/api/projects/:id/members` | Add member (Admin) |
| GET/POST | `/api/projects/:id/tasks` | List / create tasks |
| PATCH/DELETE | `/api/projects/:id/tasks/:taskId` | Update / delete task |

## Local development

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd team-task-manager
```

2. **Install dependencies**

```bash
npm run install:all
```

3. **Configure environment**

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/team_task_manager"
JWT_SECRET="your-long-random-secret"
PORT=5000
```

4. **Push database schema**

```bash
npm run db:push
```

5. **Run the app**

Terminal 1 — API:

```bash
npm run dev:backend
```

Terminal 2 — Frontend (with proxy to API):

```bash
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000).

### Production build (local)

```bash
npm run build
cd backend && npm start
```

The API serves the built frontend from `frontend/dist`.

## Deploy on Railway

1. Push this project to **GitHub**.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Add a **PostgreSQL** plugin to the project.
4. In your **web service** variables, set:
   - `DATABASE_URL` — reference from the Postgres service (`${{Postgres.DATABASE_URL}}`)
   - `JWT_SECRET` — a long random string
   - `NODE_ENV` — `production`
5. Railway will run the build (install, build frontend, Prisma generate) and start the server.
6. Open the generated **public URL** and test signup → create project → add tasks.

### Railway checklist

- [ ] PostgreSQL service attached
- [ ] `DATABASE_URL` and `JWT_SECRET` set
- [ ] Health check: `GET /api/health` returns `{ "status": "ok" }`
- [ ] Frontend loads at root URL
- [ ] Live URL added to this README

## Roles

| Action | Admin | Member |
|--------|:-----:|:------:|
| Create / edit project | ✓ | — |
| Add / remove members | ✓ | — |
| Change member roles | ✓ | — |
| Create tasks | ✓ | ✓ |
| Update own / assigned tasks | ✓ | ✓ |
| Reassign tasks | ✓ | — |
| Delete tasks | ✓ | — |

## Submission

| Item | Link |
|------|------|
| Live URL | _Add after Railway deploy_ |
| GitHub repo | _Add your repository URL_ |
| README | This file |

## License

MIT
