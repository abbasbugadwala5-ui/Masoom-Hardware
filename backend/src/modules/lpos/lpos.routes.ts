import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';
import { nextDocNumber } from '../numbering/numbering.service';
import { computeLine, sumLines } from '../../utils/vat';
import { attachPdfRoute } from '../pdf/pdf.routes';

export const lposRouter = Router();

const itemSchema = z.object({
  productId:    z.string().min(1),
  description:  z.string().optional().nullable(),
  quantity:     z.coerce.number().positive(),
  unitPrice:    z.coerce.number().nonnegative(),
  vatRate:      z.coerce.number().min(0).max(100).default(5),
});

const createSchema = z.object({
  supplierId:  z.string().min(1),
  date:        z.coerce.date().default(() => new Date()),
  notes:       z.string().optional().nullable(),
  items:       z.array(itemSchema).min(1, 'Add at least one line item'),
  sendNow:     z.boolean().default(true),
});

const LPO_INCLUDE = {
  supplier: { select: { id: true, code: true, name: true, legalName: true, trn: true, email: true, phone: true, addressLine1: true, city: true, country: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } }, orderBy: { position: 'asc' as const } },
} as const;

lposRouter.get(
  '/',
  requireAuth,
  requirePermission('lpo.write'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const where = q ? {
      OR: [
        { number: { contains: q, mode: 'insensitive' as const } },
        { supplier: { name: { contains: q, mode: 'insensitive' as const } } },
      ],
    } : {};
    const [rows, total] = await Promise.all([
      prisma.lpo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort ?? 'date']: order },
        include: { supplier: { select: { id: true, name: true, code: true } } },
      }),
      prisma.lpo.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

lposRouter.get(
  '/:id',
  requireAuth,
  requirePermission('lpo.write'),
  asyncHandler(async (req, res) => {
    const lpo = await prisma.lpo.findUnique({
      where: { id: req.params.id },
      include: LPO_INCLUDE,
    });
    if (!lpo) throw NotFound('LPO not found');
    res.json({ data: lpo });
  }),
);

lposRouter.post(
  '/',
  requireAuth,
  requirePermission('lpo.write'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;

    const supplier = await prisma.supplier.findFirst({ where: { id: body.supplierId, deletedAt: null } });
    if (!supplier) throw BadRequest('Supplier not found');

    const productIds = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, deletedAt: null } });
    const pmap = new Map(products.map((p) => [p.id, p]));
    for (const id of productIds) {
      if (!pmap.has(id)) throw BadRequest(`Product ${id} not found`);
    }

    const computedItems = body.items.map((it, i) => {
      const c = computeLine({ ...it, discount: 0 });
      return {
        position:    i,
        productId:   it.productId,
        description: it.description ?? pmap.get(it.productId)!.name,
        quantity:    it.quantity,
        unitPrice:   it.unitPrice,
        vatRate:     it.vatRate,
        subtotal:    c.subtotal,
        vatAmount:   c.vatAmount,
        total:       c.total,
      };
    });
    const totals = sumLines(computedItems);

    const result = await prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, 'LPO', body.date);
      const lpo = await tx.lpo.create({
        data: {
          number,
          supplierId: body.supplierId,
          date: body.date,
          notes: body.notes ?? undefined,
          status: body.sendNow ? 'SENT' : 'DRAFT',
          subtotal:  totals.subtotal,
          vatAmount: totals.vatAmount,
          total:     totals.total,
          createdBy: req.user?.sub,
          items: { create: computedItems },
        },
        include: LPO_INCLUDE,
      });
      return lpo;
    });

    res.status(201).json({ data: result });
  }),
);

// STATUS: send / receive / cancel
const lpoActions: Record<string, { from: string[]; to: string }> = {
  send: { from: ['DRAFT'], to: 'SENT' },
  receive: { from: ['DRAFT', 'SENT'], to: 'RECEIVED' },
  cancel: { from: ['DRAFT', 'SENT'], to: 'CANCELLED' },
};

lposRouter.post(
  '/:id/:action(send|receive|cancel)',
  requireAuth,
  requirePermission('lpo.write'),
  asyncHandler(async (req, res) => {
    const action = lpoActions[req.params.action as string];
    if (!action) throw BadRequest('Unknown action');
    const lpo = await prisma.lpo.findUnique({ where: { id: req.params.id } });
    if (!lpo) throw NotFound('LPO not found');
    if (!action.from.includes(lpo.status)) throw BadRequest(`Cannot ${req.params.action} a ${lpo.status} LPO`);
    const updated = await prisma.lpo.update({ where: { id: lpo.id }, data: { status: action.to as never }, include: LPO_INCLUDE });
    res.json({ data: updated });
  }),
);

lposRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('lpo.write'),
  asyncHandler(async (req, res) => {
    const lpo = await prisma.lpo.findUnique({ where: { id: req.params.id } });
    if (!lpo) throw NotFound('LPO not found');
    if (lpo.status !== 'DRAFT') throw BadRequest(`Cannot delete: LPO is ${lpo.status}.`);
    await prisma.lpo.delete({ where: { id: lpo.id } });
    res.status(204).end();
  }),
);

attachPdfRoute(lposRouter, 'lpo', 'lpo.write');
