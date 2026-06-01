# MASOOM HARDWARE — ERP + Website

Enterprise ERP and corporate website for **Masoom Hardware** (UAE building-materials trader).
Full UAE VAT compliance, multi-warehouse inventory, sales/purchase cycle with auto-generated PDFs (Invoice, Quotation, DO, LPO, Credit/Debit Note), CRM, accounts, and reporting.

## Repo layout (monorepo)

```
masoom/
├── backend/         # Node + Express + TypeScript + Prisma (REST API)
├── frontend/        # Next.js 15 + React 19 + Tailwind (Website + ERP UI)
├── shared/          # Shared TS types (DTOs, enums) consumed by both apps
├── docker/          # Dockerfiles + docker-compose
├── nginx/           # Reverse proxy config (prod)
├── scripts/         # DB seed, backup, deploy helpers
└── docs/            # ARCHITECTURE.md, ROADMAP.md, ERP_WORKFLOW.md, API.md
```

## Quick start (development)

```bash
# 1. Postgres
docker compose -f docker/docker-compose.dev.yml up -d postgres

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run dev          # http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

Default super admin (after seed): `admin@masoom.ae` / `Admin@12345`

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, security, scaling
- [Roadmap](docs/ROADMAP.md) — phased delivery plan
- [ERP workflow](docs/ERP_WORKFLOW.md) — Quotation → SO → Invoice → DO → Payment
- [API](docs/API.md) — REST endpoint reference
- [Database](docs/DATABASE.md) — schema notes and ER diagram

## Tech stack

| Layer       | Tech                                                        |
|-------------|-------------------------------------------------------------|
| Frontend    | Next.js 15 (App Router), React 19, Tailwind, GSAP, Framer   |
| Backend     | Node 20, Express 4, TypeScript 5, Zod                       |
| Database    | PostgreSQL 16                                               |
| ORM         | Prisma 5                                                    |
| Auth        | JWT (access + refresh), bcrypt, RBAC                        |
| PDF         | Puppeteer (server-side HTML → PDF)                          |
| Storage     | Local FS in dev / S3-compatible in prod                     |
| Jobs        | BullMQ + Redis (PDF generation, emails)                     |
| Deploy      | Docker, Nginx, PM2-ready                                    |

## Status

Phase 1 (foundation) — in progress. See [docs/ROADMAP.md](docs/ROADMAP.md).
