# Appointment Scheduler API

A RESTful **vehicle service appointment booking** API built with Node.js, Express, TypeScript, and Prisma ORM (v7) backed by SQLite.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Configuration](#configuration)
- [Switching to MySQL / PostgreSQL](#switching-to-mysql--postgresql)
- [OpenAPI Spec](#openapi-spec)

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
