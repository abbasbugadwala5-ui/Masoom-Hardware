import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';
import { nextDocNumber } from '../numbering/numbering.service';
import { postStockBatch } from '../inventory/inventory.service';
import { attachPdfRoute } from '../pdf/pdf.routes';

export const grnsRouter = Router();

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().default(0),
});

const createSchema = z.object({
  warehouseId: z.string().min(1),
  lpoId: z.string().optional().nullable(),
  date: z.coerce.date().default(() => new Date()),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1, 'Add at least one line item'),
  markLpoReceived: z.boolean().default(true),
});

const DETAIL_INCLUDE = {
  warehouse: { select: { id: true, code: true, name: true } },
  lpo: { select: { id: true, number: true, supplier: { select: { id: true, name: true, code: true } } } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
} as const;

grnsRouter.get(
  '/',
  requireAuth,
  requirePermission('grn.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const where = q ? { OR: [{ number: { contains: q, mode: 'insensitive' as const } }, { lpo: { number: { contains: q, mode: 'insensitive' as const } } }] } : {};
    const [rows, total] = await Promise.all([
      prisma.grn.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [sort ?? 'date']: order }, include: { warehouse: { select: { id: true, name: true } }, lpo: { select: { id: true, number: true } } } }),
      prisma.grn.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

grnsRouter.get('/:id', requireAuth, requirePermission('grn.read'), asyncHandler(async (req, res) => {
  const grn = await prisma.grn.findUnique({ where: { id: req.params.id }, include: DETAIL_INCLUDE });
  if (!grn) throw NotFound('GRN not found');
  res.json({ data: grn });
}));

grnsRouter.post('/', requireAuth, requirePermission('grn.write'), validate(createSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createSchema>;
  const warehouse = await prisma.warehouse.findUnique({ where: { id: body.warehouseId } });
  if (!warehouse) throw BadRequest('Warehouse not found');
  if (body.lpoId) {
    const lpo = await prisma.lpo.findUnique({ where: { id: body.lpoId } });
    if (!lpo) throw BadRequest('LPO not found');
  }
  const productIds = [...new Set(body.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) throw BadRequest('One or more products not found');

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, 'GRN', body.date);
    const grn = await tx.grn.create({
      data: {
        number,
        warehouseId: body.warehouseId,
        lpoId: body.lpoId ?? undefined,
        date: body.date,
        notes: body.notes ?? undefined,
        createdBy: req.user?.sub,
        items: { create: body.items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitCost: it.unitCost })) },
      },
      include: DETAIL_INCLUDE,
    });
    await postStockBatch(tx, body.items.map((it) => ({
      type: 'PURCHASE_IN' as const,
      productId: it.productId,
      warehouseId: body.warehouseId,
      qtyDelta: it.quantity,
      refTable: 'Grn',
      refId: grn.id,
      createdBy: req.user?.sub,
    })));
    if (body.lpoId && body.markLpoReceived) {
      await tx.lpo.update({ where: { id: body.lpoId }, data: { status: 'RECEIVED' } });
    }
    return grn;
  });
  res.status(201).json({ data: created });
}));

attachPdfRoute(grnsRouter, 'grn', 'grn.read');
