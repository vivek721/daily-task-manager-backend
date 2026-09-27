# Daily Task Manager - Backend

A REST API for a daily task manager, built with Node.js, Express 5 and TypeScript on PostgreSQL. Users sign in with Google OAuth 2.0 or a username/password, receive a JWT, and manage their tasks through a "today" view, an overdue ("old") view with bulk actions, and soft delete with restore. The API also includes a rule-based assignment engine that routes new tasks to worker profiles ("subagents") by type, specialization, capabilities and current load.

Frontend (React 18 + TypeScript + Redux Toolkit): [vivek721/daily-task-manager-frontend](https://github.com/vivek721/daily-task-manager-frontend)

## Features

- **Google OAuth 2.0** via Passport (`passport-google-oauth20`). On success the API signs a JWT and redirects to the frontend with it.
- **Local accounts**: sign up and sign in with username/password; passwords hashed with bcrypt (12 rounds).
- **JWT bearer auth** middleware that verifies the token and checks that the user still exists.
- **Per-user data**: every task query, and every subagent assignment query, is filtered by the signed-in user's ID. Another user's task returns 404.
- **Task CRUD** with priority (`low`/`medium`/`high`), due date, category and tags; list filtering by `completed`, `priority`, `category`, plus `limit`/`offset` pagination.
- **Daily views**: today's tasks (sorted by due today, then priority), overdue tasks, and bulk actions on overdue tasks (complete all, delete all, delete completed).
- **Soft delete**: deleted tasks can be listed, restored, or permanently removed. `scripts/cleanup-deleted-tasks.js` purges tasks soft-deleted more than a day ago.
- **Rule-based task assignment**: when a task is created, assignment rules (`equals`, `contains`, `starts_with`, `ends_with`, `matches_regex` on task fields) are evaluated in priority order and the task is assigned to an eligible subagent. PostgreSQL triggers keep each subagent's load and busy/active status up to date.
- **Request validation** for task payloads and task IDs (UUID format).
- **Security middleware**: Helmet headers, CORS restricted to `FRONTEND_URL` with credentials, parameterized SQL queries throughout.
- **Operations**: `/health` endpoint, centralized error handler, Morgan request logging, and a Docker image that runs as a non-root user with a container `HEALTHCHECK`.

## Tech stack

| Area | Tools |
|------|-------|
| Runtime / framework | Node.js 18+, Express 5, TypeScript 5 (strict mode) |
| Database | PostgreSQL via `pg` (connection pool, raw parameterized SQL) |
| Auth | Passport + Google OAuth 2.0, `jsonwebtoken`, `bcryptjs`, `express-session` |
| Security / logging | Helmet, CORS, Morgan |
| Testing | Jest, ts-jest, Supertest |
| Code quality | ESLint (`@typescript-eslint`, `eslint-plugin-security`), Prettier |
| Delivery | Docker, GitHub Actions |

## Architecture

```
src/
├── index.ts                 # App setup: middleware, routes, DB init, server start
├── config/
│   ├── database.ts          # pg Pool + creates the tasks table on startup
│   └── passport.ts          # Google OAuth strategy, session (de)serialization
├── routes/                  # authRoutes, taskRoutes, subagentRoutes
├── controllers/             # Request handlers for auth, tasks, subagents
├── models/                  # SQL data access: User, Task, Subagent
├── middleware/              # auth (JWT), validation, errorHandler
├── types/                   # Shared TypeScript interfaces
└── __tests__/               # Jest tests
scripts/cleanup-deleted-tasks.js   # Purges expired soft-deleted tasks
init-subagents.sql                 # Subagent / assignment tables, triggers, seed data
```

Layering is routes -> controllers -> models, where models are classes that run SQL against a shared `pg` pool.

**Google sign-in flow**

1. The frontend sends the browser to `GET /api/auth/google`.
2. Google redirects back to `GET /api/auth/google/callback`. Passport finds or creates the user by Google ID and refreshes their name, email and picture.
3. The API signs a JWT (`userId`, `email`, `name`; default expiry 7 days) and redirects to `${FRONTEND_URL}/auth/callback?token=<jwt>`.
4. The frontend sends `Authorization: Bearer <jwt>` on later requests. `authenticateToken` verifies the token, loads the user, and attaches it to `req.user`.

Local sign-up and sign-in return the same kind of JWT in the JSON response.

## API endpoints

"JWT" means the endpoint needs an `Authorization: Bearer <token>` header.

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/google` | - | Start Google OAuth |
| GET | `/google/callback` | - | OAuth callback; redirects to frontend with JWT |
| POST | `/signup` | - | Create a local account (`username`, `email`, `name`, `password`) and return a JWT |
| POST | `/signin` | - | Sign in with `username` and `password` and return a JWT |
| POST | `/verify` | Bearer token | Check a token and return its decoded user |
| GET | `/profile` | JWT | Current user's profile |
| POST | `/logout` | - | Ends the Passport session |
| POST | `/dev-login` | - | Development only: finds or creates a local `dev-user` account (no password) and returns a JWT for it. Returns 404 unless `NODE_ENV=development` |

### Tasks (`/api/tasks`), all JWT

Every endpoint only sees and changes the signed-in user's tasks. A task ID that belongs to someone else gets the same 404 as a missing one.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List tasks (query: `completed`, `priority`, `category`, `limit`, `offset`) |
| POST | `/` | Create a task (runs auto-assignment) |
| GET | `/:id` | Get one task |
| PUT | `/:id` | Update a task |
| DELETE | `/:id` | Soft delete a task |
| PATCH | `/:id/toggle` | Toggle completion |
| PATCH | `/:id/restore` | Restore a soft-deleted task |
| DELETE | `/:id/permanent` | Permanently delete a task |
| GET | `/:id/history` | Change history for one task |
| GET | `/today` | Today's tasks |
| GET | `/old` | Overdue tasks |
| PATCH | `/old/complete-all` | Mark all overdue tasks complete |
| DELETE | `/old/all` | Soft delete all overdue tasks |
| DELETE | `/old/completed` | Soft delete completed overdue tasks |
| GET | `/deleted` | List soft-deleted tasks |
| GET | `/expiring` | Soft-deleted tasks within 2 hours of purge |
| GET | `/history/all` | Change history across your tasks, grouped by task (most recently updated first) |
| POST | `/cleanup` | Permanently delete your tasks that were soft-deleted more than a day ago |

### Subagents (`/api/subagents`), all JWT

Subagents and assignment rules have no owner. They are shared configuration, so any signed-in user can read and change them. Assignment endpoints are per user: you can only assign, auto-assign, list or update assignments of your own tasks, and assignment listings only include your tasks. `/stats` reports load and assignment counts across all users.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List subagents |
| POST | `/` | Create a subagent |
| GET | `/stats` | Load and assignment statistics |
| GET | `/:id` | Get a subagent |
| PUT | `/:id` | Update a subagent |
| DELETE | `/:id` | Delete a subagent |
| GET | `/:subagentId/assignments` | A subagent's assignments |
| POST | `/assign/:taskId/:subagentId` | Assign a task manually |
| POST | `/auto-assign/:taskId` | Run the assignment rules for a task |
| GET | `/assignments/task/:taskId` | A task's assignments |
| GET | `/assignments/history` | Recent assignment history |
| PATCH | `/assignments/:assignmentId/status` | Update an assignment's status |
| GET | `/rules/all` | List assignment rules |
| POST | `/rules` | Create an assignment rule |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | - | Returns `success`, `message`, `timestamp`, `environment` |

## Getting started

### Prerequisites

- Node.js 18 or later
- PostgreSQL 13 or later (the schema uses the built-in `gen_random_uuid()`)
- A Google Cloud project with an OAuth 2.0 client (only needed for Google sign-in)

### 1. Install

```bash
git clone https://github.com/vivek721/daily-task-manager-backend.git
cd daily-task-manager-backend
npm install
cp .env.example .env
```

### 2. Configure environment variables

These are the variables the code reads:

| Variable | Used for | Default if unset |
|----------|----------|------------------|
| `PORT` | HTTP port | `3001` |
| `NODE_ENV` | `production` makes session cookies secure; `development` enables `/dev-login` and adds stack traces to error responses | `development` (but `/dev-login` requires it to be set explicitly) |
| `FRONTEND_URL` | CORS origin and OAuth redirect target | `http://localhost:5173` for CORS; OAuth redirects need it set |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection used by the API | `localhost`, `5432`, `daily_task_manager`, `postgres`, `password` |
| `DATABASE_URL` | Used only by `scripts/cleanup-deleted-tasks.js` (falls back to the `DB_*` values) | - |
| `JWT_SECRET` | Signing and verifying JWTs | **required** |
| `JWT_EXPIRE` | JWT lifetime | `7d` |
| `SESSION_SECRET` | express-session signing | insecure placeholder, so always set it |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client | **required** (the Google strategy is registered at startup) |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | `/api/auth/google/callback` |

`.env.example` also lists `BCRYPT_ROUNDS`, `JWT_EXPIRES_IN`, `RATE_LIMIT_*`, `LOG_LEVEL` and `LOG_FORMAT`. The code does not read them yet. Use `JWT_EXPIRE`, not `JWT_EXPIRES_IN`, to change token lifetime.

### 3. Set up Google OAuth

1. In the [Google Cloud Console](https://console.cloud.google.com/), open **APIs & Services -> OAuth consent screen** and configure it. Add your account as a test user while the app is in testing.
2. Go to **Credentials -> Create credentials -> OAuth client ID** and choose **Web application**.
3. Add the authorized redirect URI `http://localhost:3001/api/auth/google/callback`, or your own `GOOGLE_CALLBACK_URL`.
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. Set `FRONTEND_URL` to the frontend origin. The frontend must handle the `/auth/callback?token=...` route.

### 4. Set up the database

```bash
createdb daily_task_manager
```

On startup, the API creates the `tasks` table (with indexes and an `updated_at` trigger) if it does not exist. Some objects are **not** created automatically, so set these up before using the related endpoints:

- a `users` table with the columns in `src/models/User.ts`: `id` UUID, `google_id`, `email`, `name`, `picture`, `username`, `password_hash`, `auth_type`, `created_at`, `updated_at`, `last_login`
- `user_id` and `deleted_at` columns on `tasks`
- the `get_task_history(task_id, limit)` function, used by the history endpoints
- the `expiring_deleted_tasks` view, used by `/expiring`; it must expose the task `id` (used to filter to the caller's tasks) and `hours_until_expiry`
- the `cleanup_expired_deleted_tasks()` function, used by `scripts/cleanup-deleted-tasks.js`
- the subagent tables: run `psql -d daily_task_manager -f init-subagents.sql` **after** the API has started once, because the script depends on `tasks` and `update_updated_at_column()`

### 5. Run

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start with nodemon + ts-node |
| `npm run build` | Clean `dist/` and compile TypeScript |
| `npm start` | Run the compiled app (`dist/index.js`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `npm run lint:fix` | ESLint (type-aware) on every `.ts` file under `src/`, tests included. Errors fail; warnings don't |
| `npm run format` / `npm run format:check` | Prettier on `src/`. Prettier owns formatting; ESLint has no style rules |
| `npm test` / `npm run test:watch` / `npm run test:coverage` / `npm run test:ci` | Jest |
| `npm run ci` | typecheck, lint, test:ci, build |
| `npm run docker:build` / `npm run docker:run` | Build and run the Docker image |

```bash
npm run dev
curl http://localhost:3001/health
```

`package.json` also defines `migrate` and `seed` scripts, but the files they point to (`dist/scripts/migrate.js`, `dist/scripts/seed.js`) are not in the repo, so these scripts don't work yet.

### Docker

The `Dockerfile` uses `node:18-alpine`. It compiles the TypeScript, prunes dev dependencies, runs as a non-root `nodejs` user, exposes port 3001 and defines a `HEALTHCHECK` that calls `/health`. There is no Compose file and no bundled database, so point the container at your own PostgreSQL:

```bash
npm run docker:build
docker run --env-file .env -p 3001:3001 daily-task-manager-backend
# If Postgres runs on the host, set DB_HOST=host.docker.internal in .env
```

## Tests

Jest + ts-jest with Supertest. `src/__tests__/setup.ts` loads `.env.test`. The tests mock the database, so no PostgreSQL is needed.

```
src/__tests__/
├── setup.ts
├── health.test.ts                        # /health response shape
├── controllers/
│   ├── taskController.test.ts            # getAllTasks / getTodaysTasks with a mocked TaskModel
│   ├── taskOwnership.test.ts             # every task handler passes the user ID; other users' tasks give 404
│   ├── subagentController.test.ts        # /api/subagents requires a token; assignments are owner-only
│   └── devLogin.test.ts                  # dev-login is development-only and its token passes authenticateToken
└── models/
    ├── Task.test.ts                      # generated SQL binds user_id; update ignores non-updatable columns
    └── Subagent.test.ts                  # JSONB rule columns, rule matching
```

Coverage is still low (about 40% of statements). `jest.config.js` sets the global threshold to 30% statements, 25% branches, 40% functions and 30% lines, just under what the suite reaches, so `npm run test:ci` passes. Raise it as tests are added.

## CI / GitHub Actions

Workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` (Continuous Integration) | push / PR to `main`, `develop` | Typecheck + build, ESLint + Prettier check, Jest against a Postgres 15 service (uploads coverage to Codecov), Docker build + smoke test (runs the image against a throwaway Postgres 15 service and checks `/health` and a 401 from `/api/tasks`), `npm audit` + CodeQL, SQL init-script check |
| `deploy.yml` (Deploy to Production) | push to `main`, `v*` tags, manual | Builds a multi-arch image and pushes it to GHCR. The staging and production deploy steps are placeholders. |
| `quality.yml` (Code Quality & Performance) | push / PR to `main`, `develop`, weekly | SonarCloud scan (skipped unless the `SONAR_TOKEN` secret is set; `sonar-project.properties` also needs a real organization), Artillery load test of `/health`, complexity and build-size reports |
| `dependency-update.yml` (Dependency Updates) | weekly, manual | `npm audit` / `npm outdated` report. When started manually, it opens a PR with minor dependency updates. |

The `ci.yml` checks that can run locally all pass: typecheck, build, lint (0 errors), `format:check`, `test:ci` (with coverage thresholds) and `npm audit --audit-level=moderate` (0 vulnerabilities). The Docker smoke test, CodeQL and the `quality.yml` jobs need GitHub Actions and have not been run yet.

## Known limitations

- The database schema is only partly bootstrapped by the app (see [Set up the database](#4-set-up-the-database)), and there is no migration tool yet.
- There are no roles. Any signed-in user can create, edit and delete the shared subagents and assignment rules.
- `/history/all` returns history grouped by task, not globally sorted by change time, because `get_task_history()`'s output columns are defined outside this repo.
- There is no rate limiting.

## Roadmap (not yet built)

- Migrations for the full schema (users, soft delete, history functions)
- An admin role for managing subagents and assignment rules
- Rate limiting and use of the `BCRYPT_ROUNDS` / logging settings from `.env.example`
- Broader test coverage (auth, validation, models)

## License

MIT. See [LICENSE](LICENSE).
