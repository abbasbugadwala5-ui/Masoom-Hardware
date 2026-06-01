import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { BadRequest } from '../../utils/errors';

export const reportsRouter = Router();

const num = (d: Prisma.Decimal | number | null | undefined) => Number(d ?? 0);
const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Default range = current month if not supplied. */
function resolveRange(q: z.infer<typeof rangeSchema>) {
  const to = q.to ?? new Date();
  const from = q.from ?? new Date(to.getFullYear(), to.getMonth(), 1);
  // include the whole `to` day
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);
  return { from, to: toEnd };
}

const POSTED: ('POSTED' | 'PAID' | 'PART_PAID')[] = ['POSTED', 'PAID', 'PART_PAID'];

/* ───────────────────────── VAT RETURN (FTA-shaped) ───────────────────────── */
reportsRouter.get(
  '/vat-return',
  requireAuth,
  requirePermission('reports.read'),
  validate(rangeSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { from, to } = resolveRange(req.query as z.infer<typeof rangeSchema>);
    const dateRange = { gte: from, lte: to };

    const [salesAgg, cnAgg, purchaseAgg] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { taxableAmount: true, vatAmount: true }, where: { status: { in: POSTED }, date: dateRange } }),
      prisma.creditNote.aggregate({ _sum: { taxableAmount: true, vatAmount: true }, where: { date: dateRange } }),
      prisma.purchaseInvoice.aggregate({ _sum: { subtotal: true, vatAmount: true }, where: { status: { in: POSTED }, date: dateRange } }),
    ]);

    const outputTaxable = round2(num(salesAgg._sum?.taxableAmount) - num(cnAgg._sum?.taxableAmount));
    const outputVat = round2(num(salesAgg._sum?.vatAmount) - num(cnAgg._sum?.vatAmount));
    const inputTaxable = round2(num(purchaseAgg._sum?.subtotal));
    const inputVat = round2(num(purchaseAgg._sum?.vatAmount));
    const netPayable = round2(outputVat - inputVat);

    res.json({
      data: {
        period: { from, to },
        sales: { taxable: round2(num(salesAgg._sum?.taxableAmount)), vat: round2(num(salesAgg._sum?.vatAmount)) },
        creditNotes: { taxable: round2(num(cnAgg._sum?.taxableAmount)), vat: round2(num(cnAgg._sum?.vatAmount)) },
        outputVat: { taxable: outputTaxable, vat: outputVat },
        inputVat: { taxable: inputTaxable, vat: inputVat },
        netPayable,
        note: 'Debit-note VAT adjustments are not split and are excluded from input VAT.',
      },
    });
  }),
);

/* ───────────────────────── SALES SUMMARY ───────────────────────── */
reportsRouter.get(
  '/sales-summary',
  requireAuth,
  requirePermission('reports.read'),
  validate(rangeSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { from, to } = resolveRange(req.query as z.infer<typeof rangeSchema>);
    const where = { status: { in: POSTED }, date: { gte: from, lte: to } };
    const [agg, count, topCustomers, topProducts] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { taxableAmount: true, vatAmount: true, total: true, amountPaid: true }, where }),
      prisma.invoice.count({ where }),
      prisma.invoice.groupBy({ by: ['customerId'], where, _sum: { total: true }, orderBy: { _sum: { total: 'desc' } }, take: 5 }),
      prisma.invoiceItem.groupBy({ by: ['productId'], where: { invoice: where }, _sum: { quantity: true, total: true }, orderBy: { _sum: { total: 'desc' } }, take: 5 }),
    ]);

    const custIds = topCustomers.map((c) => c.customerId);
    const prodIds = topProducts.map((p) => p.productId);
    const [custs, prods] = await Promise.all([
      prisma.customer.findMany({ where: { id: { in: custIds } }, select: { id: true, name: true, code: true } }),
      prisma.product.findMany({ where: { id: { in: prodIds } }, select: { id: true, name: true, sku: true } }),
    ]);
    const cmap = new Map(custs.map((c) => [c.id, c]));
    const pmap = new Map(prods.map((p) => [p.id, p]));

    res.json({
      data: {
        period: { from, to },
        invoiceCount: count,
        taxable: round2(num(agg._sum?.taxableAmount)),
        vat: round2(num(agg._sum?.vatAmount)),
        total: round2(num(agg._sum?.total)),
        collected: round2(num(agg._sum?.amountPaid)),
        outstanding: round2(num(agg._sum?.total) - num(agg._sum?.amountPaid)),
        topCustomers: topCustomers.map((c) => ({ ...cmap.get(c.customerId), revenue: round2(num(c._sum?.total)) })),
        topProducts: topProducts.map((p) => ({ ...pmap.get(p.productId), quantity: round2(num(p._sum?.quantity)), revenue: round2(num(p._sum?.total)) })),
      },
    });
  }),
);

/* ───────────────────────── CUSTOMER LEDGER ───────────────────────── */
reportsRouter.get(
  '/customer-ledger/:customerId',
  requireAuth,
  requirePermission('reports.read'),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.customerId } });
    if (!customer) throw BadRequest('Customer not found');

    const [invoices, creditNotes, receipts] = await Promise.all([
      prisma.invoice.findMany({ where: { customerId: customer.id, status: { in: POSTED } }, select: { id: true, number: true, date: true, total: true } }),
      prisma.creditNote.findMany({ where: { customerId: customer.id }, select: { id: true, number: true, date: true, total: true } }),
      prisma.payment.findMany({ where: { customerId: customer.id, direction: 'RECEIVED' }, select: { id: true, number: true, date: true, amount: true } }),
    ]);

    type Row = { date: Date; type: string; ref: string; debit: number; credit: number };
    const rows: Row[] = [
      ...invoices.map((i) => ({ date: i.date, type: 'Invoice', ref: i.number, debit: num(i.total), credit: 0 })),
      ...creditNotes.map((c) => ({ date: c.date, type: 'Credit Note', ref: c.number, debit: 0, credit: num(c.total) })),
      ...receipts.map((r) => ({ date: r.date, type: 'Receipt', ref: r.number, debit: 0, credit: num(r.amount) })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = num(customer.openingBalance);
    const opening = balance;
    const ledger = rows.map((r) => { balance = round2(balance + r.debit - r.credit); return { ...r, balance }; });

    res.json({ data: { customer: { id: customer.id, name: customer.name, code: customer.code, trn: customer.trn }, opening: round2(opening), closing: round2(balance), rows: ledger } });
  }),
);

/* ───────────────────────── SUPPLIER LEDGER ───────────────────────── */
reportsRouter.get(
  '/supplier-ledger/:supplierId',
  requireAuth,
  requirePermission('reports.read'),
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.supplierId } });
    if (!supplier) throw BadRequest('Supplier not found');

    const [invoices, debitNotes, payments] = await Promise.all([
      prisma.purchaseInvoice.findMany({ where: { supplierId: supplier.id, status: { in: POSTED } }, select: { id: true, number: true, date: true, total: true } }),
      prisma.debitNote.findMany({ where: { supplierId: supplier.id }, select: { id: true, number: true, date: true, total: true } }),
      prisma.payment.findMany({ where: { supplierId: supplier.id, direction: 'PAID' }, select: { id: true, number: true, date: true, amount: true } }),
    ]);

    type Row = { date: Date; type: string; ref: string; debit: number; credit: number };
    const rows: Row[] = [
      ...invoices.map((i) => ({ date: i.date, type: 'Purchase Invoice', ref: i.number, debit: 0, credit: num(i.total) })),
      ...debitNotes.map((d) => ({ date: d.date, type: 'Debit Note', ref: d.number, debit: num(d.total), credit: 0 })),
      ...payments.map((p) => ({ date: p.date, type: 'Payment', ref: p.number, debit: num(p.amount), credit: 0 })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = num(supplier.openingBalance);
    const opening = balance;
    const ledger = rows.map((r) => { balance = round2(balance - r.debit + r.credit); return { ...r, balance }; });

    res.json({ data: { supplier: { id: supplier.id, name: supplier.name, code: supplier.code, trn: supplier.trn }, opening: round2(opening), closing: round2(balance), rows: ledger } });
  }),
);

/* ───────────────────────── AGING (receivables) ───────────────────────── */
reportsRouter.get(
  '/aging',
  requireAuth,
  requirePermission('reports.read'),
  asyncHandler(async (_req, res) => {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['POSTED', 'PART_PAID'] } },
      select: { id: true, number: true, date: true, dueDate: true, total: true, amountPaid: true, customer: { select: { id: true, name: true, code: true } } },
    });
    const now = Date.now();
    const bucketOf = (d: Date) => {
      const days = Math.floor((now - new Date(d).getTime()) / 86_400_000);
      if (days <= 30) return 'd0_30';
      if (days <= 60) return 'd31_60';
      if (days <= 90) return 'd61_90';
      return 'd90_plus';
    };
    const byCustomer = new Map<string, { id: string; name: string; code: string; d0_30: number; d31_60: number; d61_90: number; d90_plus: number; total: number }>();
    for (const inv of invoices) {
      const bal = round2(num(inv.total) - num(inv.amountPaid));
      if (bal <= 0) continue;
      const c = inv.customer!;
      const cur = byCustomer.get(c.id) ?? { id: c.id, name: c.name, code: c.code, d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };
      const bucket = bucketOf(inv.dueDate ?? inv.date);
      cur[bucket] = round2(cur[bucket] + bal);
      cur.total = round2(cur.total + bal);
      byCustomer.set(c.id, cur);
    }
    const rows = [...byCustomer.values()].sort((a, b) => b.total - a.total);
    const totals = rows.reduce((acc, r) => ({ d0_30: round2(acc.d0_30 + r.d0_30), d31_60: round2(acc.d31_60 + r.d31_60), d61_90: round2(acc.d61_90 + r.d61_90), d90_plus: round2(acc.d90_plus + r.d90_plus), total: round2(acc.total + r.total) }), { d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 });
    res.json({ data: { rows, totals } });
  }),
);

/* ───────────────────────── PROFIT & LOSS (simplified) ───────────────────────── */
reportsRouter.get(
  '/profit-loss',
  requireAuth,
  requirePermission('reports.read'),
  validate(rangeSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { from, to } = resolveRange(req.query as z.infer<typeof rangeSchema>);
    const dateRange = { gte: from, lte: to };
    const [sales, creditNotes, purchases, debitNotes, expenses] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { taxableAmount: true }, where: { status: { in: POSTED }, date: dateRange } }),
      prisma.creditNote.aggregate({ _sum: { taxableAmount: true }, where: { date: dateRange } }),
      prisma.purchaseInvoice.aggregate({ _sum: { subtotal: true }, where: { status: { in: POSTED }, date: dateRange } }),
      prisma.debitNote.aggregate({ _sum: { total: true }, where: { date: dateRange } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { date: dateRange } }),
    ]);
    const revenue = round2(num(sales._sum?.taxableAmount) - num(creditNotes._sum?.taxableAmount));
    const cogs = round2(num(purchases._sum?.subtotal) - num(debitNotes._sum?.total));
    const grossProfit = round2(revenue - cogs);
    const opex = round2(num(expenses._sum?.amount));
    const netProfit = round2(grossProfit - opex);
    res.json({ data: { period: { from, to }, revenue, cogs, grossProfit, expenses: opex, netProfit, marginPct: revenue ? round2((netProfit / revenue) * 100) : 0 } });
  }),
);

/* ───────────────────────── INVENTORY VALUATION ───────────────────────── */
reportsRouter.get(
  '/inventory-valuation',
  requireAuth,
  requirePermission('reports.read'),
  asyncHandler(async (_req, res) => {
    const items = await prisma.inventoryItem.findMany({
      where: { quantity: { not: 0 } },
      include: { product: { select: { id: true, sku: true, name: true, costPrice: true, unit: true } }, warehouse: { select: { id: true, name: true } } },
    });
    const rows = items.map((it) => {
      const qty = num(it.quantity);
      const cost = num(it.product.costPrice);
      return { productId: it.product.id, sku: it.product.sku, name: it.product.name, unit: it.product.unit, warehouse: it.warehouse.name, quantity: qty, unitCost: cost, value: round2(qty * cost) };
    }).sort((a, b) => b.value - a.value);
    const totalValue = round2(rows.reduce((s, r) => s + r.value, 0));
    res.json({ data: { rows, totalValue, lines: rows.length } });
  }),
);
