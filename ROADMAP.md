# Real Estate App — Roadmap

> Track work using the GitHub labels: `backlog` · `in progress` · `review` · `done`
> 
> Move issues between columns by updating their labels.
> 
> Once the GitHub Projects board is created (see below), all issues will appear there automatically.

---

## Backlog

| # | Issue | Domain | Assignee |
|---|-------|--------|----------|
| [#1](../../issues/1) | [Frontend] Setup Next.js base layout and routing | `frontend` | — |
| [#2](../../issues/2) | [Auth] Implement JWT authentication flow | `backend` | — |
| [#3](../../issues/3) | [Property] CRUD API with image upload | `backend` | — |
| [#4](../../issues/4) | [Search] FastAPI search with filters | `backend` | — |
| [#5](../../issues/5) | [Infra] Configure NGINX reverse proxy | `devops` | — |
| [#6](../../issues/6) | [Infra] Setup GitHub Actions CI/CD pipeline | `devops` | — |
| [#7](../../issues/7) | [DB] Design PostgreSQL schema with Prisma | `database` | — |

## In Progress

_No issues in progress yet._

## Review

_No issues in review yet._

## Done

_No issues completed yet._

---

## Creating the GitHub Projects Board

To create the full visual kanban board:

1. Go to https://github.com/naderdelyani/real-estate-app/projects
2. Click **"Link a project"** → **"New project"**
3. Choose **"Board"** layout
4. Name it: `Real Estate App Roadmap`
5. Add columns: `Backlog` → `In Progress` → `Review` → `Done`
6. Click **"Add item"** and add issues #1–#7 to the **Backlog** column

---

## Adding GitHub Actions Workflows

The CI/CD workflow files require a GitHub token with `workflow` scope to push programmatically.

**Steps:**
1. Go to https://github.com/settings/tokens
2. Edit your token and add the `workflow` scope
3. Run:
```bash
git clone https://YOUR_TOKEN@github.com/naderdelyani/real-estate-app.git
cd real-estate-app
git checkout develop

# The workflow files are already staged in /tmp/real-estate-app
# Copy them, or re-create with content from Issue #6

git add .github/workflows/
git commit -m "feat(ci): add GitHub Actions CI/CD workflows"
git push origin develop
```

The three workflow files to create:
- `.github/workflows/ci.yml` — runs on every PR to `main`/`develop`
- `.github/workflows/deploy-staging.yml` — deploys on push to `develop`
- `.github/workflows/deploy-prod.yml` — deploys on push to `main`

Full workflow content is documented in [Issue #6](../../issues/6).
