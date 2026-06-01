import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';
import { nextDocNumber } from '../numbering/numbering.service';
import { buildQrPayload } from '../pdf/fta-qr';
import { getCompany } from '../pdf/company';
import { attachPdfRoute } from '../pdf/pdf.routes';
import { invalidatePdf } from '../pdf/pdf.service';
import {
  pricedItemSchema,
  resolveAndComputeItems,
  SALES_PARTY_SELECT,
  SALES_ITEMS_INCLUDE,
} from './sales.helpers';

export const salesOrdersRouter = Router();

const upsertSchema = z.object({
  customerId: z.string().min(1),
  date: z.coerce.date().default(() => new Date()),
  notes: z.string().optional().nullable(),
  items: z.array(pricedItemSchema).min(1, 'Add at least one line item'),
  confirm: z.boolean().default(false),
});

const DETAIL_INCLUDE = {
  customer: { select: SALES_PARTY_SELECT },
  items: SALES_ITEMS_INCLUDE,
  quotation: { select: { id: true, number: true } },
  invoice: { select: { id: true, number: true } },
} as const;

// LIST
salesOrdersRouter.get(
  '/',
  requireAuth,
  requirePermission('salesorder.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const where = q
      ? {
          OR: [
            { number: { contains: q, mode: 'insensitive' as const } },
            { customer: { name: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort ?? 'date']: order },
        include: { customer: { select: { id: true, name: true, code: true } }, invoice: { select: { id: true, number: true } } },
      }),
      prisma.salesOrder.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

// READ ONE
salesOrdersRouter.get(
  '/:id',
  requireAuth,
  requirePermission('salesorder.read'),
  asyncHandler(async (req, res) => {
    const so = await prisma.salesOrder.findUnique({ where: { id: req.params.id }, include: DETAIL_INCLUDE });
    if (!so) throw NotFound('Sales order not found');
    res.json({ data: so });
  }),
);

// CREATE (direct)
salesOrdersRouter.post(
  '/',
  requireAuth,
  requirePermission('salesorder.write'),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof upsertSchema>;
    const customer = await prisma.customer.findFirst({ where: { id: body.customerId, deletedAt: null } });
    if (!customer) throw BadRequest('Customer not found');

    const { computedItems, totals, breakdown } = await resolveAndComputeItems(prisma, body.items);

    const created = await prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, 'SO', body.date);
      return tx.salesOrder.create({
        data: {
          number,
          customerId: body.customerId,
          date: body.date,
          notes: body.notes ?? undefined,
          status: body.confirm ? 'CONFIRMED' : 'DRAFT',
          subtotal: totals.subtotal,
          discount: 0,
          taxableAmount: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          vatBreakdown: breakdown as unknown as object,
          createdBy: req.user?.sub,
          items: { create: computedItems },
        },
        include: DETAIL_INCLUDE,
      });
    });
    res.status(201).json({ data: created });
  }),
);

// UPDATE (DRAFT/CONFIRMED, before invoicing)
salesOrdersRouter.put(
  '/:id',
  requireAuth,
  requirePermission('salesorder.write'),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof upsertSchema>;
    const existing = await prisma.salesOrder.findUnique({ where: { id: req.params.id }, include: { invoice: true } });
    if (!existing) throw NotFound('Sales order not found');
    if (existing.invoice) throw BadRequest('Sales order already invoiced');
    if (existing.status === 'CANCELLED') throw BadRequest('Cannot edit a cancelled sales order');

    const { computedItems, totals, breakdown } = await resolveAndComputeItems(prisma, body.items);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: existing.id } });
      return tx.salesOrder.update({
        where: { id: existing.id },
        data: {
          customerId: body.customerId,
          date: body.date,
          notes: body.notes ?? null,
          status: body.confirm ? 'CONFIRMED' : existing.status,
          subtotal: totals.subtotal,
          taxableAmount: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          vatBreakdown: breakdown as unknown as object,
          items: { create: computedItems },
        },
        include: DETAIL_INCLUDE,
      });
    });
    await invalidatePdf('salesorder', existing.number);
    res.json({ data: updated });
  }),
);

// CONFIRM
salesOrdersRouter.post(
  '/:id/confirm',
  requireAuth,
  requirePermission('salesorder.write'),
  asyncHandler(async (req, res) => {
    const so = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    if (!so) throw NotFound('Sales order not found');
    if (so.status !== 'DRAFT') throw BadRequest(`Cannot confirm a ${so.status} sales order`);
    const updated = await prisma.salesOrder.update({ where: { id: so.id }, data: { status: 'CONFIRMED' }, include: DETAIL_INCLUDE });
    res.json({ data: updated });
  }),
);

// CANCEL
salesOrdersRouter.post(
  '/:id/cancel',
  requireAuth,
  requirePermission('salesorder.write'),
  asyncHandler(async (req, res) => {
    const so = await prisma.salesOrder.findUnique({ where: { id: req.params.id }, include: { invoice: true } });
    if (!so) throw NotFound('Sales order not found');
    if (so.invoice) throw BadRequest('Cannot cancel: already invoiced');
    if (so.status === 'INVOICED') throw BadRequest('Cannot cancel an invoiced sales order');
    const updated = await prisma.salesOrder.update({ where: { id: so.id }, data: { status: 'CANCELLED' }, include: DETAIL_INCLUDE });
    res.json({ data: updated });
  }),
);

// CONVERT → Tax Invoice
const convertSchema = z.object({
  date: z.coerce.date().default(() => new Date()),
  dueDate: z.coerce.date().optional().nullable(),
  terms: z.string().optional().nullable(),
});

salesOrdersRouter.post(
  '/:id/invoice',
  requireAuth,
  requirePermission('invoice.create'),
  validate(convertSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof convertSchema>;
    const so = await prisma.salesOrder.findUnique({ where: { id: req.params.id }, include: { items: true, invoice: true } });
    if (!so) throw NotFound('Sales order not found');
    if (so.invoice) throw BadRequest(`Already invoiced as ${so.invoice.number}`);
    if (so.status === 'CANCELLED') throw BadRequest('Cannot invoice a cancelled sales order');

    const company = await getCompany();

    const invoice = await prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, 'INV', body.date);
      const qrPayload = buildQrPayload({
        sellerName: company.legalName,
        trn: company.trn,
        timestamp: body.date,
        total: Number(so.total),
        vatAmount: Number(so.vatAmount),
      });
      const inv = await tx.invoice.create({
        data: {
          number,
          salesOrderId: so.id,
          customerId: so.customerId,
          date: body.date,
          dueDate: body.dueDate ?? undefined,
          terms: body.terms ?? undefined,
          status: 'POSTED',
          postedAt: new Date(),
          subtotal: so.subtotal,
          discount: so.discount,
          taxableAmount: so.taxableAmount,
          vatAmount: so.vatAmount,
          total: so.total,
          vatBreakdown: so.vatBreakdown as object,
          qrPayload,
          createdBy: req.user?.sub,
          items: {
            create: so.items.map((it) => ({
              productId: it.productId,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discount: it.discount,
              vatRate: it.vatRate,
              subtotal: it.subtotal,
              vatAmount: it.vatAmount,
              total: it.total,
              position: it.position,
            })),
          },
        },
        include: { customer: { select: SALES_PARTY_SELECT }, items: SALES_ITEMS_INCLUDE },
      });
      await tx.salesOrder.update({ where: { id: so.id }, data: { status: 'INVOICED' } });
      return inv;
    });
    res.status(201).json({ data: invoice });
  }),
);

// DELETE (DRAFT only)
salesOrdersRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('salesorder.write'),
  asyncHandler(async (req, res) => {
    const so = await prisma.salesOrder.findUnique({ where: { id: req.params.id }, include: { invoice: true } });
    if (!so) throw NotFound('Sales order not found');
    if (so.invoice) throw BadRequest('Cannot delete: already invoiced');
    if (so.status !== 'DRAFT') throw BadRequest(`Cannot delete a ${so.status} sales order`);
    await prisma.salesOrder.delete({ where: { id: so.id } });
    res.status(204).end();
  }),
);

attachPdfRoute(salesOrdersRouter, 'salesorder', 'salesorder.read');
