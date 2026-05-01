# CI/CD Runbook (GitHub Actions + AWS SAM)

This runbook defines the production deployment process for FlowBoard backend.

## 1) Branch and environment mapping

- `dev` branch -> GitHub environment `dev` -> stack `flowboard-dev`
- `staging` branch -> GitHub environment `staging` -> stack `flowboard-staging`
- `main` branch -> GitHub environment `production` -> stack `flowboard-prod`

Manual deployments are available via `workflow_dispatch` in `deploy.yml`.

## 2) Workflows in this repository

- `.github/workflows/ci.yml`
  - PR validation for `dev`, `staging`, `main`
  - Frontend lint/build
  - Backend `sam validate` and `sam build`

- `.github/workflows/deploy.yml`
  - Branch-based SAM deployment
  - Uses GitHub OIDC to assume AWS role
  - Runs post-deploy smoke test: `/api/health`

- `.github/workflows/rollback.yml`
  - Manual rollback to a given git ref (tag or commit SHA)
  - Deploys selected ref and runs smoke test

## 3) GitHub environment configuration

Create these GitHub Environments:

- `dev`
- `staging`
- `production`

Set required reviewer approval for `production`.

For each environment, configure:

- Secret: `AWS_ROLE_TO_ASSUME`
  - IAM role ARN allowed for that environment deploy
- Variable: `AWS_REGION`
  - Example: `us-east-1`

## 4) AWS OIDC setup (required)

1. Add GitHub OIDC identity provider in AWS IAM:
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

2. Create deployment roles (recommended one per environment):
   - `flowboard-gha-deploy-dev`
   - `flowboard-gha-deploy-staging`
   - `flowboard-gha-deploy-prod`

3. Attach trust policy constrained to this repository and branch.

### Trust policy template

Replace `<ACCOUNT_ID>`, `<OWNER>`, `<REPO>`, and branch.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:ref:refs/heads/<BRANCH>"
        }
      }
    }
  ]
}
```

## 5) IAM permissions for deploy role

Deploy role requires least-privilege permissions for:

- CloudFormation stack operations
- S3 artifact bucket operations (SAM managed)
- Lambda, API Gateway, CloudWatch Logs, CloudWatch Alarms
- IAM role pass (for CloudFormation-managed roles)
- SSM read access for `/flowboard/<env>/*`

Scope resources to environment-specific names where possible.

## 6) Release procedure

1. Open PR to target branch and wait for CI checks.
2. Merge PR:
   - `dev` and `staging` deploy automatically.
   - `main` deploy requires `production` environment approval.
3. Confirm smoke test passes in workflow summary.
4. Optionally verify API endpoint manually.

## 7) Rollback procedure

Use `Rollback Serverless Backend` workflow:

1. Select target environment (`dev`, `staging`, or `prod`).
2. Enter stable `git_ref` (tag or commit SHA).
3. Run workflow and verify smoke test in summary.

Recommended: create release tags for known-good versions to simplify rollback.

## 8) Operational standards

- Never deploy directly from local machine to production.
- Always deploy through GitHub Actions for traceability.
- Protect `main` with required status checks.
- Keep production approvals enabled.
- Rotate IAM roles/secrets regularly and audit workflow access.
