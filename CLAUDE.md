# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stitch AI Academy Portal — a full-stack LMS (Learning Management System) built for Four Js Development Tools. Backend: Node.js/Express. Frontend: vanilla JS + Tailwind CSS. Database: PostgreSQL via Prisma ORM. File storage: Cloudflare R2.

## Commands

```bash
# Start the server
node server.js

# Run all tests
cross-env NODE_ENV=test jest

# Run a single test file
cross-env NODE_ENV=test jest server/tests/auth.test.js

# Format code (Prettier)
npm run format

# Regenerate Prisma client after schema changes
npx prisma generate

# Apply database migrations
npx prisma migrate dev
```

## Architecture

### Entry Points
- `server.js` — starts the Express server
- `server/app.js` — configures middleware, mounts all API routes, and serves static files with JWT protection

### Route Protection Pattern
`server/app.js` intercepts requests to `app/*.html` pages (except `/login.html`, `/index.html`, `/ui-kit.html`, `/success.html`) and verifies a JWT cookie before serving them. All `/api/*` routes use `server/middleware/auth.js` (`authenticateToken`, `requireAdmin`).

### API Routes (mounted in app.js)
| Prefix | File | Purpose |
|---|---|---|
| `/api/auth` | `server/routes/auth.js` | Login/logout, JWT via HTTP-only cookie |
| `/api/users` | `server/routes/users.js` | User CRUD, password reset |
| `/api/tracks` | `server/routes/tracks.js` | Learning track management |
| `/api/modules` | `server/routes/modules.js` | Module CRUD and sequencing |
| `/api/progress` | `server/routes/progress.js` | Enrollment and progress tracking |
| `/api/upload` | `server/routes/upload.js` | File uploads to Cloudflare R2 via Multer |
| `/api/admin` | `server/routes/admin.js` | Admin-only analytics and operations |
| `/api/notifications` | `server/routes/notifications.js` | User notifications |

### Database Models (Prisma)
`User` → `Enrollment` ← `Track` → `Module`; `User` → `UserMilestone`; `User` → `Notification`

Roles: `LEARNER` (default), `ADMIN`. Registration is admin-only — there is no public sign-up flow.

### Frontend
Pages live in `app/`. `app/components.js` is a large (~229KB) file containing all reusable UI components as JS functions that render HTML strings. Styling uses Tailwind (configured in `app/tailwind-config.js`) plus `app/shared.css`.

## Environment Variables

Copy `.env.example` to `.env`. Required variables:
```
PORT=3000
DATABASE_URL="postgres://user:password@localhost:5432/dbname"
JWT_SECRET="your_jwt_secret_here"
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
```

## Code Style

Prettier enforces: 120-char line width, 4-space tabs, single quotes, no trailing commas, LF line endings. Pre-commit hooks run Prettier automatically via Husky + lint-staged on staged `app/**` and `server/**` files.
