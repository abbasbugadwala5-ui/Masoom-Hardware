# MASOOM HARDWARE — Development Roadmap

A phased plan. Each phase is independently shippable — at the end of a phase, the system is usable for what it claims to do.

## Phase 1 — Foundation (this commit)

**Outcome:** repo + schema + auth + base UI shell run locally with `docker compose up`.

- [x] Monorepo layout (backend, frontend, shared, docker, nginx)
- [x] PostgreSQL + Prisma schema covering all 30+ entities
- [x] Express + TS server skeleton with helmet/cors/rate-limit/pino
- [x] Auth: register-by-admin, login, refresh, logout, /me — JWT access + httpOnly refresh
- [x] RBAC middleware + seeded roles (SuperAdmin, Admin, Accountant, Salesman, Warehouse, Customer)
- [x] Audit log middleware
- [x] Zod validation pipeline
- [x] Next.js 15 App Router shell — marketing landing + ERP login + dashboard placeholder
- [x] Docker compose (Postgres, Redis, API, Web, Nginx)
- [x] Seed script with default super admin

## Phase 2 — Master data + Inventory

**Outcome:** can register products, manage stock across two warehouses, transfer stock, and see live stock levels.

- [ ] Products CRUD (with categories, brands, images, spec PDF upload)
- [ ] Bulk import (CSV/XLSX) of products
- [ ] Suppliers CRUD
- [ ] Customers CRUD (TRN validation, credit limit, address)
- [ ] Warehouses CRUD (Dubai + Sharjah seeded)
- [ ] InventoryItem service + StockLog audit
- [ ] Stock transfer flow (warehouse → warehouse)
- [ ] Stock adjustment + damage flow
- [ ] Low-stock alerts (cron + email)
- [ ] ERP UI: product list, product editor, stock dashboard, transfer form

## Phase 3 — Sales + Purchase cycle with PDFs + VAT

**Outcome:** the core ERP value. A salesman can quote → confirm → invoice → deliver, all with FTA-compliant PDFs.

- [x] Document numbering service (atomic sequences)
- [x] Quotation create/edit/send/accept/reject
- [x] Convert Quotation → Sales Order → Tax Invoice
- [x] Delivery Order with stock-out posting (+ cancel restock)
- [x] Credit Note (against invoice, optional restock) — Debit Note pending (purchases)
- [x] Receipt Voucher (customer payment) with invoice allocation + settlement status
- [ ] LPO + GRN + Purchase Invoice + Payment Voucher
- [x] VAT engine (inclusive/exclusive, per-line rates, breakdown)
- [x] FTA QR code on tax invoices (TLV base64, embedded)
- [x] Server-side PDF archive (puppeteer-core + system Chrome) with templates for all sales docs
- [ ] WhatsApp share + email send for any document
- [ ] ERP UI: sales flow, invoice list, document preview, print

## Phase 4 — Accounts + Reports + CRM depth

**Outcome:** finance and management dashboards.

- [ ] Chart of accounts + journal entries
- [ ] Customer ledger / Supplier ledger
- [ ] Aging report (30/60/90)
- [ ] Daily/monthly sales reports
- [ ] Top products / top customers
- [ ] Profit & Loss
- [ ] VAT return export (FTA xlsx)
- [ ] Inventory valuation report
- [ ] Dashboard KPIs (today's sales, MTD, outstanding, low stock)
- [ ] Global search (products, customers, document numbers, mobile, TRN)

## Phase 5 — Website + polish + hardening

**Outcome:** public-facing site live, system production-ready.

- [ ] Marketing site: Home, About, Products (filtered from ERP catalog), Brands, Catalogue PDF, Contact, RFQ, Careers, Branches
- [ ] SEO: sitemap, structured data, OG tags, fast LCP
- [ ] RFQ form → creates lead in ERP
- [ ] WhatsApp inquiry button
- [ ] Customer portal (login, view invoices, download PDFs, pay outstanding)
- [ ] Sentry, Prometheus metrics, structured logging review
- [ ] Backup automation + restore drill
- [ ] Load test (k6) at 1000 invoices/day equivalent burst
- [ ] Security review (OWASP top 10 pass)
- [ ] Production deploy + DNS + TLS + uptime monitoring

## Conventions across phases

- Each module ships with: Prisma migration, Zod schemas, controller, service, routes, tests (Vitest), UI screens.
- Tests required for: numbering service, VAT calculation, stock mutations, auth.
- No module is "done" until its PDF (if any) renders and its API has at least a happy-path integration test.
