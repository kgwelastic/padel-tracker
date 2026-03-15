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

| Resource | Service | Est. cost |
|---|---|---|
| App hosting | Azure App Service B1 (Linux, Docker) | ~13€/mo |
| Database | Azure Database for PostgreSQL Flexible Server (B1ms) | ~12€/mo |
| Container registry | Azure Container Registry Basic | ~5€/mo |
| **Total** | | **~30€/mo** |

CI/CD: GitHub Actions → `.github/workflows/azure-deploy.yml`

### Infrastructure as Code (Bicep)

```
infra/
  main.bicep           # Root — orchestrates all modules
  main.bicepparam      # Parameter file (non-secret values)
  deploy.sh            # Interactive first-time deploy script
  modules/
    acr.bicep          # Azure Container Registry
    postgres.bicep     # PostgreSQL Flexible Server + database + firewall
    appservice.bicep   # App Service Plan + Web App with env vars
```

**First deploy:**
```bash
# Install Azure CLI, then:
az login
bash infra/deploy.sh   # Creates resource group + all resources
```

**Update infrastructure:**
```bash
az deployment group create \
  --resource-group rg-padel-prod \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam \
  --parameters dbAdminPassword='...' nextAuthSecret='...' adminEmail='...' adminPassword='...'
```

**After infra deploy — run DB migrations on Azure:**
```bash
# Set DATABASE_URL to the Azure connection string, then:
npx prisma migrate deploy
```

Required GitHub secrets for CI/CD: `ACR_LOGIN_SERVER`, `ACR_USERNAME`, `ACR_PASSWORD`, `AZURE_APP_NAME`, `AZURE_PUBLISH_PROFILE`.

## Environment variables

See `.env.example` for all required variables.
