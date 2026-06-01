import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';
import { nextDocNumber } from '../numbering/numbering.service';
import { postStock, postStockBatch } from './inventory.service';

export const inventoryRouter = Router();

/* STOCK LEVELS — one row per product, quantities summed across (or filtered to) warehouses. */
inventoryRouter.get(
  '/',
  requireAuth,
  requirePermission('inventory.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const warehouseId = typeof req.query.warehouseId === 'string' ? req.query.warehouseId : undefined;
    const lowOnly = req.query.low === '1' || req.query.low === 'true';

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { sku: { contains: q, mode: 'insensitive' as const } }] } : {}),
    };
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: { inventory: { where: warehouseId ? { warehouseId } : undefined, include: { warehouse: { select: { id: true, code: true, name: true } } } } },
      }),
      prisma.product.count({ where }),
    ]);

    const rows = products.map((p) => {
      const onHand = p.inventory.reduce((s, i) => s + Number(i.quantity), 0);
      return {
        id: p.id, sku: p.sku, name: p.name, unit: p.unit,
        reorderLevel: p.reorderLevel, costPrice: p.costPrice,
        onHand,
        low: p.reorderLevel > 0 && onHand <= p.reorderLevel,
        byWarehouse: p.inventory.map((i) => ({ warehouseId: i.warehouseId, warehouse: i.warehouse.name, quantity: Number(i.quantity) })),
      };
    }).filter((r) => (lowOnly ? r.low : true));

    res.json(paginate(rows, total, page, pageSize));
  }),
);

/* STOCK LOGS — movement history for a product. */
inventoryRouter.get(
  '/logs',
  requireAuth,
  requirePermission('inventory.read'),
  asyncHandler(async (req, res) => {
    const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
    const logs = await prisma.stockLog.findMany({
      where: { ...(productId ? { productId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { product: { select: { sku: true, name: true } }, warehouse: { select: { name: true } } },
    });
    res.json({ data: logs });
  }),
);

/* ADJUST — manual correction or damage write-off. */
const adjustSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  qtyDelta: z.coerce.number().refine((n) => n !== 0, 'qtyDelta cannot be zero'),
  type: z.enum(['ADJUSTMENT', 'DAMAGE', 'OPENING']).default('ADJUSTMENT'),
  notes: z.string().optional().nullable(),
});

inventoryRouter.post(
  '/adjust',
  requireAuth,
  requirePermission('inventory.adjust'),
  validate(adjustSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof adjustSchema>;
    const [product, warehouse] = await Promise.all([
      prisma.product.findFirst({ where: { id: body.productId, deletedAt: null } }),
      prisma.warehouse.findUnique({ where: { id: body.warehouseId } }),
    ]);
    if (!product) throw BadRequest('Product not found');
    if (!warehouse) throw BadRequest('Warehouse not found');

    await prisma.$transaction(async (tx) => {
      await postStock(tx, {
        type: body.type,
        productId: body.productId,
        warehouseId: body.warehouseId,
        qtyDelta: body.qtyDelta,
        refTable: 'Adjustment',
        notes: body.notes ?? undefined,
        createdBy: req.user?.sub,
      });
    });
    const item = await prisma.inventoryItem.findUnique({ where: { productId_warehouseId: { productId: body.productId, warehouseId: body.warehouseId } } });
    res.json({ data: { onHand: Number(item?.quantity ?? 0) } });
  }),
);

/* TRANSFER — move stock between two warehouses. */
const transferSchema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  date: z.coerce.date().default(() => new Date()),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().positive() })).min(1),
});

inventoryRouter.post(
  '/transfer',
  requireAuth,
  requirePermission('inventory.transfer'),
  validate(transferSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof transferSchema>;
    if (body.fromWarehouseId === body.toWarehouseId) throw BadRequest('Source and destination must differ');
    const whs = await prisma.warehouse.findMany({ where: { id: { in: [body.fromWarehouseId, body.toWarehouseId] } } });
    if (whs.length !== 2) throw BadRequest('Warehouse not found');

    const created = await prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, 'TRF', body.date);
      const transfer = await tx.stockTransfer.create({
        data: {
          number,
          fromWarehouseId: body.fromWarehouseId,
          toWarehouseId: body.toWarehouseId,
          date: body.date,
          notes: body.notes ?? undefined,
          createdBy: req.user?.sub,
          items: { create: body.items.map((it) => ({ productId: it.productId, quantity: it.quantity })) },
        },
      });
      await postStockBatch(tx, body.items.flatMap((it) => [
        { type: 'TRANSFER_OUT' as const, productId: it.productId, warehouseId: body.fromWarehouseId, qtyDelta: -it.quantity, refTable: 'StockTransfer', refId: transfer.id, createdBy: req.user?.sub },
        { type: 'TRANSFER_IN' as const, productId: it.productId, warehouseId: body.toWarehouseId, qtyDelta: it.quantity, refTable: 'StockTransfer', refId: transfer.id, createdBy: req.user?.sub },
      ]));
      return transfer;
    });
    res.status(201).json({ data: created });
  }),
);
