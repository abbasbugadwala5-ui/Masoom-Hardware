import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';
import { nextDocNumber } from '../numbering/numbering.service';
import { attachPdfRoute } from '../pdf/pdf.routes';
import { SALES_PARTY_SELECT } from '../sales/sales.helpers';

export const paymentsRouter = Router();

const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

const allocationSchema = z.object({
  invoiceId: z.string().optional().nullable(),
  purchaseInvoiceId: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
});

const createSchema = z
  .object({
    direction: z.enum(['RECEIVED', 'PAID']),
    method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE', 'OTHER']),
    date: z.coerce.date().default(() => new Date()),
    amount: z.coerce.number().positive(),
    reference: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    customerId: z.string().optional().nullable(),
    supplierId: z.string().optional().nullable(),
    allocations: z.array(allocationSchema).default([]),
  })
  .refine((b) => (b.direction === 'RECEIVED' ? !!b.customerId : !!b.supplierId), {
    message: 'customerId is required for receipts, supplierId for payments',
  });

const DETAIL_INCLUDE = {
  customer: { select: SALES_PARTY_SELECT },
  supplier: { select: SALES_PARTY_SELECT },
  allocations: {
    include: {
      invoice: { select: { id: true, number: true, total: true, amountPaid: true } },
      purchaseInvoice: { select: { id: true, number: true, total: true, amountPaid: true } },
    },
  },
} as const;

/** Recompute an invoice's paid-status from its amountPaid vs total. */
function settledStatus(total: Prisma.Decimal, amountPaid: Prisma.Decimal): 'PAID' | 'PART_PAID' | 'POSTED' {
  if (amountPaid.gte(total)) return 'PAID';
  if (amountPaid.gt(0)) return 'PART_PAID';
  return 'POSTED';
}

// LIST
paymentsRouter.get(
  '/',
  requireAuth,
  requirePermission('payment.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const direction = typeof req.query.direction === 'string' ? req.query.direction : undefined;
    const where: Prisma.PaymentWhereInput = {
      ...(direction === 'RECEIVED' || direction === 'PAID' ? { direction } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: 'insensitive' as const } },
              { reference: { contains: q, mode: 'insensitive' as const } },
              { customer: { name: { contains: q, mode: 'insensitive' as const } } },
              { supplier: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort ?? 'date']: order },
        include: { customer: { select: { id: true, name: true, code: true } }, supplier: { select: { id: true, name: true, code: true } } },
      }),
      prisma.payment.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

// READ ONE
paymentsRouter.get(
  '/:id',
  requireAuth,
  requirePermission('payment.read'),
  asyncHandler(async (req, res) => {
    const p = await prisma.payment.findUnique({ where: { id: req.params.id }, include: DETAIL_INCLUDE });
    if (!p) throw NotFound('Payment not found');
    res.json({ data: p });
  }),
);

// CREATE (receipt or payment voucher)
paymentsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res, next) => {
    // Permission depends on direction.
    const dir = (req.body as { direction?: string }).direction;
    const key = dir === 'PAID' ? 'payment.pay' : 'payment.receive';
    requirePermission(key)(req, res, next);
  }),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;

    // Validate party
    if (body.direction === 'RECEIVED') {
      const c = await prisma.customer.findFirst({ where: { id: body.customerId!, deletedAt: null } });
      if (!c) throw BadRequest('Customer not found');
    } else {
      const s = await prisma.supplier.findFirst({ where: { id: body.supplierId!, deletedAt: null } });
      if (!s) throw BadRequest('Supplier not found');
    }

    const allocTotal = round2(body.allocations.reduce((s, a) => s + a.amount, 0));
    if (allocTotal > round2(body.amount)) throw BadRequest('Allocations exceed payment amount');

    const created = await prisma.$transaction(async (tx) => {
      const prefix = body.direction === 'RECEIVED' ? 'RV' : 'PV';
      const number = await nextDocNumber(tx, prefix, body.date);

      const payment = await tx.payment.create({
        data: {
          number,
          direction: body.direction,
          method: body.method,
          date: body.date,
          amount: body.amount,
          reference: body.reference ?? undefined,
          notes: body.notes ?? undefined,
          customerId: body.direction === 'RECEIVED' ? body.customerId! : undefined,
          supplierId: body.direction === 'PAID' ? body.supplierId! : undefined,
          createdBy: req.user?.sub,
          allocations: {
            create: body.allocations.map((a) => ({
              invoiceId: a.invoiceId ?? undefined,
              purchaseInvoiceId: a.purchaseInvoiceId ?? undefined,
              amount: a.amount,
            })),
          },
        },
        include: DETAIL_INCLUDE,
      });

      // Apply each allocation to its target document.
      for (const a of body.allocations) {
        if (body.direction === 'RECEIVED') {
          if (!a.invoiceId) throw BadRequest('Receipt allocations must reference an invoiceId');
          const inv = await tx.invoice.findUnique({ where: { id: a.invoiceId } });
          if (!inv) throw BadRequest(`Invoice ${a.invoiceId} not found`);
          if (inv.customerId !== body.customerId) throw BadRequest('Invoice does not belong to this customer');
          if (inv.status === 'CANCELLED' || inv.status === 'DRAFT') throw BadRequest(`Cannot allocate to a ${inv.status} invoice`);
          const newPaid = inv.amountPaid.add(new Prisma.Decimal(a.amount));
          if (newPaid.gt(inv.total)) throw BadRequest(`Allocation exceeds outstanding on invoice ${inv.number}`);
          await tx.invoice.update({
            where: { id: inv.id },
            data: { amountPaid: newPaid, status: settledStatus(inv.total, newPaid) },
          });
        } else {
          if (!a.purchaseInvoiceId) throw BadRequest('Payment allocations must reference a purchaseInvoiceId');
          const pi = await tx.purchaseInvoice.findUnique({ where: { id: a.purchaseInvoiceId } });
          if (!pi) throw BadRequest(`Purchase invoice ${a.purchaseInvoiceId} not found`);
          if (pi.supplierId !== body.supplierId) throw BadRequest('Purchase invoice does not belong to this supplier');
          const newPaid = pi.amountPaid.add(new Prisma.Decimal(a.amount));
          if (newPaid.gt(pi.total)) throw BadRequest(`Allocation exceeds outstanding on ${pi.number}`);
          await tx.purchaseInvoice.update({
            where: { id: pi.id },
            data: { amountPaid: newPaid, status: settledStatus(pi.total, newPaid) },
          });
        }
      }
      return payment;
    });
    res.status(201).json({ data: created });
  }),
);

attachPdfRoute(paymentsRouter, 'payment', 'payment.read');
