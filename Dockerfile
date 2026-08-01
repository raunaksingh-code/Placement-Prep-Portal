# Build from the repository root:  docker build -t placement-prep-api .
# The build context must be the repo root because the app reads seed content
# from ../data relative to the backend package.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /srv

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
# Authored seed content that ships with the app (aptitude topics, guides, mocks).
# Confidential JD and interview data is intentionally excluded - see README.
COPY data/seed_source/ data/seed_source/

WORKDIR /srv/backend

EXPOSE 8000

# Apply migrations, then serve. $PORT is provided by most hosts.
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
