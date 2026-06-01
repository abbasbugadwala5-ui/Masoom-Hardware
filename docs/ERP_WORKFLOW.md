# MASOOM HARDWARE — ERP Workflow

## Sales cycle

```
        ┌──────────────┐         accept          ┌────────────────┐
Lead → │  Quotation   │ ───────────────────────► │  Sales Order   │
        │     (QT)     │                          │     (SO)       │
        └──────┬───────┘                          └────────┬───────┘
               │ revise                                    │ confirm
               ▼                                            ▼
        ┌──────────────┐                          ┌────────────────┐
        │  Quotation   │                          │  Tax Invoice   │ ── posts revenue + VAT
        │  v2, v3…     │                          │    (INV)       │ ── increases AR
        └──────────────┘                          └────────┬───────┘
                                                            │ goods leave warehouse
                                                            ▼
                                                  ┌────────────────┐
                                                  │ Delivery Order │ ── decrements stock
                                                  │     (DO)       │
                                                  └────────┬───────┘
                                                            │ payment
                                                            ▼
                                                  ┌────────────────┐
                                                  │ Receipt Voucher│ ── settles AR
                                                  │     (RV)       │
                                                  └────────────────┘

Return / dispute:
   Tax Invoice ── credit note (CN) ─► reverses revenue + VAT, restores stock if goods returned
```

### State transitions

| Document      | States                                              |
|---------------|-----------------------------------------------------|
| Quotation     | DRAFT → SENT → ACCEPTED / REJECTED / EXPIRED        |
| Sales Order   | DRAFT → CONFIRMED → INVOICED / CANCELLED            |
| Tax Invoice   | DRAFT → POSTED → PAID / PART_PAID → CANCELLED       |
| Delivery Order| DRAFT → DISPATCHED → DELIVERED / CANCELLED          |
| Credit Note   | DRAFT → POSTED                                      |

`POSTED` documents are immutable — corrections go via Credit/Debit Note.

## Purchase cycle

```
   Need ──► LPO (purchase order) ──► supplier ──► goods arrive
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  Goods Received │ ── increments stock
                                              │  Note  (GRN)    │
                                              └────────┬────────┘
                                                       │ supplier invoice
                                                       ▼
                                              ┌─────────────────┐
                                              │  Purchase       │ ── records AP + input VAT
                                              │  Invoice (PI)   │
                                              └────────┬────────┘
                                                       │ payment
                                                       ▼
                                              ┌─────────────────┐
                                              │ Payment Voucher │ ── settles AP
                                              │     (PV)        │
                                              └─────────────────┘
```

## Inventory movements

Every change to stock is one row in `StockLog`:

| Type           | Source document    | Direction |
|----------------|--------------------|-----------|
| PURCHASE_IN    | GRN                | +         |
| SALE_OUT       | DO                 | −         |
| RETURN_IN      | Credit Note        | +         |
| RETURN_OUT     | Debit Note         | −         |
| TRANSFER_OUT   | Stock Transfer src | −         |
| TRANSFER_IN    | Stock Transfer dst | +         |
| ADJUSTMENT     | Stock Adjustment   | + / −     |
| DAMAGE         | Stock Adjustment   | −         |
| OPENING        | Opening Balance    | +         |

`InventoryItem.quantity` is mutated in the same transaction as the log row.

## Money flow

- AED everywhere (multi-currency later)
- VAT: 5% standard, 0% on exports/exempt goods (configurable per product/line)
- Receipt and Payment vouchers update `Payment` rows that allocate against one or more invoices/purchase-invoices, supporting partial payments and advances.

## Roles → what they can do

| Action                       | SuperAdmin | Admin | Accountant | Salesman | Warehouse | Customer |
|------------------------------|:----------:|:-----:|:----------:|:--------:|:---------:|:--------:|
| Manage users/roles           | ✓          |       |            |          |           |          |
| Edit company settings        | ✓          | ✓     |            |          |           |          |
| Create Quotation / SO        | ✓          | ✓     |            | ✓        |           |          |
| Create / post Tax Invoice    | ✓          | ✓     | ✓          |          |           |          |
| Create Delivery Order        | ✓          | ✓     |            | ✓        | ✓         |          |
| Receive Payment              | ✓          | ✓     | ✓          |          |           |          |
| Create LPO / GRN             | ✓          | ✓     |            |          | ✓         |          |
| Stock transfer / adjust      | ✓          | ✓     |            |          | ✓         |          |
| View reports                 | ✓          | ✓     | ✓          | (own)    | (stock)   |          |
| View own invoices            | —          | —     | —          | —        | —         | ✓        |

Per-action checks via `requirePermission('invoice.create')` — permissions are seeded and editable, table above is the default policy.
