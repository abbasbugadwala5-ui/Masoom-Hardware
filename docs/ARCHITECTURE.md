# MASOOM HARDWARE — System Architecture

## 1. Goals

A production-grade ERP + corporate website for a UAE hardware trader, designed for:

- **1000+ invoices/day** sustained throughput
- **UAE VAT (FTA) compliance** — TRN on every party, 5% VAT, QR-coded tax invoices
- **Multi-warehouse** inventory (Dubai, Sharjah) with stock transfers and audit trail
- **Document lifecycle** — Quotation → Sales Order → Tax Invoice → DO → Payment, all with auto-generated PDFs stored permanently
- **Role-based access** for Super Admin, Admin, Accountant, Salesman, Warehouse, Customer
- **Reporting** — sales, VAT returns, inventory, P&L, customer/supplier ledgers

## 2. High-level architecture

```
                 ┌──────────────────────────────────────────┐
                 │             Browsers / Mobile            │
                 └───────────────┬──────────────────────────┘
                                 │ HTTPS
                                 ▼
                       ┌──────────────────┐
                       │   Nginx (TLS)    │  ── reverse proxy, gzip, static
                       └──┬─────────────┬─┘
        /api/*  ─────────┘             └────────── /, /erp/*
                 │                                  │
                 ▼                                  ▼
       ┌──────────────────┐               ┌──────────────────┐
       │  Express API     │               │   Next.js 15     │
       │  (Node 20, TS)   │               │   (SSR + ISR)    │
       │  PM2 cluster x N │               │   PM2 / Vercel   │
       └──┬────────┬──────┘               └──────────────────┘
          │        │
          │        └──────────────► BullMQ ──► Redis
          │                            │
          │                            ▼
          │                     ┌─────────────┐
          │                     │  PDF worker │ (Puppeteer pool)
          │                     └──────┬──────┘
          ▼                            │
   ┌──────────────┐               ┌────▼──────┐
   │ PostgreSQL 16│               │ S3 / FS   │  ← PDF + image storage
   │ (primary +   │               └───────────┘
   │  read replica│
   │  in future)  │
   └──────────────┘
```

### Why split API and PDF worker

Puppeteer is heavy (Chromium). Generating PDFs inline on the request thread blocks the event loop and ruins p95 latency under load. The PDF worker consumes a BullMQ queue, runs a pool of headless Chromium instances, writes the file to S3/disk, and updates the parent document with the resulting URL.

## 3. Backend modules

```
backend/src/modules/
├── auth/         JWT login/refresh, password reset, RBAC
├── users/        Users + roles + permissions
├── customers/    CRM, TRN, credit limits, ledger
├── suppliers/    Supplier master + ledger
├── products/     Products, categories, brands, variants, barcode
├── inventory/    Stock by warehouse, transfers, adjustments, batches
├── sales/        Quotation, SalesOrder, Invoice, DO, CreditNote, Payment
├── purchases/    LPO, GRN, PurchaseInvoice, DebitNote
├── accounts/     Journals, expenses, P&L, cash, bank
├── reports/      Sales, VAT return, inventory, ageing, top-N
├── pdf/          Document → HTML → PDF pipeline (enqueues job)
└── uploads/      File upload to S3 / local
```

Each module owns: `*.controller.ts`, `*.service.ts`, `*.routes.ts`, `*.schema.ts` (Zod), and optionally `*.repository.ts`.

## 4. Authentication & authorization

- **Access token** — JWT, 15 min, signed HS256, sent as `Authorization: Bearer <token>`
- **Refresh token** — JWT, 30 days, stored as httpOnly secure cookie, rotated on every refresh and revoked on logout (jti tracked in `refresh_tokens` table)
- **Passwords** — bcrypt with cost 12
- **RBAC** — `User → Role → Permission[]` join. Middleware `requirePermission('invoice.create')` checks per-route. Permissions are seeded; roles can be edited at runtime.
- **Audit log** — every mutating request writes `(user_id, action, entity, entity_id, before, after, ip, ua)` to `audit_logs` for compliance.

## 5. UAE VAT compliance

- Every `Customer`, `Supplier`, `CompanySettings` carries a `trn` field (15-digit, validated)
- Every line item carries `vatRate`, `vatAmount`, `subtotal`, `total` — computed and stored, never derived on read (so historical invoices stay stable even if VAT rates change)
- `Invoice.totals` mirrors FTA layout: `subtotal`, `discount`, `taxableAmount`, `vatAmount`, `total`, with per-rate breakdown in `Invoice.vatBreakdown` JSON
- Tax invoices render a **QR code** following FTA spec (Base64-TLV of seller name, TRN, timestamp, total, VAT)
- VAT-return export: `/api/reports/vat?from=YYYY-MM-DD&to=YYYY-MM-DD&format=xlsx` produces FTA-format sheet (output VAT, input VAT, adjustments)

## 6. Document numbering

Atomic per-series sequences in `document_sequences` table — updated within the same transaction that creates the document. Format: `<PREFIX>/<YY>/<6-digit>`, e.g. `INV/26/000123`. Prefixes: `QT` quotation, `SO` sales order, `INV` tax invoice, `DO` delivery order, `LPO` purchase order, `CN` credit note, `DN` debit note, `RV` receipt voucher, `PV` payment voucher.

## 7. Inventory model

- `Product` holds master data; **stock lives in `InventoryItem(productId, warehouseId, quantity)`** — one row per product/warehouse pair
- Every movement (sale, purchase, transfer, adjustment, damage) writes one `StockLog` row with `(type, productId, warehouseId, qtyDelta, refTable, refId)` — full audit trail and the source-of-truth for stock value
- `InventoryItem.quantity` is updated transactionally with the log row; a nightly reconciliation job checks `SUM(StockLog.qtyDelta) == InventoryItem.quantity` per (product, warehouse)
- Optional `Batch` (lot, expiry) for paint/chemicals — FEFO picking

## 8. PDF pipeline

1. Controller creates the document inside a DB transaction, generating its number.
2. After commit, controller enqueues `{ type: 'invoice', id }` to BullMQ.
3. PDF worker pulls the job, loads the document with relations, renders a React-PDF or HTML template, runs Puppeteer to produce a PDF, uploads to S3/disk.
4. Worker updates `document.pdfUrl` and emits a webhook for any listener.
5. UI polls or subscribes via SSE to know when the PDF is ready (usually <2s).

Templates live in `backend/src/modules/pdf/templates/*.tsx` — versioned with the document so reprints stay faithful.

## 9. Frontend architecture

- **Single Next.js app** with two surfaces:
  - `/` — public marketing site (ISR, SEO-optimized, sitemap, structured data)
  - `/erp/*` — authenticated ERP (CSR-heavy, behind `middleware.ts` auth gate)
- **State** — TanStack Query for server state, Zustand for transient UI state, no Redux
- **Forms** — React Hook Form + Zod (same Zod schemas as backend via `shared/`)
- **Tables** — TanStack Table with virtualization for invoice lists
- **Charts** — Recharts for dashboard KPIs
- **Auth** — access token in memory, refresh token in httpOnly cookie; silent refresh on 401

## 10. Database posture

- Single primary PostgreSQL 16 to start; logical replication-ready for read-replica later
- Connection pooling via `pgbouncer` in prod (transaction mode)
- All money columns: `Decimal(14,2)` (15-digit AED ceiling, never `Float`)
- All FKs `ON DELETE RESTRICT` for financial entities; soft-delete (`deletedAt`) on customers/products
- Indexes: `(customerId, invoiceDate)`, `(invoiceNumber)`, `(productId, warehouseId)`, full-text on `Product.name`/`sku`

## 11. Security checklist

- helmet, CORS allowlist, rate limiting (`express-rate-limit` + Redis store) on `/auth/*`
- Zod validation on every request body, query, and param
- Parameterized queries via Prisma (no raw string interpolation)
- File upload: MIME sniff, size cap, S3 with signed URLs, never serve uploads from app origin
- Secrets via env only; `.env` git-ignored; production via Docker secrets / Vault
- HTTPS-only cookies, `SameSite=Lax`, CSRF token on cookie-auth endpoints
- Daily encrypted DB backups → off-site bucket; 30-day retention

## 12. Observability

- Structured logs via `pino` (JSON to stdout)
- Request ID per request, propagated to logs and DB audit rows
- `/health` and `/ready` endpoints for Nginx and orchestrator probes
- Sentry for unhandled errors (frontend + backend)
- Optional Prometheus `/metrics` (request duration, queue depth, DB pool)

## 13. Deployment

- Single VPS (Ubuntu 22.04) is enough for v1 — Postgres + Redis + API + Web + Nginx all containerized
- `docker compose -f docker/docker-compose.prod.yml up -d`
- Nginx terminates TLS (Let's Encrypt via certbot), serves `/api/*` to API container, `/` to Next.js container
- PM2 inside containers for cluster mode + auto-restart
- Backups via `scripts/backup.sh` cron job (daily Postgres dump + S3 sync)

## 14. Scaling path (when needed)

1. Move PDF worker + Redis to a separate node
2. Add Postgres read replica; route reports/dashboards to it
3. Move file storage to S3 (already abstracted behind `StorageService`)
4. Horizontal scale API behind Nginx upstream
5. Eventually: split modules into services (sales, inventory) if a single API can't keep up — but not before measurement says so.
