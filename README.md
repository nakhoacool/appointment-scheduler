# Appointment Scheduler API

A RESTful **vehicle service appointment booking** API built with Node.js, Express, TypeScript, and Prisma ORM (v7) backed by SQLite.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Configuration](#configuration)
- [Switching to MySQL / PostgreSQL](#switching-to-mysql--postgresql)
- [OpenAPI Spec](#openapi-spec)
- [AI Collaboration Narrative](#ai-collaboration-narrative)

---

## Features

- **JWT authentication** — register, login, per-request identity
- **Booking engine** — atomic availability check + insert inside a serializable transaction (no double-bookings)
- **Availability probe** — hourly slot query per dealership / service type / date
- **Persistent SQLite database** via Prisma ORM v7 with a driver adapter
- **Zod validation** on every request body / query string
- **Structured JSON logging** via Pino
- **OpenAPI 3.1 specification** at `docs/openapi.yaml`

---

## Architecture

The full architecture design — including requirements, component diagram, data-flow walkthrough, database schema, and key design decisions — is documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### High-Level Overview

The system is built as a **Modular Monolith** — a single deployable unit with strict internal module boundaries, making it straightforward to extract individual modules into services if scale demands it later.

| Layer | Technology |
|-------|------------|
| HTTP / Routing | Express + TypeScript |
| Validation | Zod (request bodies & query strings) |
| Authentication | JWT via `jose` |
| Business Logic | Domain use-cases (clean architecture) |
| Data Access | Prisma ORM v7 with driver adapter |
| Database | SQLite (dev) — portable to MySQL 8 / PostgreSQL |
| Logging | Pino (structured JSON) |

The booking flow guarantees **no double-bookings** by wrapping the availability check and appointment insert inside a single serializable database transaction. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full data-flow diagram and conflict-resolution path.

---

## Prerequisites

| Requirement | Version |
|-------------|----------|
| Node.js     | ≥ 20.19.0 |
| npm         | ≥ 10 |

No native build tools are required — the database driver (`@libsql/client`) ships prebuilt binaries.

---

## Quick Start

```bash
# 1. Clone / open the project
cd appointment-scheduler

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env and set JWT_SECRET to a strong random value

# 4. Generate Prisma Client
npm run db:generate

# 5. Run database migrations (creates dev.db)
npm run db:migrate

# 6. Seed reference data + test account
npm run db:seed

# 7. Start the development server (auto-restarts on file changes)
npm run dev
```

The server listens on **<http://localhost:3000>** by default.

---

## Build & Run for Production

```bash
# Compile TypeScript
npm run build

# Apply migrations against the production database
npx prisma migrate deploy

# Start the compiled server
npm start
```

---

## API Overview

### Base URL

```
http://localhost:3000
```

### Authentication

Protected endpoints require a `Bearer` JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Obtain a token from `POST /api/auth/register` or `POST /api/auth/login`.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/health` | No | Health check |
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Login → JWT |
| `GET`  | `/api/customers/me` | Yes | My profile |
| `GET`  | `/api/customers/me/vehicles` | Yes | My vehicles |
| `POST` | `/api/customers/me/vehicles` | Yes | Add vehicle |
| `GET`  | `/api/dealerships` | No | List dealerships |
| `GET`  | `/api/service-types` | No | List service types |
| `GET`  | `/api/dealerships/:id/availability` | No | Slot availability |
| `POST` | `/api/appointments` | Yes | Book appointment |
| `GET`  | `/api/appointments` | Yes | My appointments |
| `GET`  | `/api/appointments/:id` | Yes | Appointment detail |
| `PATCH`| `/api/appointments/:id/cancel` | Yes | Cancel appointment |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port |
| `NODE_ENV` | `development` | `production` disables pretty-print logs |
| `LOG_LEVEL` | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) |
| `DATABASE_URL` | `file:./dev.db` | SQLite file path (Prisma format) |
| `JWT_SECRET` | *<your_jwt_secret>* | **Must** be changed for production |

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Switching to MySQL / PostgreSQL

The data model is fully portable. To switch providers:

1. **Update `prisma/schema.prisma`**:

   ```prisma
   datasource db {
     provider = "mysql"   # or "postgresql"
   }
   ```

2. **Update `prisma.config.ts`** — set the connection URL:

   ```typescript
   import { defineConfig, env } from 'prisma/config'
   export default defineConfig({
     schema: 'prisma/schema.prisma',
     datasource: { url: env('DATABASE_URL') },
   })
   ```

3. **Swap the driver adapter in `src/db.ts`**:

   | Database   | Package                     | Adapter import                        |
   |------------|-----------------------------|---------------------------------------|
   | PostgreSQL | `@prisma/adapter-pg`, `pg`  | `import { PrismaPg } from '@prisma/adapter-pg'` |
   | MySQL      | `@prisma/adapter-mariadb`, `mariadb` | `import { PrismaMariaDb } from '@prisma/adapter-mariadb'` |

   ```typescript
   // PostgreSQL example
   import { PrismaPg } from '@prisma/adapter-pg'
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
   ```

4. **Set `DATABASE_URL`** in `.env` (e.g. `postgresql://user:pass@localhost:5432/scheduler`)

5. Re-run migrations: `npm run db:migrate`

> **Concurrency note:** MySQL 8 / PostgreSQL support `SELECT FOR UPDATE SKIP LOCKED`, enabling
> finer-grained row locks. The `isolationLevel: 'Serializable'` in `booking.service.ts` works for
> SQLite; on MySQL/PostgreSQL you can keep it or switch to row-level locking via raw queries.

---

## OpenAPI Spec

The full API contract is at [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.1).

While the server is running, endpoint exposes the spec directly:

| URL | Description |
|-----|-------------|
| `GET http://localhost:3000/docs` | Swagger UI (interactive browser) |

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run test` | Run the full test suite (59 tests) |
| `npm run test:watch` | Re-run tests on file change |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run db:generate` | Generate Prisma Client from schema |
| `npm run db:migrate` | Create & apply a new migration |
| `npm run db:seed` | Seed reference data + test account |
| `npm run db:reset` | Drop DB, re-migrate, re-seed |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## AI Collaboration Narrative

### Guiding Strategy

The AI (GitHub Copilot) was treated as a **pair programmer with broad technical knowledge but no project context** — it needed to be directed precisely rather than asked open-ended questions. The core strategy was to decompose the project into discrete, well-scoped tasks and issue each one as a focused prompt, rather than attempting to generate large chunks of code in a single pass.

Tasks were sequenced deliberately:

1. **Scaffolding first** — schema, migrations, and seed data established a working database foundation before any application code was written.
2. **Domain layer before infrastructure** — repository interfaces and Zod schemas were defined before wiring HTTP routes, so the AI worked outward from stable contracts.
3. **One concern per prompt** — each prompt addressed a single layer or feature (e.g., "implement the booking use-case with a serializable transaction", "add Zod validation to every route"), preventing the AI from making unasked-for structural changes elsewhere.
4. **Explicit constraints were stated upfront** — the target runtime version, the Prisma v7 driver-adapter pattern, the clean-architecture folder layout, and the no-double-booking requirement were all declared in the first prompt so the AI could not drift toward incompatible patterns.

### Verifying and Refining Output

Each AI-generated file went through a consistent review loop before being accepted:

| Step | What was checked |
|------|------------------|
| **Compile check** | `npm run build` — TypeScript errors surfaced missing types, incorrect imports, and API mismatches immediately |
| **Test run** | `npm run test` — the Vitest suite validated business rules (no double-booking, availability logic, JWT round-trips) against an in-memory SQLite database |
| **Manual path audit** | File paths (e.g. `__dirname`-relative paths for `docs/openapi.yaml`) were traced by hand to confirm they resolved correctly at runtime |
| **Security review** | SQL injection surface (Prisma parameterised queries only), JWT signing/verification, Zod strict-mode validation, and `httpOnly`-appropriate headers were verified against OWASP Top 10 |
| **Diff inspection** | Every suggested change was read line-by-line in the editor diff view before acceptance — no blind "accept all" |

When the AI produced incorrect output (e.g. a wrong relative path for the OpenAPI file, a Swagger UI URL that did not resolve correctly from the browser), the error was diagnosed precisely and fed back as a corrective prompt with the exact symptom and the expected behaviour, rather than asking the AI to "try again".

### Ensuring Final Quality

- **Tests as the acceptance gate** — no feature was considered done until all 59 tests passed. The suite covers auth, booking conflict prevention, availability slot calculation, and Zod schema validation.
- **TypeScript strict mode** — `"strict": true` in `tsconfig.json` meant the compiler caught any type unsoundness the AI introduced.
- **Layer isolation enforced** — the AI was corrected whenever it reached across layer boundaries (e.g. importing Prisma types directly into a use-case file). Repository interfaces in `src/domain/repositories/` stayed the only cross-layer contract.
- **Incremental commits** — each logical unit of work (schema, auth, booking, availability, reference data, Swagger UI) was committed separately, giving clear rollback points and making AI-generated diffs easy to audit in isolation.
- **README kept in sync** — documentation was updated alongside code rather than written once at the end, so any last-minute corrections to paths or commands were caught before the final push.
