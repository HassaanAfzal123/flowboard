---
name: FlowBoard Learning Path
overview: A phased learning plan that takes you from zero to a deployed FlowBoard (multi-tenant MERN SaaS) by teaching system design first, then layering in framework knowledge and implementation in small, understandable steps—so you build real engineering skills while using AI as a pair programmer.
todos: []
isProject: false
---

# FlowBoard: Learn-by-Building Plan (System Design → Deployment)



---

---

## Phase 1: System Design (No Code—Thinking Like an Engineer)

**What you’re learning:** How to go from “multi-tenant project management” to a concrete data model and API shape.

### 1.1 Multi-tenant model

- **Concept:** One app serves many **organizations (tenants)**. Data must be isolated so Org A never sees Org B’s data.
- **Decision:** **Tenant ID on every document** (Organization/Workspace as the tenant boundary). Every query filters by `organizationId` (or `workspaceId`). No shared tables without a tenant key.
- **Outcome:** You should be able to draw: User → belongs to many Organizations → each Organization has Projects → each Project has Tasks. One user can be in multiple orgs with different roles.

### 1.2 Core entities and relationships

Define these on paper or in a doc (later they become Mongoose models):


| Entity           | Purpose                 | Key fields (conceptual)                           |
| ---------------- | ----------------------- | ------------------------------------------------- |
| **User**         | Identity across tenants | email, hashed password, name                      |
| **Organization** | Tenant boundary         | name, slug, owner (userId)                        |
| **Member**       | User’s role in an org   | userId, organizationId, role (owner/admin/member) |
| **Project**      | Scoped to one org       | organizationId, name, description, dates          |
| **Task**         | Belongs to one project  | projectId, assigneeId, status, dueDate, title     |
| **Comment**      | On a task               | taskId, userId, body, createdAt                   |


- **Learning checkpoint:** Explain why “Member” is separate from “User” and why every Project has `organizationId`.

### 1.3 Role-based access control (RBAC)

- **Concept:** Actions depend on **role in that organization** (e.g., only owner can delete org, only members with access can see a project).
- **Model:** Roles: `owner` | `admin` | `member`. Store in **Member** (user + organization + role). Backend **always** checks membership and role before any org/project/task operation.
- **Learning checkpoint:** Write three rules: “Who can invite a user to an org?” “Who can delete a project?” “Who can comment on a task?”

### 1.4 API design (REST, resource-oriented)

- **Concept:** URLs = resources; HTTP methods = actions. Consistency makes the backend predictable.
- **Sketch (examples):**
  - `POST /api/auth/register`, `POST /api/auth/login` → return JWT.
  - `GET/POST /api/organizations` (list mine, create).
  - `GET/PATCH/DELETE /api/organizations/:id`.
  - `POST /api/organizations/:id/members` (invite), `DELETE .../members/:userId`.
  - `GET/POST /api/organizations/:id/projects`; `GET/PATCH/DELETE /api/projects/:id`.
  - `GET/POST /api/projects/:id/tasks`; `GET/PATCH/DELETE /api/tasks/:id`; `POST /api/tasks/:id/comments`.
- **Learning checkpoint:** For “create a task,” which URL and method? Why is it under `projects/:id`?

### 1.5 Non-functional choices (caching, pagination)

- **Pagination:** List endpoints (projects, tasks) use `?page=1&limit=20`. Backend uses skip/limit or cursor; never return unbounded lists.
- **Caching:** Redis caches **read-heavy, tenant-scoped** data (e.g., “list projects for org X”) with a short TTL. Invalidate on create/update/delete. You’ll add this after basic CRUD works.

**Deliverable:** A short “System design doc” (can be a markdown file in the repo) with: (1) entity list and relations, (2) multi-tenant rule, (3) 3 RBAC rules, (4) API list with methods and URLs.

---

## Phase 2: Backend Foundation (Node + Express + MongoDB)

**What you’re learning:** Layered backend structure, env-based config, and how Express and MongoDB fit together.

### 2.1 Project setup and “layers”

- **Concept:** **Layered architecture:** Routes → Controllers → Services → Models (and DB). Routes parse HTTP; controllers orchestrate; services hold business logic; models define data.
- **Setup:** Create a Node project (`package.json`), install Express, Mongoose, dotenv, cors, helmet. Use `src/` with folders: `config`, `models`, `services`, `controllers`, `routes`, `middleware`, `utils`.
- **Learning:** Why layers? So that “can user X delete this project?” lives in one place (service), and the HTTP layer only calls that and returns status codes.

### 2.2 Config and database

- **Concept:** No secrets or environment-specific URLs in code. Use `process.env` and a `.env` file (never commit real secrets).
- **Implement:** `config/db.js` (or similar) that connects to MongoDB using `process.env.MONGODB_URI`. Express app listens on `process.env.PORT`.
- **Learning checkpoint:** Where is the database URL defined? Why is it not in the code?

### 2.3 First model and CRUD (Users)

- **Concept:** Mongoose **schemas** define structure and validation; **models** are the interface to the collection.
- **Implement:** User model (email unique, password hashed with bcrypt before save). No auth yet—just a simple `POST /api/users` (register) that hashes password and saves. Add a “get me” route later when you add JWT.
- **Learning:** What is a schema vs. a model? Why hash passwords in the app instead of storing plain text?

### 2.4 Authentication (JWT)

- **Concept:** **Stateless auth:** server doesn’t store sessions; it signs a token (JWT) that encodes userId (and optionally tenant/role). Client sends `Authorization: Bearer <token>`; server verifies signature and reads payload.
- **Implement:** Login endpoint that checks password and returns a JWT (e.g., `{ userId }`). Middleware `authMiddleware` that reads token, attaches `req.user`, and returns 401 if missing/invalid.
- **Learning:** Why is JWT “stateless”? What happens if the token is stolen? (You’ll later add short expiry and refresh if needed.)

---

## Phase 3: Multi-Tenant and RBAC (Backend)

**What you’re learning:** Enforcing tenant isolation and roles in every relevant request.

### 3.1 Organization and Member models

- **Implement:** Organization (name, slug, ownerId). Member (userId, organizationId, role). Indexes: (organizationId, userId) unique for Member; organizationId on Organization.
- **Business rule:** Only the owner can delete the org; only owner/admin can invite or change roles. Implement these in a **service** (e.g., `OrganizationService`), not in the route.

### 3.2 Tenant context and middleware

- **Concept:** Once you know “who” (from JWT), you need “where” (which org) for org-scoped routes. Use path params: `/api/organizations/:organizationId/...`.
- **Implement:** Middleware that loads the organization, checks that `req.user` is a member, attaches `req.membership` (with role) and `req.organization`. Return 403 if not a member. Use this on all organization and project routes.

### 3.3 Project and Task models

- **Implement:** Project (organizationId, name, description, dates). Task (projectId, assigneeId, status, dueDate, title, etc.). Comment (taskId, userId, body).
- **Rules:** Only org members can create projects in that org. Only users with access to the project can create/edit tasks or comments. Enforce in services: e.g., “get project by id” must also check `project.organizationId` matches the tenant context.

### 3.4 Permission checks in services

- **Concept:** **Backend enforces permissions.** Even if the frontend hides a button, the API must check: can this user do this action in this org/project?
- **Implement:** For each destructive or sensitive action (delete project, assign task, invite member), call a small permission helper or service method that checks role/membership. Return 403 with a clear message if not allowed.
- **Learning checkpoint:** Give one example: “Delete project” checks what, and where in the code?

---

## Phase 4: API Completeness and Data Integrity

**What you’re learning:** Validation, error handling, and pagination so the API is safe and scalable.

### 4.1 Input validation

- **Concept:** Never trust the client. Validate body and params (e.g., with Joi or express-validator). Return 400 with a list of errors.
- **Implement:** Validators for register, login, create/update org, project, task, comment. Use them in routes before calling controllers.

### 4.2 Pagination and sorting

- **Implement:** `GET /api/organizations/:id/projects?page=1&limit=20&sort=-createdAt`. Same idea for tasks. Use MongoDB skip/limit; optionally total count. Document the query params in your design doc or README.

### 4.3 Error handling and idempotency

- **Concept:** Central error handler (Express error middleware). Map “not found” → 404, “forbidden” → 403, validation → 400, server errors → 500. Never leak stack traces in production.
- **Implement:** Error middleware and a small set of app-specific error classes (e.g., `NotFoundError`, `ForbiddenError`). Use them in services and let the middleware format the response.

---

## Phase 5: Caching with Redis

**What you’re learning:** When and how to cache without breaking tenant isolation or freshness.

### 5.1 Redis setup and tenant-safe keys

- **Concept:** Cache keys must include **tenant id** so one tenant never sees another’s data. Example: `projects:org:${organizationId}:page:${page}`.
- **Implement:** Connect Redis (e.g., `config/redis.js`). Create a small cache service: `get(key)`, `set(key, value, ttlSec)`, `del(key)`.

### 5.2 Cache strategy for list endpoints

- **Implement:** For “list projects for org” (and optionally “list tasks for project”), try cache first; on miss, query DB, then set cache with short TTL (e.g., 60–120 seconds). On create/update/delete of a project (or task), invalidate the relevant list keys (e.g., by prefix `projects:org:${id}`).
- **Learning checkpoint:** Why invalidate on write? What could go wrong if you didn’t?

---

## Phase 6: Frontend (React) and Integration

**What you’re learning:** How React fits in: components, state, and talking to your API securely.

### 6.1 React app setup and structure

- **Concept:** Single-page app (SPA). React = UI components; you need state (e.g., auth, current org), routing, and API calls.
- **Setup:** Create React app (Vite or CRA) with a clear folder structure: `components`, `pages`, `hooks`, `services` (API client), `context` (e.g., AuthContext), `utils`.

### 6.2 Auth flow in the UI

- **Implement:** Login/register forms. On success, store JWT (e.g., in memory or localStorage; prefer memory or httpOnly cookie if you add a backend cookie option later). AuthContext provides `user`, `login`, `logout`. Axios or fetch interceptor adds `Authorization: Bearer <token>` to every request. Redirect unauthenticated users to login.

### 6.3 Organization and project UI

- **Implement:** “My organizations” list (from your API). Select current org → then list projects for that org. Create project form. Use your paginated project API. You’re learning: how React state and useEffect map to “load when org changes” and “load next page.”

### 6.4 Tasks and comments

- **Implement:** Project detail page with task list (paginated), add/edit task, task detail with comments. Buttons for “assign,” “change status” only if the user has permission (and backend still enforces). Learning: frontend hides UI for forbidden actions; backend never trusts that and enforces again.

### 6.5 RBAC in the UI

- **Concept:** Show/hide or enable/disable based on role (e.g., “Invite member” only for owner/admin). Get role from the same API that returns membership or from a “me” endpoint that includes org roles.
- **Implement:** Use membership/role in context or props to conditionally render invite button, delete project, etc.

---

## Phase 7: Deployment and Production Readiness

**What you’re learning:** How the app runs in the real world and how to keep it secure and observable.

### 7.1 Environment and secrets

- **Concept:** Production uses different env vars (real MongoDB, Redis, strong JWT secret, frontend URL). No `.env` with secrets in the repo.
- **Implement:** Example `.env.example` with placeholder keys. Document in README what each variable is for. Use different configs for dev vs prod (e.g., CORS origin, cookie flags).

### 7.2 Backend deployment (e.g., Render, Railway, or a VPS)

- **Concept:** Backend runs as a long-running process; it needs a public URL and env vars injected by the platform.
- **Implement:** Deploy Node app (e.g., to Render). Set `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `FRONTEND_URL`. Health check: `GET /api/health` that checks DB (and optionally Redis) and returns 200 only if the app is ready.

### 7.3 Frontend deployment (e.g., Vercel/Netlify)

- **Concept:** Frontend is static assets; it calls the backend API. You must set the API base URL via env (e.g., `VITE_API_URL`) so the same build can point to staging or production.
- **Implement:** Build the React app with the production API URL. Deploy to Vercel/Netlify. Test login and full flow against the deployed backend.

### 7.4 Post-deployment checklist

- **Implement:** HTTPS only; no console.log of secrets; rate limiting on auth routes (e.g., express-rate-limit); secure headers (helmet). Optional: simple logging (request id, status code, duration) for debugging.

---

## How to Use AI While Learning

- **For design (Phase 1):** You write the entity list and API list; use AI to review and suggest indexes or extra fields.
- **For implementation:** You specify the layer (“add a function in ProjectService that checks the user is a member and then deletes”) and the contract (input/output); let AI generate the code, then you read it and explain one part aloud.
- **When stuck:** Ask AI to “explain this middleware line by line” or “what does this Mongoose method return?” Then close the chat and explain it yourself in a comment or doc.
- **Before interviews:** From memory, draw the FlowBoard architecture (User → Org → Project → Task), list the layers of the backend, and explain one RBAC rule and one caching decision.

---

## Suggested Repo Structure (Reference)

```
flowboard/
├── backend/
│   ├── src/
│   │   ├── config/       # db, redis, env
│   │   ├── models/       # User, Organization, Member, Project, Task, Comment
│   │   ├── services/     # AuthService, OrganizationService, ProjectService, TaskService
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/   # auth, tenant, validation, errorHandler
│   │   └── utils/        # errors, cache keys
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/      # AuthContext
│   │   ├── services/     # api client
│   │   └── hooks/
│   └── package.json
├── docs/                 # system-design.md (your Phase 1 deliverable)
└── README.md
```

---

## Summary: Skills You’ll Have After This


| Area              | What you’ll be able to explain                                              |
| ----------------- | --------------------------------------------------------------------------- |
| **System design** | Multi-tenant isolation, RBAC, resource-oriented API design                  |
| **Backend**       | Layered architecture, JWT auth, middleware, permission checks in services   |
| **Data**          | Mongoose models, indexes, pagination, Redis caching and invalidation        |
| **Frontend**      | React state, context, protected routes, and calling a real API with auth    |
| **Deployment**    | Env-based config, backend + frontend hosting, health checks, basic security |


You’ll have one solid full-stack project and the vocabulary to discuss design, tradeoffs, and implementation in interviews. If you want, the next step can be a **Phase 1-only implementation plan** (exact file names and first endpoints) so you can start coding the backend right after your system design doc.