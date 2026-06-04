# MASOOM HARDWARE — ERP: Complete Handover & Deployment Guide

Everything about this project in one place: what it is, how to run it, every
environment variable, how it's deployed to the cloud, other hosting options,
costs, and day‑to‑day operations.

---

## 1. What this is

A **UAE‑compliant accounting / ERP system** for Masoom Hardware. ERP‑only — when you
open the site it goes **straight to the login page** (no public marketing website).

**Full document flow, all with VAT and printable PDFs:**

- **Sales:** Quotation → Sales Order → Tax Invoice → Delivery Order → Credit Note → Receipt
- **Purchases:** LPO → Goods Received (GRN) → Purchase Invoice → Debit Note → Supplier Payment
- **Finance:** VAT Return (FTA‑style), Profit & Loss, Aging (30/60/90), Customer & Supplier Ledgers, Expenses
- **Inventory:** live stock per warehouse, adjustments, transfers, valuation
- **Admin:** company settings, users & roles (RBAC)

Every document gets an **auto number** (e.g. `INV/26/000123`) and a **server‑generated PDF**
with an FTA QR code on tax invoices.

---

## 2. Live URLs & login (current cloud demo on Render)

| What | URL |
|------|-----|
| **App (open this)** | https://masoom-web.onrender.com |
| Backend API (internal) | https://masoom-api.onrender.com/api/health |
| Source code (GitHub) | https://github.com/abbasbugadwala5-ui/Masoom-Hardware |

**Login:** `admin@masoom.ae`  /  `Admin@12345`  ← change this in production (see §12).

> Free Render services **sleep after ~15 min idle** — the first request then takes
> ~30–50 seconds to wake up. Normal for the free tier.

---

## 3. Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind, TanStack Query, Zustand |
| Backend | Node 20, Express 4, TypeScript 5, Zod |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Auth | JWT (access + httpOnly refresh cookie), bcrypt, role‑based permissions |
| PDF | puppeteer‑core + system Chromium (server‑rendered HTML → PDF) |
| Deploy | Docker, Render Blueprint (`render.yaml`) |

---

## 4. Repo structure

```
MASOOM/
├── backend/            Express + Prisma REST API
│   ├── prisma/         schema.prisma + migrations + seed.ts
│   └── src/
│       ├── modules/    auth, customers, suppliers, products, sales/*,
│       │               purchases/*, payments, inventory, reports,
│       │               settings, accounts (expenses), pdf, numbering
│       ├── middleware/  auth (RBAC), validate (zod), error, rateLimit
│       └── utils/       vat math, words (amount-in-words), errors, pagination
├── frontend/           Next.js ERP UI
│   └── src/app/erp/    all ERP screens (sales-orders, quotations, invoices,
│                       deliveries, credit-notes, receipts, purchase-invoices,
│                       grns, debit-notes, payments, inventory, reports, vat,
│                       accounts, settings, customers, suppliers, products, users)
│   └── src/app/api/[...path]/route.ts   runtime proxy → backend
├── docker/             backend.Dockerfile, frontend.Dockerfile, compose files
├── render.yaml         Render Blueprint (one-click cloud deploy)
├── nginx/              reverse-proxy config (for VPS deploys)
└── docs/               ARCHITECTURE, API, ERP_WORKFLOW, ROADMAP, DATABASE
```

---

## 5. Environment variables

### Backend (`backend/.env`)
| Variable | Example / default | Notes |
|----------|-------------------|-------|
| `NODE_ENV` | `development` / `production` | |
| `PORT` | `4000` | Render injects its own `PORT`; the app respects it |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/masoom` | **required** |
| `JWT_ACCESS_SECRET` | (random ≥16 chars) | **required** |
| `JWT_REFRESH_SECRET` | (random ≥16 chars) | **required** |
| `JWT_ACCESS_TTL` | `15m` | |
| `JWT_REFRESH_TTL` | `30d` | |
| `COOKIE_SECURE` | `false` local / **`true`** in cloud | `true` ⇒ refresh cookie uses SameSite=None (needed across domains) |
| `COOKIE_DOMAIN` | `localhost` | leave default unless on one shared domain |
| `CORS_ORIGINS` | `http://localhost:3000` | only matters if the browser calls the API directly; the cloud setup proxies, so not needed |
| `STORAGE_LOCAL_PATH` | `./storage` | where PDFs are cached |
| `SEED_ADMIN_EMAIL` | `admin@masoom.ae` | first admin created by seed |
| `SEED_ADMIN_PASSWORD` | `Admin@12345` | **change in production** |
| `PUPPETEER_EXECUTABLE_PATH` | (auto) | set automatically in Docker to `/usr/bin/chromium` |

### Frontend
| Variable | Used where | Notes |
|----------|-----------|-------|
| `NEXT_PUBLIC_API_URL` | local dev (`.env.local`) | e.g. `http://localhost:4000` |
| `BACKEND_URL` | **cloud** | the API proxy reads this at runtime, e.g. `https://masoom-api.onrender.com` |

> **Secrets are never committed** — `.env` is git‑ignored. Only `.env.example` is in the repo.

---

## 6. Run locally

```bash
# 0. Clone
git clone https://github.com/abbasbugadwala5-ui/Masoom-Hardware.git
cd Masoom-Hardware

# 1. Postgres (Docker) — or use a local Postgres
docker compose -f docker/docker-compose.dev.yml up -d postgres

# 2. Backend
cd backend
cp .env.example .env          # then edit DATABASE_URL + JWT secrets
npm install
npx prisma migrate dev        # create tables
npm run seed                  # roles, admin user, warehouses, company
npm run dev                   # → http://localhost:4000

# 3. Frontend (new terminal)
cd ../frontend
cp .env.example .env.local
npm install
PORT=3001 npm run dev         # → http://localhost:3001/erp
```

Open **http://localhost:3001/erp** → login with the seed admin.

> Port 3001 is used because another project may occupy 3000 — any free port works.

---

## 7. Database operations

```bash
cd backend
npx prisma migrate dev        # apply / create migrations (dev)
npx prisma migrate deploy     # apply migrations (production)
npm run seed                  # idempotent — safe to re-run
npx prisma studio             # visual DB browser (localhost:5555)
```

PDFs are cached on disk under `STORAGE_LOCAL_PATH/pdfs/...` and **regenerate
automatically** if missing — so ephemeral cloud filesystems are fine.

---

## 8. Cloud deployment — Render (current setup)

The repo has **`render.yaml`** (a "Blueprint") that defines the whole stack:
a **Postgres database**, the **backend API**, and the **frontend**.

### First‑time deploy
1. Push the code to GitHub (already done).
2. Render dashboard → **New → Blueprint** → connect the GitHub repo.
3. Render reads `render.yaml` and creates: `masoom-db`, `masoom-api`, `masoom-web`.
4. **One manual step:** on `masoom-web` → **Environment** → add
   `BACKEND_URL = https://masoom-api.onrender.com` → Save.
   *(This tells the frontend proxy where the API lives. Without it, login fails.)*

### How the pieces connect
- **DB → API:** `DATABASE_URL` is injected automatically (`fromDatabase`).
- **JWT secrets:** generated automatically by Render (`generateValue: true`).
- **API → Web:** the browser calls `/api/*` on the frontend; a runtime proxy
  (`frontend/src/app/api/[...path]/route.ts`) forwards to `BACKEND_URL`.
  This avoids all CORS/cookie cross‑domain issues.
- **PDFs:** the backend Docker image installs **Chromium** and sets
  `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
- **Migrations + seed** run automatically on every API boot
  (`prisma migrate deploy && tsx prisma/seed.ts`).

### Updating the live site
```bash
git add -A && git commit -m "..." && git push
```
Render **auto‑deploys on push** to `main`. (Changes to `render.yaml` itself —
like new env vars — may need a Blueprint "Manual Sync" or adding the var by hand.)

### Render free‑tier limits
- Web services **sleep after ~15 min** idle → slow first request.
- Free Postgres **expires after ~90 days** and is small.
- Good for **demos**; for real use, upgrade to paid (see §10/§12).

---

## 9. The PDF / Chromium note (important for any host)

PDF generation needs a real Chrome/Chromium browser on the server.
- **Locally (Mac):** uses your installed Google Chrome automatically.
- **Docker / cloud:** `docker/backend.Dockerfile` installs the `chromium` package.
- **Serverless hosts (e.g. Vercel functions) will NOT work** for the backend
  because they can't run Chromium easily. Use a **container/VPS** host for the API.

---

## 10. Other hosting options (for the future)

| Option | Cost | Best for | Notes |
|--------|------|----------|-------|
| **Render** (current) | Free / from ~$7/mo | Demos, small prod | One‑click via `render.yaml`. Free tier sleeps. |
| **Railway** | ~$5/mo usage | Easy small prod | GitHub deploy, Postgres add‑on, no sleep. Use the same Dockerfiles. |
| **Fly.io** | Free allowance + usage | Global, containers | Good Docker support. |
| **VPS + Docker** (Hetzner/DigitalOcean/Contabo) | ~$5–12/mo | Full control, cheapest real prod | Use `docker/docker-compose.prod.yml` + `nginx/` (already included). One box runs Postgres + API + Web + Nginx + free SSL. |
| **Vercel (frontend) + managed DB** | Free–$20/mo | If you split | Frontend on Vercel; **API must still be on a container host** (Chromium). DB on Neon/Supabase (free tiers). |

**Recommended path to real production:** a small **VPS with Docker** (the compose
file and Nginx config are ready) — cheapest and no sleep — **or** Railway for the
least setup.

---

## 11. Custom domain + HTTPS

- **Render/Railway:** add your domain in the dashboard → add the shown DNS record
  at your registrar → SSL is automatic and free.
- **VPS:** point an A record to the server IP; the included Nginx + Let's Encrypt
  (certbot) gives free SSL. A `.ae` domain costs roughly **AED 40–150/year**.

After adding a domain, update the frontend's `BACKEND_URL` (and `COOKIE_DOMAIN`
if API and web share one domain).

---

## 12. Going to real production — checklist

- [ ] Change the admin password (and `SEED_ADMIN_PASSWORD`); create real users.
- [ ] Move off free tiers (paid DB + always‑on services) so it doesn't sleep / expire.
- [ ] Enable **automated database backups** (Render/Railway paid plans, or `pg_dump` cron on a VPS — `scripts/backup.sh` is a starting point).
- [ ] Put real company details in **Settings** (legal name, TRN, address) — they print on every document.
- [ ] Confirm the **TRN** and VAT rates are correct for FTA filing.
- [ ] Keep JWT secrets private; rotate if ever exposed.
- [ ] (Optional) Move PDF/file storage to S3 (the code already supports `STORAGE_DRIVER=s3`).

---

## 13. Day‑to‑day operations

**Add a user / role:** ERP → *Users & Roles*. Roles: SUPER_ADMIN, ADMIN,
ACCOUNTANT, SALESMAN, WAREHOUSE, CUSTOMER (permissions are seeded).

**Start using it:** Settings → company details → add Customers, Suppliers,
Products → then create Quotations / Invoices / LPOs. Numbers and PDFs are automatic.

**Wipe to a clean slate** (delete all documents/master data, keep users+warehouses):
run a Prisma script that deletes the transactional tables and resets
`documentSequence.lastNum` to 0. (Ask the developer; this was done once already.)

**Update the app:** edit code → `git commit` → `git push` → cloud auto‑deploys.

---

## 14. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Live login fails / "API unreachable" | `BACKEND_URL` env var missing on `masoom-web` (see §8 step 4). |
| First load very slow (~40s) | Free‑tier service was asleep — normal; upgrade to remove. |
| PDF button errors on cloud | Chromium missing — ensure backend uses `docker/backend.Dockerfile` (installs it). |
| Logged out after refresh on cloud | `COOKIE_SECURE` must be `true` in production (already set in `render.yaml`). |
| `tsc` complains about `prisma/seed.ts` | It's excluded from the build on purpose; the seed runs via `tsx`. |

---

## 15. Key facts cheat‑sheet

- **Repo:** https://github.com/abbasbugadwala5-ui/Masoom-Hardware (branch `main`)
- **App:** https://masoom-web.onrender.com  · **API:** https://masoom-api.onrender.com
- **Login:** admin@masoom.ae / Admin@12345 (change it)
- **One required cloud env var:** `BACKEND_URL` on `masoom-web` = the API's URL
- **Deploy file:** `render.yaml` (Blueprint) — or `docker/docker-compose.prod.yml` for a VPS
- **Cost:** code is 100% free/open‑source; only hosting costs money (free demo tier, or ~$5–12/mo for always‑on)
