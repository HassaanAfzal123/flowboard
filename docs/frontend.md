# FlowBoard — Frontend Documentation

This document describes the React (Vite) client: architecture, routes, styling, configuration, and how it connects to the API.

---

## 1. Status: feature completeness

The frontend is **functionally complete** for the current backend:

| Area | Coverage |
|------|----------|
| **Auth** | Register, login, JWT in `localStorage`, session restore via `GET /api/auth/me`, sign out |
| **Organizations** | List, create; per-org links to Projects, Members, Settings |
| **Org workspace** | Tab nav (Projects · Members · Settings), breadcrumbs |
| **Projects** | List (paginated), create; project detail with edit/delete (API role rules), task list (paginated) |
| **Tasks** | Create with optional description, status, delete; link to task detail |
| **Task detail** | Comments: list, add, edit own, delete (own or admin/owner per API) |
| **Members** | List, invite by email + role, change role (owner), remove |
| **Org settings** | Rename (owner/admin), delete org (owner) |
| **Public experience** | Marketing **landing** (`/`), polished **auth** screens, **404** (guest vs signed-in variants) |

---

## 2. Tech stack

| Layer | Choice |
|-------|--------|
| Build | [Vite](https://vitejs.dev/) 5.x |
| UI | React 19 |
| Routing | React Router 7 |
| HTTP | Axios instance with base URL + `Authorization` interceptor |
| State | React Context (`AuthProvider`) for session |

No global UI framework (MUI/Chakra) — custom CSS for a **small, ownable codebase** and interview-friendly explanations.

---

## 3. Project structure

```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── .env.example                 # VITE_API_URL
└── src/
    ├── main.jsx                 # StrictMode, BrowserRouter, AuthProvider
    ├── App.jsx                  # Route table
    ├── index.css                # Global design system & layout
    ├── assets/
    ├── services/
    │   └── api.js               # Axios + token helpers
    ├── context/
    │   └── AuthContext.jsx      # user, login, register, logout, loading
    ├── components/
    │   ├── AppLayout.jsx        # Authenticated shell: header, nav, <Outlet />
    │   ├── AuthShell.jsx        # Auth pages wrapper (uses PublicShell)
    │   ├── PublicShell.jsx      # Public pages: header/footer, optional nav
    │   ├── OrganizationNav.jsx # Org tabs: Projects | Members | Settings
    │   └── ProtectedRoute.jsx   # Redirects to /login if no session
    └── pages/
        ├── Home.jsx             # Landing; redirects to /organizations if logged in
        ├── Login.jsx
        ├── Register.jsx
        ├── Organizations.jsx
        ├── OrganizationProjects.jsx
        ├── OrganizationMembers.jsx
        ├── OrganizationSettings.jsx
        ├── ProjectDetail.jsx
        ├── TaskDetail.jsx
        └── NotFound.jsx
```

---

## 4. Routes

| Path | Auth | Page |
|------|------|------|
| `/` | Public | `Home` — landing; signed-in users redirect to `/organizations` |
| `/login` | Public | Login |
| `/register` | Public | Register |
| `/organizations` | Yes | Organization list + create |
| `/organizations/:orgId/projects` | Yes | Projects for org |
| `/organizations/:orgId/members` | Yes | Members (invite, roles, **transfer ownership** when you are the only owner) |
| `/organizations/:orgId/settings` | Yes | Org rename / delete |
| `/projects/:projectId` | Yes | Project + tasks |
| `/tasks/:taskId` | Yes | Task + comments |
| `*` | Mixed | `NotFound` — uses `PublicShell` if logged out; minimal app chrome if logged in |

---

## 5. Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Base URL of the Express API **without** a trailing slash (e.g. `http://localhost:3999`). Baked in at **build** time. |

Copy `.env.example` to `.env` locally. Production hosts (Vercel, Netlify, etc.) must set `VITE_API_URL` before `npm run build`.

---

## 6. API client (`src/services/api.js`)

- **`api`**: Axios instance with `baseURL` from `VITE_API_URL`.
- **Token**: `localStorage` key `flowboard_token`.
- **Interceptor**: Attaches `Authorization: Bearer <token>` on every request when a token exists.

---

## 7. Design system (visual refresh)

The UI was upgraded to a **modern SaaS** look while staying dependency-light.

### Typography

- **Display / logo**: [Syne](https://fonts.google.com/specimen/Syne) — strong, product-style wordmark.
- **Body**: [Outfit](https://fonts.google.com/specimen/Outfit) — readable, slightly geometric.

Loaded via Google Fonts in `index.css` (`@import`).

### Layout

- **Authenticated**: `app-shell` — sticky blurred header, primary nav (“Organizations”), user email + sign out, max-width main column.
- **Public**: `public-page` — mesh gradients, `PublicShell` with header (or minimal header on auth), footer tagline.

### Tokens (CSS variables)

Defined in `:root`: `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent`, `--danger`, `--radius`, `--max-content`, shadows. Cards use glassy panels and light borders.

### Components

- **Buttons**: `.btn`, `.btn-primary`, `.btn-ghost`, sizes `.btn-sm`, `.btn-lg`.
- **Forms**: Inputs and textareas with focus rings aligned to accent color.
- **Loading**: `.loading-screen` + `.loading-dots` for session bootstrap and landing.

### Accessibility

- Semantic landmarks (`main`, `nav`, `header`, `footer` where applicable).
- `aria-label` / `aria-live` on loading states.
- `.sr-only` for headings that are visual-only (e.g. feature grid).

---

## 8. Authentication flow

1. **Register / login** → API returns `{ user, token }`.
2. Token stored; `user` set in context.
3. **Reload**: If token exists, `GET /api/auth/me` restores `user`; invalid token clears storage.
4. **Protected routes**: `ProtectedRoute` shows loading UI, then redirects to `/login` with `state.from` for post-login redirect.

---

## 9. Scripts

```bash
cd frontend
npm install
npm run dev      # development server (default http://localhost:5173)
npm run build    # production bundle to dist/
npm run preview  # serve dist locally
```

---

## 10. Relationship to the backend

The frontend assumes the REST API documented in the backend implementation:

- List endpoints return paginated shapes such as `{ items, total, page, limit }` where applicable.
- Errors return JSON `{ message: string }` for display in `.error` banners.

CORS must allow the frontend origin (Express `cors()` is permissive in development).

---

## 11. Future improvements (optional)

- E2E tests (Playwright) for login → create org → project → task.
- React Query for caching and optimistic updates.
- i18n if you ship multiple languages.
- OpenAPI-generated TypeScript types for requests/responses.

---

## 12. Ownership rules (UI + API)

- The organization **must always have at least one** `owner` in the `Member` collection.
- The **last owner cannot** change their own role to a non-owner via **PATCH** `.../members/:userId` (same as not removing the last owner).
- **Transfer ownership:** `POST /api/organizations/:id/transfer-ownership` with body `{ userId }` — only an owner may call it; the target member becomes `owner`, the caller becomes `admin`, and `Organization.ownerId` is updated.

## 13. Changelog (this documentation)

| Date | Change |
|------|--------|
| 2026-03-29 | Full UI pass: landing page, `PublicShell`, redesigned `AppLayout`, Syne/Outfit typography, token-based theme, loading states, 404 variants, `docs/frontend.md` added. |
| 2026-03-29 | Ownership: last owner cannot self-demote via role PATCH; `POST .../transfer-ownership`; Members page transfer UI. |

This file is the **canonical frontend reference** for FlowBoard; update it when you add routes, env vars, or major UI changes.
