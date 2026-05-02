# FlowBoard

Multi-tenant project management SaaS — MERN stack with JWT auth, Redis caching, and a full AWS cloud deployment. Built phase-by-phase with a focus on production patterns and system design.

** Live frontend:**  https://doj0rgk0da5sl.cloudfront.net

--- 

## Tech stack

| Layer | Technology   |
|---|---|
| Frontend | React 18, Vite, React Router DOM, Axios |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB Atlas |
| Cache | Redis (Upstash) |
| Auth | JWT (HS256), RBAC |
| Frontend hosting | AWS S3 + CloudFront (OAC) |
| Backend hosting | AWS Lambda + API Gateway HTTP API (SAM) |
| Secrets | AWS SSM Parameter Store (SecureString + KMS) |
| Observability | AWS CloudWatch Logs + Alarms |
| Alt deployment | Render (Docker) + Vercel |

---

## AWS architecture

```
Browser
  │
  ▼ HTTPS
┌─────────────────────┐
│  CloudFront (CDN)   │  ← global edge, enforces HTTPS, SPA fallback
└────────┬────────────┘
         │ SigV4 (OAC)
         ▼
┌─────────────────────┐
│  S3 Bucket (private)│  ← static assets, no public access
└─────────────────────┘

Browser → API calls
  │
  ▼ HTTPS
┌─────────────────────┐
│  API Gateway        │  ← HTTP API, $default stage
│  (HTTP API)         │
└────────┬────────────┘
         │ Lambda proxy
         ▼
┌─────────────────────┐
│  Lambda Function    │  ← Express via serverless-http adapter
│  (Node 20)          │
└────────┬────────────┘
         │ reads at cold start
         ▼
┌─────────────────────┐
│  SSM Parameter      │  ← MONGODB_URI, JWT_SECRET, REDIS_URL
│  Store (encrypted)  │     as SecureString (KMS-encrypted)
└─────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ MongoDB Atlas  │  Redis (cache) │
└────────────────────────────────┘
```

### Why each AWS service was chosen

**S3 + CloudFront with OAC (not public S3)**
The bucket is fully private — no public access block disabled, no ACLs. CloudFront authenticates to S3 using [Origin Access Control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html), signing every origin request with SigV4. The bucket policy only accepts requests where `AWS:SourceArn` matches this specific distribution. Users cannot reach S3 directly.

SPA deep-link routing is handled at CDN level: CloudFront custom error responses return `index.html` with HTTP 200 for both 403 and 404. React Router takes over client-side — no server-side catch-all needed.

**Lambda + API Gateway HTTP API (not REST API)**
The Express app runs on Lambda unchanged, via the `serverless-http` adapter. HTTP API is ~70% cheaper than REST API and has lower latency; the trade-off (no usage plans, no per-method IAM auth) is acceptable for this workload.

The SAM template (`backend/template.yaml`) defines the full infrastructure as code: function, API, IAM role, CloudWatch log group (14-day retention), and error alarm. One `sam deploy` recreates everything.

**SSM Parameter Store with least-privilege IAM**
Secrets are stored as `SecureString` (KMS-encrypted). The Lambda execution role is scoped to `ssm:GetParameter` on `/flowboard/prod/*` only — it cannot read parameters from other prefixes or applications. The `kms:Decrypt` permission uses a `kms:ViaService` condition so decryption is only allowed when the request originates from SSM. Nothing sensitive is in the deployment artifact or git.

**CloudWatch**
Log retention is set to 14 days (without this Lambda logs accumulate indefinitely). A CloudWatch alarm fires on Lambda `Errors >= 1` in a 60-second window — the hook for alerting in a real team.

---

## Application features

- **Multi-tenant:** every resource (project, task, comment) is scoped to an organization; cross-tenant data leakage is structurally impossible
- **RBAC:** three roles per org (owner / admin / member) enforced at the service layer, not just route middleware
- **Invitation flow:** owners/admins invite existing users; invitee gets an in-app notification bell; accepting creates membership; inviter can cancel before acceptance
- **Ownership transfer:** transferring ownership demotes the previous owner to admin; they remain a member until they explicitly leave
- **Leave organization:** dedicated leave action (not "remove self"); redirects to the org dashboard on success
- **Redis caching:** API responses for expensive list endpoints are cached with short TTL; cache is invalidated on mutation
- **Stale-context resilience:** concurrent user actions (removal, org deletion, role change) that affect another active session are handled gracefully:
  1. Backend returns machine-readable error codes (`ORG_MEMBERSHIP_REQUIRED`, `RESOURCE_NOT_FOUND`, etc.)
  2. Global Axios interceptor classifies and redirects (auth failure → `/login`; org access revoked → `/organizations` with a one-time notice)
  3. CloudFront / Vercel SPA fallback ensures deep-link refreshes never hit a platform 404

---

## Repo structure

```
flowboard/
├── backend/
│   ├── src/
│   │   ├── config/runtime-config.js   # SSM loader (Lambda cold start)
│   │   ├── lambda.js                  # Lambda entrypoint (serverless-http)
│   │   ├── server.js                  # Standard Node server (local/Docker)
│   │   ├── app.js                     # Express app (shared)
│   │   ├── models/
│   │   ├── services/                  # All business logic lives here
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/
│   └── template.yaml                  # SAM / CloudFormation template
├── frontend/
│   ├── src/
│   │   ├── services/api.js            # Axios instance + global interceptor
│   │   ├── components/AppLayout.jsx   # Notification bell + invite popover
│   │   └── pages/
│   └── vercel.json                    # SPA rewrite for Vercel
└── docs/
    ├── system-design.md
    └── aws-stage-1-3-runbook.md       # Full AWS deployment runbook (CLI)
```

---

## Local development

**Prerequisites:** Node 20+, MongoDB running locally or Atlas URI, Redis (local or Upstash URL)

**Backend:**

```bash
cd backend
cp .env.example .env    # fill MONGODB_URI, JWT_SECRET, REDIS_URL, PORT
npm install
npm run dev
```

**Frontend:**

```bash
cd frontend
cp .env.example .env    # set VITE_API_URL=http://localhost:<PORT>
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). Register, sign in, create organizations, invite members, manage projects and tasks.

**Frontend routes (authenticated):**
`/organizations` · `/organizations/:orgId/projects` · `/organizations/:orgId/members` · `/organizations/:orgId/settings` · `/projects/:projectId` · `/tasks/:taskId`

---

## Running with Docker (backend)

```bash
cd backend
docker build -t flowboard-backend .
docker run -p 4000:4000 \
  -e MONGODB_URI="..." \
  -e JWT_SECRET="..." \
  -e REDIS_URL="..." \
  flowboard-backend
```

---

## AWS deployment

Full step-by-step CLI runbook: [`docs/aws-stage-1-3-runbook.md`](docs/aws-stage-1-3-runbook.md)

CI/CD operations runbook: [`docs/cicd-runbook.md`](docs/cicd-runbook.md)

User setup checklist for enabling CI/CD: [`docs/required-actions-from-user.md`](docs/required-actions-from-user.md)

Summary:

1. Store secrets in SSM Parameter Store as `SecureString`
2. `sam build && sam deploy --guided` from `backend/` → Lambda + API Gateway live
3. `npm run build` in `frontend/` with `VITE_API_URL` set to the SAM output URL
4. `aws s3 sync dist/ s3://<bucket>` to upload assets
5. CloudFront distribution with OAC + SPA error responses already configured

---

## Key engineering decisions

**Why `Member` is a separate model from `User`**
A user can belong to many organizations with different roles in each. Storing role on `User` would mean one role globally. `Member` is a join table with `(userId, organizationId, role)` — the correct multi-tenant design. Every data access path checks membership first.

**Why Lambda over always-on server**
At low traffic, Lambda costs near zero (1M free requests/month). More importantly, it demonstrates the adapter pattern: `serverless-http` wraps the same Express app used locally — no business logic changes. This is portable: the app can run on Lambda, Render, Docker, or bare EC2 without modification.

**Why SSM over Lambda environment variables**
Lambda env vars are visible in plaintext in the AWS console and in deployment artifacts. SSM SecureString values are KMS-encrypted at rest, access is auditable via CloudTrail, and rotation doesn't require a redeployment.

**Why HTTP API over REST API**
REST API Gateway charges per request and has higher baseline latency. HTTP API is the modern default — lower latency, simpler config, auto-deploy. The missing features (request validation, usage plans) are not needed for this workload.
