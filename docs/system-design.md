# FlowBoard – System Design Document

This document is the **Phase 1 deliverable**: the blueprint we will implement in code. More importantly, it captures *why* each decision was made and what questions a software engineer should ask at each step. Use it as your reference when you explain the system in interviews or to yourself.

---

## 1. What Problem Are We Solving?

**Product:** A multi-tenant project management SaaS. Many organizations use the same application; each organization’s data is isolated. Users can belong to multiple organizations with different roles.

**Engineer’s first questions:**

- *Who are the users?* People in organizations (teams, companies).
- *What is a “tenant”?* One organization. Tenant = boundary of data isolation.
- *What can go wrong if we get the design wrong?* One org could see another’s projects (data leak), or we could make the system hard to scale or change later.

**Core principle:** Every design choice should make isolation, security, and clarity of “who can do what” explicit and enforceable.

---

## 2. Multi-Tenant Model

### 2.1 What is multi-tenancy?

One deployed application serves many customers (tenants). In FlowBoard, each **Organization** is one tenant. The same code and database serve Org A and Org B, but Org A must never see Org B’s data.

### 2.2 How do we isolate data?

**Decision: tenant ID on every tenant-scoped document.**

- Every resource that “belongs” to an organization carries an `organizationId` (or equivalent) field.
- Every query that returns org-scoped data **filters by that ID**. We never return “all projects” without a tenant filter.
- The tenant is the **Organization**. So: User, Organization, and “User’s membership in an org” are special; Project, Task, Comment, etc. are always scoped by organization (via project → organization).

**Questions an engineer asks:**

- *What is the tenant boundary?* Here: Organization. (It could have been “Workspace” or “Team”; we chose Organization.)
- *Where does tenant ID live?* On every document that belongs to an org (Project, Task, etc.), and we enforce it in every read/write.
- *What if we forget to filter by tenant?* We get a data leak. So we design APIs and services so that the tenant context is **required** and **explicit** (e.g., from URL path or validated context), not optional.

### 2.3 Mental model (draw this yourself)

```
User (global identity)
  │
  ├── Member of Organization A (role: owner)
  │     └── Organization A
  │           ├── Project 1
  │           │     ├── Task 1.1, Task 1.2, …
  │           │     └── Comments on tasks
  │           └── Project 2
  │                 └── …
  │
  └── Member of Organization B (role: member)
        └── Organization B
              └── Projects, Tasks, …
```

**Rule we will enforce in code:** For any request that touches org data, we must know (1) who the user is, and (2) which organization we’re acting in. Then we check membership and only then allow access to that org’s resources.

---

## 3. Core Entities and Relationships

These are the “nouns” of the system. Later they become MongoDB collections and Mongoose models.

### 3.1 Entity table

| Entity         | Purpose                          | Key fields (conceptual) |
|----------------|----------------------------------|--------------------------|
| **User**       | Global identity; one person, one record | `email` (unique), `password` (hashed), `name` |
| **Organization** | Tenant boundary; the “workspace” | `name`, `slug`, `ownerId` (userId) |
| **Member**     | “User X is in Organization Y with role Z” | `userId`, `organizationId`, `role` |
| **Project**    | One initiative under one org     | `organizationId`, `name`, `description`, `startDate`, `endDate`, `createdBy` |
| **Task**       | One unit of work in a project     | `projectId`, `title`, `description`, `status`, `assigneeId`, `dueDate`, `createdBy` |
| **Comment**    | A comment on a task              | `taskId`, `userId`, `body`, `createdAt` |

### 3.2 Why these shapes?

- **User:** No tenant ID. Identity is global; the same person can log in and appear in many orgs.
- **Organization:** Has `ownerId` so we know who created it and who has top-level control.
- **Member:** Separate table/document because the **same user** can be in **many organizations** with **different roles**. If we stored “role” on User, we couldn’t represent “Alice is owner in Org A and member in Org B.”
- **Project:** Has `organizationId` so every project is tied to one tenant. We never query “all projects” without filtering by org.
- **Task:** Belongs to a project (and thus to an org). `assigneeId` is optional (unassigned tasks).
- **Comment:** Belongs to a task; we get tenant through Task → Project → Organization.

**Question to answer in your own words:** *Why is Member separate from User? Why does every Project have `organizationId`?*  
If you can explain that, you understand the multi-tenant and relationship model.

### 3.3 Relationships (for implementation)

- One **User** ↔ many **Members** (one per org they belong to).
- One **Organization** ↔ many **Members**, many **Projects**.
- One **Project** ↔ many **Tasks**.
- One **Task** ↔ many **Comments**.
- **User** is referenced by `Member.userId`, `Organization.ownerId`, `Task.assigneeId`, `Comment.userId`, etc.

---

## 4. Role-Based Access Control (RBAC)

### 4.1 What is RBAC?

Actions are allowed or denied based on the **role** of the current user in the **current context** (here, the organization). The backend enforces this on every request; the frontend only hides or shows UI.

### 4.2 Roles we support

| Role    | Typical meaning |
|---------|------------------|
| `owner` | Created the org or received ownership via transfer; full control; can delete org and transfer ownership. |
| `admin` | Can manage members (invite, remove, change roles), manage all projects/tasks. |
| `member` | Can work within projects they have access to (create/edit tasks, comment). |

Roles are stored on **Member** (per user per organization).

### 4.3 Three concrete rules (you should be able to state these in an interview)

1. **Who can invite a user to an organization?**  
   Only `owner` or `admin` of that organization. Invite = create a new Member for that org.

2. **Who can delete a project?**  
   Only `owner` or `admin` of the organization that owns the project. (We may later add “project-level” roles; for now org role is enough.)

3. **Who can comment on a task?**  
   Any **member** of the organization that owns the project containing the task. (So: resolve task → project → organization, then check that the user has a Member record for that org.)

### 4.4 Where we enforce this

- **Always in the backend** (in services or middleware): check membership and role before performing the action; return 403 if not allowed.
- **In the frontend:** hide or disable “Invite member,” “Delete project,” etc. for users without the right role. This is for UX only; security is in the API.

**Engineer’s question:** *What happens if someone bypasses the UI and calls the API directly?*  
Answer: The API must still check membership and role and reject the request. Never trust the client.

### 4.5 Ownership invariants

- There must **always** be at least one member with role `owner` per organization.
- The **last owner** cannot demote themselves (PATCH role away from `owner`) or be removed until another owner exists—same as “cannot remove the last owner.”
- **Transfer ownership** is a dedicated operation: another member becomes `owner`, the previous owner becomes `admin`, and `Organization.ownerId` is updated so a single source of truth remains for “who owns this org.”

---

## 5. API Design (REST, Resource-Oriented)

### 5.1 Why REST and resource-oriented URLs?

- **Predictable:** URLs represent resources; HTTP methods represent actions (GET = read, POST = create, PATCH = update, DELETE = delete).
- **Easier to secure and cache:** We can attach middleware to “all routes under `/api/organizations/:id`” and always have the org context.
- **Easier to document and test:** Each endpoint has a clear purpose.

### 5.2 Base URL and auth

- Base: `/api`.
- Auth: JWT in `Authorization: Bearer <token>`. All org/project/task endpoints require a valid token; we derive the user from it and then resolve org from the URL or body where needed.

### 5.3 Endpoint list

**Auth (no tenant)**

| Method | Path                     | Description        |
|--------|--------------------------|--------------------|
| POST   | `/api/auth/register`     | Register; returns JWT. |
| POST   | `/api/auth/login`       | Login; returns JWT.   |
| GET    | `/api/auth/me`          | Current user (from JWT). |

**Organizations (tenant boundary)**

| Method | Path                                  | Description |
|--------|---------------------------------------|-------------|
| GET    | `/api/organizations`                  | List organizations the current user is a member of. |
| POST   | `/api/organizations`                  | Create organization (caller becomes owner and first member). |
| GET    | `/api/organizations/:id`             | Get one org (if member). |
| PATCH  | `/api/organizations/:id`             | Update org (owner/admin). |
| DELETE | `/api/organizations/:id`             | Delete org (owner only). |
| GET    | `/api/organizations/:id/members`     | List members (member+). |
| POST   | `/api/organizations/:id/members`     | Invite member (owner/admin). |
| POST   | `/api/organizations/:id/transfer-ownership` | Transfer ownership: body `{ userId }`; caller must be owner; target becomes owner, caller becomes admin; updates `Organization.ownerId`. |
| PATCH  | `/api/organizations/:id/members/:userId` | Change member role (owner only; cannot demote the last owner). |
| DELETE | `/api/organizations/:id/members/:userId` | Remove member (owner/admin; cannot remove last owner). |

**Projects (under an org)**

| Method | Path                                      | Description |
|--------|-------------------------------------------|-------------|
| GET    | `/api/organizations/:id/projects`         | List projects (paginated); must be org member. |
| POST   | `/api/organizations/:id/projects`         | Create project (org member). |
| GET    | `/api/projects/:id`                       | Get project (must be org member). |
| PATCH  | `/api/projects/:id`                       | Update project (owner/admin or as defined). |
| DELETE | `/api/projects/:id`                       | Delete project (owner/admin). |

**Tasks (under a project)**

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/api/projects/:id/tasks`     | List tasks (paginated); must have access to project. |
| POST   | `/api/projects/:id/tasks`     | Create task (project access). |
| GET    | `/api/tasks/:id`              | Get task (project access). |
| PATCH  | `/api/tasks/:id`              | Update task (project access). |
| DELETE | `/api/tasks/:id`              | Delete task (project access or owner/admin). |

**Comments (on a task)**

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| GET    | `/api/tasks/:id/comments`     | List comments (task access). |
| POST   | `/api/tasks/:id/comments`     | Add comment (task access). |
| PATCH  | `/api/comments/:id`           | Edit own comment (optional). |
| DELETE | `/api/comments/:id`           | Delete own comment (optional). |

### 5.4 Why “create task” is under `projects/:id`?

- The task belongs to a project. Putting `POST /api/projects/:id/tasks` makes the parent resource explicit and gives us the project (and thus org) from the URL. We then check that the authenticated user is a member of that org before creating the task. Same idea for comments under `tasks/:id/comments`.

**Checkpoint:** For “create a task,” the URL is `POST /api/projects/:id/tasks` and the method is POST. We use the project id from the path to enforce tenant and project membership.

---

## 6. Non-Functional Choices

### 6.1 Pagination

- **Problem:** Returning “all projects” or “all tasks” can be huge and slow.
- **Decision:** List endpoints support `?page=1&limit=20` (and optionally `sort`, e.g. `-createdAt`). Backend uses skip/limit (or a cursor) and returns a bounded page plus metadata (e.g. total count or hasMore).
- **Engineer’s question:** *What if we don’t paginate?* Risk of timeouts, high memory, and bad UX. So we paginate from day one on list APIs.

### 6.2 Caching (Redis)

- **Problem:** Repeatedly listing the same projects/tasks for the same org is redundant if data doesn’t change often.
- **Decision:** Use Redis to cache read-heavy, tenant-scoped list responses (e.g. “projects for org X, page 1”). Cache key must include tenant (e.g. `projects:org:${organizationId}:page:${page}`) so we never serve one tenant’s data to another. Short TTL (e.g. 60–120 seconds). On create/update/delete of a project (or task), invalidate the relevant cache keys.
- **Engineer’s question:** *Why invalidate on write?* So users always see up-to-date data after a change. If we didn’t invalidate, we’d serve stale data.

---

## 7. Summary: What You Should Be Able to Explain

After Phase 1, you should be able to:

1. **Multi-tenant:** Explain that the tenant is the Organization; every org-scoped document has an org link; every query filters by tenant so one org never sees another’s data.
2. **Entities:** Draw User → Member → Organization → Project → Task → Comment and explain why Member is separate (same user, many orgs, different roles).
3. **RBAC:** State at least three rules (e.g. invite, delete project, comment on task) and say that the backend always enforces them.
4. **API:** Explain why “create task” is `POST /api/projects/:id/tasks` and why we use REST and resource-oriented URLs.
5. **Scaling/safety:** Explain why we paginate lists and why we invalidate cache on writes.

Use this doc as your single source of truth for Phase 1. When we implement in Phase 2 and beyond, we will refer back to these decisions so you see how design turns into code.
