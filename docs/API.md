# MASOOM HARDWARE — API reference (Phase 1)

Base URL: `/api`

All responses use the envelope `{ "data": ... }` on success and `{ "error": { "code", "message", "details?" } }` on failure. Mutating routes are protected by JWT bearer + permission middleware.

## Auth

| Method | Path                  | Auth        | Body                                              | Purpose                                  |
|--------|-----------------------|-------------|---------------------------------------------------|------------------------------------------|
| POST   | `/auth/login`         | public      | `{ email, password }`                             | Issues access token + refresh cookie     |
| POST   | `/auth/refresh`       | cookie      | (cookie)                                          | Rotates refresh, returns new access token|
| POST   | `/auth/logout`        | any         | —                                                 | Revokes current refresh token            |
| GET    | `/auth/me`            | bearer      | —                                                 | Current user + permissions               |
| POST   | `/auth/change-password` | bearer    | `{ currentPassword, newPassword }`                | Changes password, revokes all sessions   |
| POST   | `/auth/register`      | `user.create` | `{ email, password, fullName, phone?, roleId }` | Admin creates a user                     |

Cookies: refresh token in `masoom_rt`, httpOnly, SameSite=Lax. Access token returned in JSON body; client stores in memory and sends as `Authorization: Bearer …`.

## Health

| Method | Path           | Purpose            |
|--------|----------------|--------------------|
| GET    | `/health`      | Liveness probe     |

## Coming in Phase 2+

Mount points are reserved in `backend/src/routes.ts`:

```
/products      product.read/write/delete
/categories    product.write
/brands        product.write
/customers     customer.read/write
/suppliers     supplier.read/write
/warehouses    inventory.read
/inventory     inventory.read/transfer/adjust
/quotations    quotation.read/write
/sales-orders  invoice.read/create
/invoices      invoice.read/create/post
/delivery-orders delivery.create
/credit-notes  creditnote.write
/payments      payment.receive / payment.pay
/lpos          lpo.write
/grns          grn.write
/purchase-invoices purchaseinvoice.write
/expenses      accounts.write
/journals      accounts.write
/reports       reports.read
/settings      settings.manage
```

## Conventions

- **Pagination** — `?page=1&pageSize=25` → response shape `{ data: [...], pagination: { page, pageSize, total, totalPages } }`
- **Filtering** — flat query string per resource, e.g. `?status=POSTED&customerId=…&from=2026-01-01&to=2026-03-31`
- **Sorting** — `?sort=field&order=asc|desc`
- **Validation errors** — `422` with `details` containing Zod `flatten()` output
- **Audit** — every mutating call writes an `audit_logs` row with `(userId, action, entity, entityId, before, after, ip, ua, requestId)`
