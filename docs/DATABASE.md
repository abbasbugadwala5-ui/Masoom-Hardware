# MASOOM HARDWARE — Database notes

Schema source of truth: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).

## Entity groups

```
Identity         users ─< role >─ role_permissions >─ permissions
                       │
                       └< refresh_tokens, audit_logs

Company          company_settings, document_sequences

Catalog          categories (self-tree), brands, products ─< product_images
                                                         └< product_attachments

Inventory        warehouses ─< inventory_items >─ products
                            └< stock_logs            (immutable audit)
                            └< stock_transfers ─< stock_transfer_items

Partners         customers, suppliers

Sales            quotations ─< quotation_items
                 sales_orders ─< sales_order_items   (1:1 with quotation)
                 invoices ─< invoice_items           (1:1 with sales_order)
                          └─< delivery_orders ─< delivery_order_items
                          └─< credit_notes ─< credit_note_items
                          └─< payment_allocations >── payments

Purchases        lpos ─< lpo_items
                 grns ─< grn_items
                 purchase_invoices ─< purchase_invoice_items
                                   └< debit_notes ─< debit_note_items
                                   └< payment_allocations >── payments

Accounts         accounts (self-tree), journals ─< journal_lines, expenses
```

## Money

All AED amounts use `Decimal(14, 2)`. Quantities use `Decimal(14, 3)` to allow fractional units (kg, m). No `Float`, ever, for money.

## Indexes worth knowing

- `invoices (customerId, date)` — customer ledger queries
- `invoices (status)` — outstanding-invoice dashboard
- `stock_logs (productId, warehouseId, createdAt)` — stock movement reports
- `stock_logs (refTable, refId)` — quickly find all movements caused by a document
- `audit_logs (entity, entityId)` and `(userId, createdAt)`
- Full-text search on `products(name, sku)` to be added in Phase 2 via a migration

## Sequences

`document_sequences (prefix, year)` is the atomic counter. Numbering is allocated inside the same Prisma transaction that creates the document:

```ts
const seq = await tx.documentSequence.update({
  where: { prefix_year: { prefix: 'INV', year: shortYear } },
  data:  { lastNum: { increment: 1 } },
});
const number = formatDocNumber('INV', shortYear, seq.lastNum);
```

This holds a row-level lock for the duration of the transaction, so concurrent invoice creation does not collide.

## Soft delete vs. hard delete

- `customers`, `products`, `users` carry `deletedAt` — they're referenced from historical documents and must remain queryable.
- Everything else is hard-deletable while in `DRAFT`. Once `POSTED`, financial documents are immutable; correct via Credit/Debit Note.

## ER diagram

Generate with: `npx prisma generate && npx prisma-erd-generator` (add to devDeps when needed). For now the relations above are the authoritative summary.
