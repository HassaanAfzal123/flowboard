# FlowBoard

Multi-tenant project management SaaS (MERN + JWT + Redis). This repo is built phase-by-phase with a focus on **learning**: each phase teaches system design, backend structure, and frontend integration so you can explain and extend the system like a software engineer.

## Learning path

- **Phase 1 – System design:** [docs/system-design.md](docs/system-design.md) (no code; entities, multi-tenant, RBAC, API shape).
- **Phase 2+:** Backend (Node/Express/MongoDB), then multi-tenant + RBAC, then Redis, then React frontend, then deployment.

Start with the [system design doc](docs/system-design.md). Before writing code, you should be able to explain in your own words: tenant boundary, why `Member` is separate from `User`, and at least one RBAC rule.

## Tech stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), Redis, JWT
- **Frontend:** React (Vite) in `frontend/` — see **[docs/frontend.md](docs/frontend.md)** for routes, design system, and env vars.
- **Deployment:** TBD (e.g. Render + Vercel)

## Repo structure (target)

```
flowboard/
├── backend/          # Express API (Phase 2+)
├── frontend/         # React app (later phase)
├── docs/
│   └── system-design.md   # Phase 1 deliverable
└── README.md
```

## Phase 1 self-check

After reading `docs/system-design.md`, try without looking:

1. Draw User → Organization → Project → Task and where Member fits.
2. State the multi-tenant rule in one sentence.
3. Say who can invite a member to an organization and who can delete a project.
4. Give the URL and method for “create a task.”

If you can do all four, you’re ready to move to Phase 2 (backend foundation).

## Frontend (local dev)

1. Start MongoDB, Redis (if you use caching), and the backend (`cd backend && npm run dev`). Set `PORT` in `backend/.env` to match your API (e.g. `3999`).
2. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` to your backend base URL with **no trailing slash**, e.g. `http://localhost:3999`.
3. Run the React app:

```bash
cd frontend
npm install
npm run dev
```

4. Open the URL Vite prints (usually `http://localhost:5173`). Register, sign in, then create and list organizations. The app stores the JWT in `localStorage` under `flowboard_token` and sends `Authorization: Bearer …` on API calls.

5. From **Organizations**, use **Projects**, **Members**, or **Settings** on each org. Create projects, open a project to manage **tasks** (with comments on `/tasks/:taskId`), invite members (existing accounts only), and rename or delete an org when your role allows it.

**Frontend routes (authenticated):** `/organizations` · `/organizations/:orgId/projects` · `/organizations/:orgId/members` · `/organizations/:orgId/settings` · `/projects/:projectId` · `/tasks/:taskId`

**Engineering note:** `VITE_API_URL` is baked in at build time. For production, set it in your hosting provider’s environment when you run `npm run build`.
