# Placement Prep Portal

A placement preparation portal for PGDM students: aptitude learning and practice,
timed mock tests, job descriptions with role-specific prep plans, a company-wise
interview question bank, interview-round guides, and progress tracking.

## Modules

| Module | What it does |
|---|---|
| **Aptitude** | 45 topics across Quant, Reasoning and Verbal — study material, solved examples, practice questions and a timed test per topic |
| **Mock Tests** | Full-length papers (all three sections) and sectional tests, timed, with negative marking and section-wise scoring |
| **Companies & JDs** | Browse job descriptions by company and role; each JD gets a prep plan of the aptitude topics that matter for that role category |
| **Question Bank** | Real interview questions, filterable by company, role, round and type |
| **Interview Prep** | Guides for HR, resume, GD, technical, guesstimates and cases, each paired with the real questions for that round |
| **Progress** | Accuracy, syllabus coverage, section performance, weakest topics and attempt history |

## A note on source data

Some of the material this portal was built from is **confidential and is not in
this repository**:

- **Company job descriptions** — shared with the institute by recruiters for a
  specific batch. Not ours to redistribute.
- **The interview question tracker** — interview experiences contributed by
  named students.
- **`CampusRecruitmentBook.pdf`** — a copyrighted commercial publication.

These are gitignored. The app degrades gracefully without them: the aptitude
module, mock tests and interview guides all work, while the JD and question-bank
sections will simply be empty.

To populate those sections locally, place your own copies at:

```
data/seed_source/JDs/<Company>/<Role>.pdf
data/seed_source/<name> Question Tracker.xlsx
CampusRecruitmentBook.pdf
```

then run the extractor before seeding:

```bash
cd backend && ./venv/Scripts/python -m app.seed.extract_jd
```

## Local setup

**Backend** (Python 3.11+):

```bash
cd backend && python -m venv venv && ./venv/Scripts/pip install -r requirements.txt
```

Create the database and load content — this applies migrations automatically:

```bash
cd backend && ./venv/Scripts/python -m app.seed.seed
```

Run it:

```bash
cd backend && ./venv/Scripts/python -m uvicorn app.main:app --port 8000 --reload
```

**Frontend** (Node 20+):

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to port 8000, so no
frontend configuration is needed locally.

## Database migrations

The schema is owned by Alembic; the app does not create tables. See
[`backend/alembic/README`](backend/alembic/README) for the full workflow.

```bash
cd backend && ./venv/Scripts/alembic upgrade head
```

## Deployment

The frontend is static and goes to GitHub Pages. **The backend cannot run on
GitHub Pages** — it needs a Python host and a database.

### Backend (Render)

1. New → Blueprint, point Render at this repo. [`render.yaml`](render.yaml)
   provisions the web service and a Postgres database.
2. Render generates `SECRET_KEY` and wires `DATABASE_URL` automatically.
3. Set `CORS_ORIGINS` to your Pages origin, e.g. `https://<user>.github.io`.
4. Migrations run on each deploy via `preDeployCommand`.
5. Seed content once from the Render shell: `python -m app.seed.seed`.

A `Dockerfile` is included if you prefer a container host — build from the repo
root, not from `backend/`.

### Frontend (GitHub Pages)

Set a repository variable (Settings → Secrets and variables → Actions →
Variables):

```
VITE_API_BASE_URL = https://your-api-host.onrender.com
VITE_GOOGLE_CLIENT_ID = your-oauth-client-id.apps.googleusercontent.com
```

Pushing to `main` then builds and deploys. The workflow fails fast if that
variable is missing, rather than shipping a site whose every API call 404s.

### Production environment variables

| Variable | Required | Notes |
|---|---|---|
| `ENVIRONMENT` | yes | Set to `production`. The app refuses to start with the default `SECRET_KEY` when set. |
| `SECRET_KEY` | yes | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `DATABASE_URL` | yes | `postgres://` and `postgresql://` are rewritten to the psycopg driver automatically |
| `CORS_ORIGINS` | yes | Comma-separated origins |
| `GOOGLE_CLIENT_ID` | no | OAuth client ID from the Google Cloud Console. Must match the frontend's `VITE_GOOGLE_CLIENT_ID`; leave both unset to hide the "Sign in with Google" button. |
| `ADMIN_EMAILS` | no | Comma-separated emails promoted to admin on next sign-in. Only needed to bootstrap the first admin - further admins are granted from the admin page. |

## Stack

FastAPI · SQLAlchemy 2 · Alembic · Postgres (SQLite locally) · React 19 ·
TypeScript · Vite · Tailwind
