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
import { computeLine, sumLines, vatBreakdown } from '../../utils/vat';
import { attachPdfRoute } from '../pdf/pdf.routes';

export const purchaseInvoicesRouter = Router();

const itemSchema = z.object({
  productId: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
  vatRate: z.coerce.number().min(0).max(100).default(5),
});

const createSchema = z.object({
  supplierId: z.string().min(1),
  supplierInvoiceNo: z.string().optional().nullable(),
  date: z.coerce.date().default(() => new Date()),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1, 'Add at least one line item'),
  postNow: z.boolean().default(true),
});

const DETAIL_INCLUDE = {
  supplier: { select: { id: true, code: true, name: true, legalName: true, trn: true, email: true, phone: true, addressLine1: true, addressLine2: true, city: true, country: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } }, orderBy: { position: 'asc' as const } },
} as const;

purchaseInvoicesRouter.get(
  '/',
  requireAuth,
  requirePermission('purchaseinvoice.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const supplierId = typeof req.query.supplierId === 'string' ? req.query.supplierId : undefined;
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
    const statusFilter: Prisma.PurchaseInvoiceWhereInput = statusRaw === 'open'
      ? { status: { in: ['POSTED', 'PART_PAID'] } }
      : statusRaw ? { status: statusRaw as 'DRAFT' | 'POSTED' | 'PAID' | 'PART_PAID' | 'CANCELLED' } : {};
    const where: Prisma.PurchaseInvoiceWhereInput = {
      ...(supplierId ? { supplierId } : {}),
      ...statusFilter,
      ...(q ? { OR: [{ number: { contains: q, mode: 'insensitive' as const } }, { supplierInvoiceNo: { contains: q, mode: 'insensitive' as const } }, { supplier: { name: { contains: q, mode: 'insensitive' as const } } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [sort ?? 'date']: order }, include: { supplier: { select: { id: true, name: true, code: true } } } }),
      prisma.purchaseInvoice.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

purchaseInvoicesRouter.get('/:id', requireAuth, requirePermission('purchaseinvoice.read'), asyncHandler(async (req, res) => {
  const pi = await prisma.purchaseInvoice.findUnique({ where: { id: req.params.id }, include: DETAIL_INCLUDE });
  if (!pi) throw NotFound('Purchase invoice not found');
  res.json({ data: pi });
}));

purchaseInvoicesRouter.post('/', requireAuth, requirePermission('purchaseinvoice.write'), validate(createSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createSchema>;
  const supplier = await prisma.supplier.findFirst({ where: { id: body.supplierId, deletedAt: null } });
  if (!supplier) throw BadRequest('Supplier not found');
  const productIds = [...new Set(body.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const pmap = new Map(products.map((p) => [p.id, p]));
  for (const id of productIds) if (!pmap.has(id)) throw BadRequest(`Product ${id} not found`);

  const computedItems = body.items.map((it, i) => {
    const c = computeLine({ quantity: it.quantity, unitPrice: it.unitCost, discount: 0, vatRate: it.vatRate });
    return {
      position: i,
      productId: it.productId,
      description: it.description ?? pmap.get(it.productId)!.name,
      quantity: it.quantity,
      unitCost: it.unitCost,
      vatRate: it.vatRate,
      subtotal: c.subtotal,
      vatAmount: c.vatAmount,
      total: c.total,
    };
  });
  const totals = sumLines(computedItems);
  const breakdown = vatBreakdown(computedItems);

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, 'PINV', body.date);
    return tx.purchaseInvoice.create({
      data: {
        number,
        supplierInvoiceNo: body.supplierInvoiceNo ?? undefined,
        supplierId: body.supplierId,
        date: body.date,
        dueDate: body.dueDate ?? undefined,
        status: body.postNow ? 'POSTED' : 'DRAFT',
        postedAt: body.postNow ? new Date() : undefined,
        notes: body.notes ?? undefined,
        subtotal: totals.subtotal,
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
}));

purchaseInvoicesRouter.post('/:id/post', requireAuth, requirePermission('purchaseinvoice.write'), asyncHandler(async (req, res) => {
  const pi = await prisma.purchaseInvoice.findUnique({ where: { id: req.params.id } });
  if (!pi) throw NotFound('Purchase invoice not found');
  if (pi.status !== 'DRAFT') throw BadRequest(`Cannot post: invoice is ${pi.status}`);
  const updated = await prisma.purchaseInvoice.update({ where: { id: pi.id }, data: { status: 'POSTED', postedAt: new Date() }, include: DETAIL_INCLUDE });
  res.json({ data: updated });
}));

attachPdfRoute(purchaseInvoicesRouter, 'purchaseinvoice', 'purchaseinvoice.read');
