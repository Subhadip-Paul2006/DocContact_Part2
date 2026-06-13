# DocContact (ZEN Doctor) — Run Book

This file is the canonical run-book. README.md has the full product spec; this
is the operational cheat-sheet.

## 1) First time

```bash
# from repo root
cp .env.example .env                  # already done by setup
cp .env.example frontend/.env.local   # already done by setup

# install deps in all three trees
npm install --prefix backend
npm install --prefix frontend
npm install                           # root (only prisma + dotenv)
```

## 2) Postgres

Two options:

**A — Docker (preferred).** `docker compose up -d` from the repo root.
This starts `zen-doctor-pg` on host port `55432`, matching `DATABASE_URL`.

**B — Local install.** Install Postgres 16+ locally and create the matching
role/db:

```sql
CREATE USER zen WITH PASSWORD 'zen';
CREATE DATABASE zen_doctor OWNER zen;
```

If your local Postgres is on a different port, edit `DATABASE_URL` in `.env`
and `frontend/.env.local`.

## 3) Migrate + seed

```bash
# from repo root
npm run prisma:gen:backend     # generate backend prisma client
npm run prisma:gen:frontend    # generate frontend prisma client
npm run migrate:deploy         # apply migrations
npm --prefix backend run seed  # seed users + doctors
```

Or in dev:
```bash
npm run migrate:dev            # apply + create a new migration if schema changes
```

## 4) Run

In **two terminals**:

```bash
# terminal 1 — backend (Express, port 3000, hosts the in-process simulator)
npm run dev:backend

# terminal 2 — frontend (Next.js, port 3000 by default in .env)
npm run dev:frontend
```

Note: both the backend and the Next.js server default to port 3000. To run
them at the same time, either:
- run the frontend on `PORT=3001` and proxy `/api` calls to the backend, OR
- run only the frontend (the frontend has its own `/api/*` route handlers and
  is the primary surface for the UI), OR
- run the backend on `PORT=4000` and update the frontend's fetch URLs.

The simplest setup for local UI dev is just the frontend:

```bash
npm run dev:frontend
```

It works standalone — the in-process simulator in `frontend/src/instrumentation.ts`
keeps the queue moving on its own.

## 5) Test credentials

After seeding:

- Patient: `patient@gmail.com` / `password123`
- Doctor: `doctor@zoomdoctor.in` / `password123`

## 6) Cron on Vercel

`frontend/vercel.json` fires `/api/internal/simulator/tick` every minute. On
Vercel, set `QUEUE_SIMULATOR_DISABLED=1` in the project's env vars so the
in-process 25s timer doesn't double-advance the queue.

## 7) Without docker (truly offline dev)

If you cannot run docker and have no local Postgres, the UI still boots but
DB-backed routes will 500. Use this only for static UI work.
