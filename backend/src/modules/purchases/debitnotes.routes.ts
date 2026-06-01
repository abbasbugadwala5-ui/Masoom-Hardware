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

export const debitNotesRouter = Router();

const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
  reduceStock: z.boolean().default(false),
});

const createSchema = z.object({
  purchaseInvoiceId: z.string().min(1),
  date: z.coerce.date().default(() => new Date()),
  reason: z.string().optional().nullable(),
  warehouseId: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1, 'Add at least one line item'),
});

const DETAIL_INCLUDE = {
  supplier: { select: { id: true, code: true, name: true, legalName: true, trn: true, email: true, phone: true, addressLine1: true, city: true, country: true } },
  purchaseInvoice: { select: { id: true, number: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
} as const;

debitNotesRouter.get(
  '/',
  requireAuth,
  requirePermission('debitnote.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const where = q ? { OR: [{ number: { contains: q, mode: 'insensitive' as const } }, { supplier: { name: { contains: q, mode: 'insensitive' as const } } }] } : {};
    const [rows, total] = await Promise.all([
      prisma.debitNote.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [sort ?? 'date']: order }, include: { supplier: { select: { id: true, name: true, code: true } }, purchaseInvoice: { select: { id: true, number: true } } } }),
      prisma.debitNote.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

debitNotesRouter.get('/:id', requireAuth, requirePermission('debitnote.read'), asyncHandler(async (req, res) => {
  const dn = await prisma.debitNote.findUnique({ where: { id: req.params.id }, include: DETAIL_INCLUDE });
  if (!dn) throw NotFound('Debit note not found');
  res.json({ data: dn });
}));

debitNotesRouter.post('/', requireAuth, requirePermission('debitnote.write'), validate(createSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createSchema>;
  const pi = await prisma.purchaseInvoice.findUnique({ where: { id: body.purchaseInvoiceId } });
  if (!pi) throw BadRequest('Purchase invoice not found');
  const needsStock = body.items.some((i) => i.reduceStock);
  if (needsStock && !body.warehouseId) throw BadRequest('warehouseId is required to reduce stock');
  if (body.warehouseId) {
    const wh = await prisma.warehouse.findUnique({ where: { id: body.warehouseId } });
    if (!wh) throw BadRequest('Warehouse not found');
  }
  const productIds = [...new Set(body.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) throw BadRequest('One or more products not found');

  const items = body.items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitCost: it.unitCost, total: round2(it.quantity * it.unitCost), reduceStock: it.reduceStock }));
  const total = round2(items.reduce((s, it) => s + it.total, 0));

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, 'DN', body.date);
    const dn = await tx.debitNote.create({
      data: {
        number,
        purchaseInvoiceId: body.purchaseInvoiceId,
        supplierId: pi.supplierId,
        date: body.date,
        reason: body.reason ?? undefined,
        total,
        createdBy: req.user?.sub,
        items: { create: items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitCost: it.unitCost, total: it.total })) },
      },
      include: DETAIL_INCLUDE,
    });
    const stockItems = items.filter((it) => it.reduceStock);
    if (body.warehouseId && stockItems.length) {
      await postStockBatch(tx, stockItems.map((it) => ({
        type: 'RETURN_OUT' as const,
        productId: it.productId,
        warehouseId: body.warehouseId!,
        qtyDelta: -it.quantity,
        refTable: 'DebitNote',
        refId: dn.id,
        notes: 'Purchase return',
        createdBy: req.user?.sub,
      })));
    }
    return dn;
  });
  res.status(201).json({ data: created });
}));

attachPdfRoute(debitNotesRouter, 'debitnote', 'debitnote.read');
