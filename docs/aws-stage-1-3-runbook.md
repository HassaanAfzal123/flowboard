# FlowBoard AWS Stage 1-3 Runbook

This runbook deploys FlowBoard with practical AWS patterns for junior cloud/fullstack roles:

- Stage 1: baseline live architecture and service split
- Stage 2: frontend on S3 + CloudFront, backend on Lambda + API Gateway (SAM)
- Stage 3: cloud operations depth (IAM least privilege, Parameter Store, CloudWatch alarms/log retention)

## 0) Prerequisites

- AWS account with free-tier eligibility
- AWS CLI configured locally (`aws configure`)
- SAM CLI installed
- Node 20+ locally
- Existing external services:
  - MongoDB Atlas URI
  - Redis URL

## 1) Backend changes implemented for AWS

The backend now supports:

- Lambda entrypoint at `backend/src/lambda.js`
- Runtime config loading from SSM Parameter Store via `backend/src/config/runtime-config.js`
- Restrictable CORS via `FRONTEND_ORIGIN` (comma-separated list)
- Error taxonomy (`message + code`) for stable client handling
- SAM template: `backend/template.yaml`
  - Lambda + HTTP API
  - IAM policy for SSM reads
  - CloudWatch alarm on function errors
  - 14-day log retention

## 2) Create Parameter Store values (Stage 3 security)

Use `SecureString` for secrets:

```bash
aws ssm put-parameter --name "/flowboard/prod/MONGODB_URI" --type SecureString --value "<mongo-uri>" --overwrite
aws ssm put-parameter --name "/flowboard/prod/JWT_SECRET" --type SecureString --value "<jwt-secret>" --overwrite
aws ssm put-parameter --name "/flowboard/prod/REDIS_URL" --type SecureString --value "<redis-url>" --overwrite
```

Use plain `String` for non-secret config:

```bash
aws ssm put-parameter --name "/flowboard/prod/FRONTEND_ORIGIN" --type String --value "https://<your-cloudfront-domain-or-custom-domain>" --overwrite
```

## 3) Deploy backend with SAM (Lambda + API Gateway)

From `backend/`:

```bash
sam build
sam deploy --guided
```

Recommended guided answers:

- Stack name: `flowboard-backend-prod`
- AWS region: pick one and keep consistent
- Confirm changes before deploy: `Y`
- Allow SAM IAM role creation: `Y`
- Save arguments to samconfig: `Y`
- Parameter `SsmParamPrefix`: `/flowboard/prod`
- Parameter `StageName`: `prod`

After deploy, note `ApiUrl` output. This becomes the frontend API base URL.

## 4) Frontend deploy on S3 + CloudFront (Stage 2)

### 4.1 Build with production API URL

From `frontend/`:

```bash
# Linux/macOS
VITE_API_URL="https://<api-id>.execute-api.<region>.amazonaws.com/prod" npm run build

# PowerShell
$env:VITE_API_URL="https://<api-id>.execute-api.<region>.amazonaws.com/prod"; npm run build
```

### 4.2 S3 static hosting

- Create S3 bucket for frontend assets
- Upload `frontend/dist/` contents
- Keep bucket private if using CloudFront + OAC (recommended)

### 4.3 CloudFront

- Origin: S3 bucket
- Default root object: `index.html`
- Viewer protocol policy: Redirect HTTP to HTTPS
- SPA fallback:
  - Custom error responses:
    - 403 -> `/index.html` with 200
    - 404 -> `/index.html` with 200

This is AWS equivalent of SPA rewrites and prevents deep-link NOT_FOUND pages.

## 5) Stage 3 operations checklist

### IAM least privilege

- Lambda role can read only:
  - `arn:aws:ssm:<region>:<account-id>:parameter/flowboard/prod/*`
- Avoid wide admin policies on runtime role.

### CloudWatch

- Logs are available by default for Lambda.
- Log retention is set to 14 days in template.
- Error alarm is included in template (`flowboard-api-prod-errors`).

### Security hygiene

- Keep secrets only in SSM (not in repo, not in plaintext env files in CI).
- Rotate JWT secret and DB creds periodically.
- Restrict CORS using `FRONTEND_ORIGIN`.

## 6) Validation tests after deployment

- API health: `GET <ApiUrl>/api/health`
- Register/login flow works
- Org/project/task/comment operations work
- Invite notifications work
- Concurrent change behavior:
  - remove member / transfer ownership / resource deletion from another account
  - stale user gets graceful redirect instead of hard error page

## 7) Cost control tips

- Lambda + API Gateway are low-cost at small traffic.
- S3 + CloudFront is cheaper than always-on VM for frontend.
- Set CloudWatch log retention (already done).
- Avoid over-provisioned NAT/ALB early.

## 8) Interview talking points

- “I migrated a monolith-style Express API to Lambda without rewriting business logic by adding a serverless adapter.”
- “I moved secrets to SSM Parameter Store and loaded them at runtime with least-privilege IAM.”
- “I implemented CloudWatch log retention and error alarms for operational readiness.”
- “I handled SPA deep-link routing at CDN level and implemented client-side stale-context recovery for concurrent user actions.”
