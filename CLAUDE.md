# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Padel Tracker — full-stack web app for tracking results of amateur monthly padel tournaments. Built with Next.js 15, TypeScript, Prisma, PostgreSQL, and NextAuth.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx prisma migrate dev --name <name>   # Create and apply migration
npx prisma migrate deploy              # Apply migrations in production
npx prisma studio                      # Open Prisma Studio (DB GUI)
npx prisma db push                     # Push schema changes without migration file (dev only)
npx prisma generate                    # Regenerate Prisma client after schema change
```

## Architecture

### Stack
- **Next.js 15** (App Router, `src/` dir, `standalone` output for Docker)
- **Prisma** ORM with **PostgreSQL** (Azure Database for PostgreSQL in production)
- **NextAuth.js** — credentials-based auth, JWT sessions, admin-only write access
- **Tailwind CSS** for styling

### App Router structure
```
src/app/
  page.tsx                        # Public homepage
  login/page.tsx                  # Admin login page
  (public)/                       # Route group — public pages (no auth)
    ranking/page.tsx              # Aggregated player ranking
    tournaments/                  # Tournament list + detail
  (admin)/admin/                  # Route group — admin-only pages
    players/                      # CRUD: players
    tournaments/                  # CRUD: tournaments
    matches/                      # Enter match results
  api/auth/[...nextauth]/route.ts # NextAuth handler
  api/                            # Other API routes
```

### Key files
- `src/lib/prisma.ts` — singleton Prisma client (prevents connection pool exhaustion in dev)
- `src/lib/auth.ts` — NextAuth config; admin credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

### Data model (Prisma)
- `Player` — tournament participants
- `Tournament` — monthly tournament (date, location)
- `Match` — match within a tournament; references Player×2 and belongs to Tournament
- `Set` — individual set scores (player1Score / player2Score) belonging to a Match
- `RankingEntry` — pre-computed per-player stats per tournament (points, wins, losses, sets); aggregate on the ranking page at query time

### Auth flow
- Public routes (`/`, `/ranking`, `/tournaments`) — no auth required
- Admin routes (`/admin/*`) — require JWT session with `role: "admin"`
- Login via `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars (simple credentials, no DB user lookup)

## Deployment — Azure

| Resource | Service |
|---|---|
| App hosting | Azure App Service (Linux, Docker container) |
| Database | Azure Database for PostgreSQL Flexible Server |
| Container registry | Azure Container Registry (ACR) |
| CI/CD | GitHub Actions → `.github/workflows/azure-deploy.yml` |

Required GitHub secrets: `ACR_LOGIN_SERVER`, `ACR_USERNAME`, `ACR_PASSWORD`, `AZURE_APP_NAME`, `AZURE_PUBLISH_PROFILE`.

Required App Service environment variables (set in Azure Portal): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

Azure PostgreSQL connection string format:
```
postgresql://USER:PASSWORD@SERVER.postgres.database.azure.com:5432/padel_tracker?sslmode=require
```

## Environment variables

See `.env.example` for all required variables.
