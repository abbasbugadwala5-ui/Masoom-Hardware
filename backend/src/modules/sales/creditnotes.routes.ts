import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';
import { nextDocNumber } from '../numbering/numbering.service';
import { computeLine, sumLines, vatBreakdown } from '../../utils/vat';
import { postStockBatch } from '../inventory/inventory.service';
import { attachPdfRoute } from '../pdf/pdf.routes';
import { SALES_PARTY_SELECT, SALES_ITEMS_INCLUDE } from './sales.helpers';

export const creditNotesRouter = Router();

const cnItemSchema = z.object({
  productId: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  vatRate: z.coerce.number().min(0).max(100).default(5),
  restoreStock: z.boolean().default(false),
});

const createSchema = z.object({
  invoiceId: z.string().min(1),
  date: z.coerce.date().default(() => new Date()),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  warehouseId: z.string().optional().nullable(),
  items: z.array(cnItemSchema).min(1, 'Add at least one line item'),
});

const DETAIL_INCLUDE = {
  customer: { select: SALES_PARTY_SELECT },
  invoice: { select: { id: true, number: true } },
  items: SALES_ITEMS_INCLUDE,
} as const;

// LIST
creditNotesRouter.get(
  '/',
  requireAuth,
  requirePermission('creditnote.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const where = q
      ? {
          OR: [
            { number: { contains: q, mode: 'insensitive' as const } },
            { customer: { name: { contains: q, mode: 'insensitive' as const } } },
            { invoice: { number: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      prisma.creditNote.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort ?? 'date']: order },
        include: { customer: { select: { id: true, name: true, code: true } }, invoice: { select: { id: true, number: true } } },
      }),
      prisma.creditNote.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

// READ ONE
creditNotesRouter.get(
  '/:id',
  requireAuth,
  requirePermission('creditnote.read'),
  asyncHandler(async (req, res) => {
    const cn = await prisma.creditNote.findUnique({ where: { id: req.params.id }, include: DETAIL_INCLUDE });
    if (!cn) throw NotFound('Credit note not found');
    res.json({ data: cn });
  }),
);

// CREATE
creditNotesRouter.post(
  '/',
  requireAuth,
  requirePermission('creditnote.write'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });
    if (!invoice) throw BadRequest('Invoice not found');
    if (invoice.status === 'CANCELLED') throw BadRequest('Cannot credit a cancelled invoice');

    const needsRestock = body.items.some((i) => i.restoreStock);
    if (needsRestock && !body.warehouseId) throw BadRequest('warehouseId is required to restore stock');
    if (body.warehouseId) {
      const wh = await prisma.warehouse.findUnique({ where: { id: body.warehouseId } });
      if (!wh) throw BadRequest('Warehouse not found');
    }

    // Validate products
    const productIds = [...new Set(body.items.map((i) => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const pmap = new Map(products.map((p) => [p.id, p]));
    for (const id of productIds) if (!pmap.has(id)) throw BadRequest(`Product ${id} not found`);

    const computedItems = body.items.map((it, i) => {
      const c = computeLine({ quantity: it.quantity, unitPrice: it.unitPrice, discount: 0, vatRate: it.vatRate });
      return {
        position: i,
        productId: it.productId,
        description: it.description ?? pmap.get(it.productId)!.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatRate: it.vatRate,
        subtotal: c.subtotal,
        vatAmount: c.vatAmount,
        total: c.total,
        restoreStock: it.restoreStock,
      };
    });
    const totals = sumLines(computedItems);
    const breakdown = vatBreakdown(computedItems);

    const created = await prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, 'CN', body.date);
      const cn = await tx.creditNote.create({
        data: {
          number,
          invoiceId: body.invoiceId,
          customerId: invoice.customerId,
          date: body.date,
          reason: body.reason ?? undefined,
          notes: body.notes ?? undefined,
          subtotal: totals.subtotal,
          taxableAmount: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          vatBreakdown: breakdown as unknown as object,
          createdBy: req.user?.sub,
          items: { create: computedItems },
        },
        include: DETAIL_INCLUDE,
      });
      if (body.warehouseId) {
        const restockItems = computedItems.filter((it) => it.restoreStock);
        if (restockItems.length) {
          await postStockBatch(
            tx,
            restockItems.map((it) => ({
              type: 'RETURN_IN' as const,
              productId: it.productId,
              warehouseId: body.warehouseId!,
              qtyDelta: Number(it.quantity),
              refTable: 'CreditNote',
              refId: cn.id,
              notes: 'Sales return',
              createdBy: req.user?.sub,
            })),
          );
        }
      }
      return cn;
    });
    res.status(201).json({ data: created });
  }),
);

attachPdfRoute(creditNotesRouter, 'creditnote', 'creditnote.read');
