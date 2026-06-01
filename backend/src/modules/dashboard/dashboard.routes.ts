import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

export const dashboardRouter = Router();

const num = (x: unknown) => Number(x ?? 0);

/**
 * /api/dashboard/kpis — counts only (cheap, used by sidebar quick stats).
 */
dashboardRouter.get(
  '/kpis',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [users, customers, suppliers, products, warehouses, invoices, lpos, lowStock] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.supplier.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.warehouse.count(),
      prisma.invoice.count(),
      prisma.lpo.count(),
      prisma.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
    ]);
    res.json({
      data: { users, customers, suppliers, products, warehouses, invoices, lpos, lowStock },
    });
  }),
);

/**
 * /api/dashboard/overview — the accounting heart.
 *
 *   sales       : posted + paid invoice totals, AR outstanding
 *   purchases   : LPO totals (proxy for AP until purchase-invoice module lands)
 *   vat         : output collected, input paid, net payable
 *   monthly     : last 12 months — sales & purchases, for the trend chart
 *   topCustomers, topProducts (by revenue)
 *   recent      : last 5 invoices + last 5 LPOs
 */
dashboardRouter.get(
  '/overview',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const now    = new Date();
    const yStart = new Date(now.getFullYear(), 0, 1);
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const POSTED_STATUSES = ['POSTED', 'PAID', 'PART_PAID'] as const;
    const invWhereBase = { status: { in: [...POSTED_STATUSES] } };

    const [
      counts,
      invAgg, invTodayAgg, invMonthAgg, invYearAgg, invOutAgg,
      lpoAgg, lpoMonthAgg, lpoYearAgg,
      topCustomersRaw, topProductsRaw,
      recentInvoices, recentLpos,
      monthlySales, monthlyPurchases,
    ] = await Promise.all([
      // counts
      Promise.all([
        prisma.customer.count({ where: { deletedAt: null } }),
        prisma.supplier.count({ where: { deletedAt: null } }),
        prisma.product.count({ where: { deletedAt: null } }),
        prisma.invoice.count(),
        prisma.lpo.count(),
        prisma.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
      ]),

      // sales — overall
      prisma.invoice.aggregate({ where: invWhereBase, _sum: { total: true, vatAmount: true, subtotal: true, amountPaid: true } }),
      // sales — today / month / year
      prisma.invoice.aggregate({ where: { ...invWhereBase, date: { gte: dStart } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { ...invWhereBase, date: { gte: mStart } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { ...invWhereBase, date: { gte: yStart } }, _sum: { total: true } }),
      // outstanding — unpaid invoices
      prisma.invoice.findMany({
        where: { status: { in: ['POSTED', 'PART_PAID'] } },
        select: { total: true, amountPaid: true },
      }),

      // purchases (LPO as proxy)
      prisma.lpo.aggregate({ where: {}, _sum: { total: true, vatAmount: true, subtotal: true } }),
      prisma.lpo.aggregate({ where: { date: { gte: mStart } }, _sum: { total: true } }),
      prisma.lpo.aggregate({ where: { date: { gte: yStart } }, _sum: { total: true } }),

      // top 5 customers by revenue
      prisma.invoice.groupBy({
        by: ['customerId'],
        where: invWhereBase,
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      // top 5 products by revenue (from invoice items in posted invoices)
      prisma.invoiceItem.groupBy({
        by: ['productId'],
        where: { invoice: invWhereBase },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),

      prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.lpo.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { id: true, name: true } } },
      }),

      // last 12 months — Postgres TO_CHAR for month grouping
      prisma.$queryRaw<{ month: string; total: number }[]>`
        SELECT TO_CHAR(date_trunc('month', date), 'YYYY-MM') AS month,
               COALESCE(SUM(total), 0)::float AS total
        FROM invoices
        WHERE status IN ('POSTED','PAID','PART_PAID')
          AND date >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1;
      `,
      prisma.$queryRaw<{ month: string; total: number }[]>`
        SELECT TO_CHAR(date_trunc('month', date), 'YYYY-MM') AS month,
               COALESCE(SUM(total), 0)::float AS total
        FROM lpos
        WHERE date >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1;
      `,
    ]);

    const [customerCount, supplierCount, productCount, invoiceCount, lpoCount, lowStock] = counts;

    // outstanding receivable = SUM(total - amountPaid) for unpaid invoices
    const outstanding = invOutAgg.reduce((s, i) => s + (num(i.total) - num(i.amountPaid)), 0);

    // Resolve top customer + product names
    const customerIds = topCustomersRaw.map((r) => r.customerId);
    const productIds  = topProductsRaw.map((r) => r.productId);
    const [topCustomersInfo, topProductsInfo] = await Promise.all([
      prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, code: true } }),
      prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true } }),
    ]);
    const cMap = new Map(topCustomersInfo.map((c) => [c.id, c]));
    const pMap = new Map(topProductsInfo.map((p)  => [p.id, p]));

    // Fill last 12 months even if some are empty
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const salesByMonth     = new Map(monthlySales.map((r) => [r.month, num(r.total)]));
    const purchasesByMonth = new Map(monthlyPurchases.map((r) => [r.month, num(r.total)]));
    const monthly = months.map((m) => ({
      month:     m,
      sales:     salesByMonth.get(m)     ?? 0,
      purchases: purchasesByMonth.get(m) ?? 0,
    }));

    const totalSales     = num(invAgg._sum.total);
    const totalVatOut    = num(invAgg._sum.vatAmount);
    const totalPurchases = num(lpoAgg._sum.total);
    const totalVatIn     = num(lpoAgg._sum.vatAmount);
    const grossProfit    = totalSales - totalPurchases;

    res.json({
      data: {
        counts: { customers: customerCount, suppliers: supplierCount, products: productCount, invoices: invoiceCount, lpos: lpoCount, lowStock },
        sales: {
          total:       totalSales,
          today:       num(invTodayAgg._sum.total),
          month:       num(invMonthAgg._sum.total),
          year:        num(invYearAgg._sum.total),
          outstanding,
          avgInvoice:  invoiceCount > 0 ? totalSales / invoiceCount : 0,
        },
        purchases: {
          total: totalPurchases,
          month: num(lpoMonthAgg._sum.total),
          year:  num(lpoYearAgg._sum.total),
        },
        vat: {
          output:     totalVatOut,
          input:      totalVatIn,
          netPayable: totalVatOut - totalVatIn,
        },
        profit: {
          gross:      grossProfit,
          marginPct:  totalSales > 0 ? (grossProfit / totalSales) * 100 : 0,
        },
        monthly,
        topCustomers: topCustomersRaw.map((r) => ({
          id: r.customerId,
          name: cMap.get(r.customerId)?.name ?? '—',
          code: cMap.get(r.customerId)?.code ?? '',
          revenue: num(r._sum.total),
          invoiceCount: r._count,
        })),
        topProducts: topProductsRaw.map((r) => ({
          id: r.productId,
          name: pMap.get(r.productId)?.name ?? '—',
          sku:  pMap.get(r.productId)?.sku  ?? '',
          quantity: num(r._sum.quantity),
          revenue:  num(r._sum.total),
        })),
        recentInvoices: recentInvoices.map((i) => ({
          id: i.id, number: i.number, date: i.date, status: i.status,
          total: num(i.total), customer: i.customer?.name ?? '—',
        })),
        recentLpos: recentLpos.map((l) => ({
          id: l.id, number: l.number, date: l.date, status: l.status,
          total: num(l.total), supplier: l.supplier?.name ?? '—',
        })),
      },
    });
  }),
);
