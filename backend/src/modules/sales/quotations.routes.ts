import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';
import { nextDocNumber } from '../numbering/numbering.service';
import { attachPdfRoute } from '../pdf/pdf.routes';
import { invalidatePdf } from '../pdf/pdf.service';
import {
  pricedItemSchema,
  resolveAndComputeItems,
  SALES_PARTY_SELECT,
  SALES_ITEMS_INCLUDE,
} from './sales.helpers';

export const quotationsRouter = Router();

const upsertSchema = z.object({
  customerId: z.string().min(1),
  date: z.coerce.date().default(() => new Date()),
  validUntil: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(pricedItemSchema).min(1, 'Add at least one line item'),
  send: z.boolean().default(false),
});

const DETAIL_INCLUDE = {
  customer: { select: SALES_PARTY_SELECT },
  items: SALES_ITEMS_INCLUDE,
} as const;

const EDITABLE = ['DRAFT', 'SENT'] as const;

// LIST
quotationsRouter.get(
  '/',
  requireAuth,
  requirePermission('quotation.read'),
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
      prisma.quotation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort ?? 'date']: order },
        include: { customer: { select: { id: true, name: true, code: true } }, salesOrder: { select: { id: true, number: true } } },
      }),
      prisma.quotation.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

// READ ONE
quotationsRouter.get(
  '/:id',
  requireAuth,
  requirePermission('quotation.read'),
  asyncHandler(async (req, res) => {
    const q = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { ...DETAIL_INCLUDE, salesOrder: { select: { id: true, number: true } } },
    });
    if (!q) throw NotFound('Quotation not found');
    res.json({ data: q });
  }),
);

// CREATE
quotationsRouter.post(
  '/',
  requireAuth,
  requirePermission('quotation.write'),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof upsertSchema>;
    const customer = await prisma.customer.findFirst({ where: { id: body.customerId, deletedAt: null } });
    if (!customer) throw BadRequest('Customer not found');

    const { computedItems, totals, breakdown } = await resolveAndComputeItems(prisma, body.items);

    const created = await prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, 'QT', body.date);
      return tx.quotation.create({
        data: {
          number,
          customerId: body.customerId,
          date: body.date,
          validUntil: body.validUntil ?? undefined,
          notes: body.notes ?? undefined,
          terms: body.terms ?? undefined,
          status: body.send ? 'SENT' : 'DRAFT',
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

// UPDATE (only DRAFT/SENT, before conversion)
quotationsRouter.put(
  '/:id',
  requireAuth,
  requirePermission('quotation.write'),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof upsertSchema>;
    const existing = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { salesOrder: true } });
    if (!existing) throw NotFound('Quotation not found');
    if (existing.salesOrder) throw BadRequest('Quotation already converted to a sales order');
    if (!EDITABLE.includes(existing.status as (typeof EDITABLE)[number])) {
      throw BadRequest(`Cannot edit a ${existing.status} quotation`);
    }

    const { computedItems, totals, breakdown } = await resolveAndComputeItems(prisma, body.items);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: existing.id } });
      return tx.quotation.update({
        where: { id: existing.id },
        data: {
          customerId: body.customerId,
          date: body.date,
          validUntil: body.validUntil ?? null,
          notes: body.notes ?? null,
          terms: body.terms ?? null,
          status: body.send ? 'SENT' : existing.status,
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
    await invalidatePdf('quotation', existing.number);
    res.json({ data: updated });
  }),
);

// STATUS transitions: send / accept / reject / expire
const statusActions: Record<string, { from: string[]; to: string }> = {
  send: { from: ['DRAFT'], to: 'SENT' },
  accept: { from: ['DRAFT', 'SENT'], to: 'ACCEPTED' },
  reject: { from: ['DRAFT', 'SENT'], to: 'REJECTED' },
  expire: { from: ['DRAFT', 'SENT'], to: 'EXPIRED' },
};

quotationsRouter.post(
  '/:id/:action(send|accept|reject|expire)',
  requireAuth,
  requirePermission('quotation.write'),
  asyncHandler(async (req, res) => {
    const action = statusActions[req.params.action as string];
    if (!action) throw BadRequest('Unknown action');
    const q = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!q) throw NotFound('Quotation not found');
    if (!action.from.includes(q.status)) throw BadRequest(`Cannot ${req.params.action} a ${q.status} quotation`);
    const updated = await prisma.quotation.update({
      where: { id: q.id },
      data: { status: action.to as never },
      include: DETAIL_INCLUDE,
    });
    res.json({ data: updated });
  }),
);

// CONVERT → Sales Order
quotationsRouter.post(
  '/:id/convert',
  requireAuth,
  requirePermission('quotation.write'),
  asyncHandler(async (req, res) => {
    const q = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { items: true, salesOrder: true },
    });
    if (!q) throw NotFound('Quotation not found');
    if (q.salesOrder) throw BadRequest(`Already converted to sales order ${q.salesOrder.number}`);
    if (q.status === 'REJECTED' || q.status === 'EXPIRED') throw BadRequest(`Cannot convert a ${q.status} quotation`);

    const so = await prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, 'SO', new Date());
      const order = await tx.salesOrder.create({
        data: {
          number,
          quotationId: q.id,
          customerId: q.customerId,
          status: 'CONFIRMED',
          subtotal: q.subtotal,
          discount: q.discount,
          taxableAmount: q.taxableAmount,
          vatAmount: q.vatAmount,
          total: q.total,
          vatBreakdown: q.vatBreakdown as object,
          createdBy: req.user?.sub,
          items: {
            create: q.items.map((it) => ({
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
      await tx.quotation.update({ where: { id: q.id }, data: { status: 'ACCEPTED' } });
      return order;
    });
    res.status(201).json({ data: so });
  }),
);

// DELETE (DRAFT only)
quotationsRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('quotation.write'),
  asyncHandler(async (req, res) => {
    const q = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { salesOrder: true } });
    if (!q) throw NotFound('Quotation not found');
    if (q.salesOrder) throw BadRequest('Cannot delete: quotation already converted');
    if (q.status !== 'DRAFT') throw BadRequest(`Cannot delete a ${q.status} quotation`);
    await prisma.quotation.delete({ where: { id: q.id } });
    res.status(204).end();
  }),
);

attachPdfRoute(quotationsRouter, 'quotation', 'quotation.read');
