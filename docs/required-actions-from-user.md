# Required Actions From You (GitHub + AWS)

This project now contains production-grade CI/CD workflows. Complete the steps below to make them runnable.

## 1) GitHub repository settings

### A. Create environments

Create these environments in GitHub:

- `dev`
- `staging`
- `production`

For `production`:

- enable required reviewers (at least 1)

### B. Add environment secrets and variables

For each environment (`dev`, `staging`, `production`), set:

- Secret: `AWS_ROLE_TO_ASSUME`
  - value: IAM role ARN for that environment deploy role
- Variable: `AWS_REGION`
  - value example: `us-east-1`

## 2) AWS IAM OIDC provider

In AWS IAM, create OIDC provider:

- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

## 3) AWS deploy roles

Create one role per environment (recommended):

- `flowboard-gha-deploy-dev`
- `flowboard-gha-deploy-staging`
- `flowboard-gha-deploy-prod`

Attach:

- trust policy from `docs/iam/github-oidc-trust-policy-template.json`
- permissions policy from `docs/iam/github-actions-sam-deploy-policy-template.json`

Before attaching, replace placeholders:

- `<ACCOUNT_ID>`
- `<AWS_REGION>`
- `<GITHUB_OWNER>`
- `<REPOSITORY>`

## 4) Branch protection rules (strongly recommended)

Protect branches:

- `dev`
- `staging`
- `main`

Enable:

- require pull request before merge
- require status checks to pass
- block force pushes

Required status checks:

- `Frontend lint and build`
- `Backend SAM validate and build`

## 5) One-time validation sequence

1. Open a test PR to `dev` and verify CI checks pass.
2. Merge PR and verify `Deploy dev` job succeeds.
3. Promote change to `staging` and verify deploy + smoke test.
4. Promote to `main`, approve production environment, verify deploy.
5. Trigger `Rollback Serverless Backend` once with a known stable ref.

## 6) SSM parameters you must have per environment

Ensure these SecureString parameters exist for each prefix:

- `/flowboard/dev/MONGODB_URI`
- `/flowboard/dev/JWT_SECRET`
- `/flowboard/dev/REDIS_URL`
- `/flowboard/dev/FRONTEND_ORIGIN`

- `/flowboard/staging/MONGODB_URI`
- `/flowboard/staging/JWT_SECRET`
- `/flowboard/staging/REDIS_URL`
- `/flowboard/staging/FRONTEND_ORIGIN`

- `/flowboard/prod/MONGODB_URI`
- `/flowboard/prod/JWT_SECRET`
- `/flowboard/prod/REDIS_URL`
- `/flowboard/prod/FRONTEND_ORIGIN`

## 7) Done criteria

Your setup is complete when:

- PR checks run automatically and pass/fail correctly.
- Dev/staging deploy automatically on branch pushes.
- Production deploy pauses for approval and succeeds after approval.
- Rollback workflow can deploy a selected previous git ref.
