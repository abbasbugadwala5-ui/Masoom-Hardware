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
import { invalidatePdf } from '../pdf/pdf.service';
import { SALES_PARTY_SELECT } from './sales.helpers';

export const deliveryOrdersRouter = Router();

const doItemSchema = z.object({
  productId: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().positive(),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  warehouseId: z.string().min(1),
  invoiceId: z.string().optional().nullable(),
  date: z.coerce.date().default(() => new Date()),
  deliveryAddress: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  vehicleNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(doItemSchema).min(1, 'Add at least one line item'),
  dispatch: z.boolean().default(false),
});

const DETAIL_INCLUDE = {
  customer: { select: SALES_PARTY_SELECT },
  warehouse: { select: { id: true, code: true, name: true } },
  invoice: { select: { id: true, number: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } }, orderBy: { position: 'asc' as const } },
} as const;

async function dispatchStock(tx: Parameters<typeof postStockBatch>[0], dorder: { id: string; warehouseId: string; items: { productId: string; quantity: unknown }[] }, userId?: string) {
  await postStockBatch(
    tx,
    dorder.items.map((it) => ({
      type: 'SALE_OUT' as const,
      productId: it.productId,
      warehouseId: dorder.warehouseId,
      qtyDelta: -Number(it.quantity),
      refTable: 'DeliveryOrder',
      refId: dorder.id,
      createdBy: userId,
    })),
  );
}

// LIST
deliveryOrdersRouter.get(
  '/',
  requireAuth,
  requirePermission('delivery.read'),
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
      prisma.deliveryOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort ?? 'date']: order },
        include: { customer: { select: { id: true, name: true, code: true } }, warehouse: { select: { id: true, name: true } } },
      }),
      prisma.deliveryOrder.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

// READ ONE
deliveryOrdersRouter.get(
  '/:id',
  requireAuth,
  requirePermission('delivery.read'),
  asyncHandler(async (req, res) => {
    const dorder = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id }, include: DETAIL_INCLUDE });
    if (!dorder) throw NotFound('Delivery order not found');
    res.json({ data: dorder });
  }),
);

// CREATE
deliveryOrdersRouter.post(
  '/',
  requireAuth,
  requirePermission('delivery.write'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const [customer, warehouse] = await Promise.all([
      prisma.customer.findFirst({ where: { id: body.customerId, deletedAt: null } }),
      prisma.warehouse.findUnique({ where: { id: body.warehouseId } }),
    ]);
    if (!customer) throw BadRequest('Customer not found');
    if (!warehouse) throw BadRequest('Warehouse not found');
    if (body.invoiceId) {
      const inv = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });
      if (!inv) throw BadRequest('Invoice not found');
    }

    const created = await prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, 'DO', body.date);
      const dorder = await tx.deliveryOrder.create({
        data: {
          number,
          customerId: body.customerId,
          warehouseId: body.warehouseId,
          invoiceId: body.invoiceId ?? undefined,
          date: body.date,
          deliveryAddress: body.deliveryAddress ?? undefined,
          driverName: body.driverName ?? undefined,
          vehicleNo: body.vehicleNo ?? undefined,
          notes: body.notes ?? undefined,
          status: body.dispatch ? 'DISPATCHED' : 'DRAFT',
          createdBy: req.user?.sub,
          items: {
            create: body.items.map((it, i) => ({
              productId: it.productId,
              description: it.description ?? undefined,
              quantity: it.quantity,
              position: i,
            })),
          },
        },
        include: DETAIL_INCLUDE,
      });
      if (body.dispatch) await dispatchStock(tx, dorder, req.user?.sub);
      return dorder;
    });
    res.status(201).json({ data: created });
  }),
);

// DISPATCH (DRAFT → DISPATCHED, posts stock-out)
deliveryOrdersRouter.post(
  '/:id/dispatch',
  requireAuth,
  requirePermission('delivery.write'),
  asyncHandler(async (req, res) => {
    const dorder = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!dorder) throw NotFound('Delivery order not found');
    if (dorder.status !== 'DRAFT') throw BadRequest(`Cannot dispatch a ${dorder.status} delivery order`);
    const updated = await prisma.$transaction(async (tx) => {
      await dispatchStock(tx, dorder, req.user?.sub);
      return tx.deliveryOrder.update({ where: { id: dorder.id }, data: { status: 'DISPATCHED' }, include: DETAIL_INCLUDE });
    });
    res.json({ data: updated });
  }),
);

// DELIVER (DISPATCHED → DELIVERED)
deliveryOrdersRouter.post(
  '/:id/deliver',
  requireAuth,
  requirePermission('delivery.write'),
  asyncHandler(async (req, res) => {
    const dorder = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id } });
    if (!dorder) throw NotFound('Delivery order not found');
    if (dorder.status !== 'DISPATCHED') throw BadRequest(`Cannot mark delivered: status is ${dorder.status}`);
    const updated = await prisma.deliveryOrder.update({ where: { id: dorder.id }, data: { status: 'DELIVERED' }, include: DETAIL_INCLUDE });
    res.json({ data: updated });
  }),
);

// CANCEL (restores stock if already dispatched)
deliveryOrdersRouter.post(
  '/:id/cancel',
  requireAuth,
  requirePermission('delivery.write'),
  asyncHandler(async (req, res) => {
    const dorder = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!dorder) throw NotFound('Delivery order not found');
    if (dorder.status === 'CANCELLED') throw BadRequest('Already cancelled');
    const wasOut = dorder.status === 'DISPATCHED' || dorder.status === 'DELIVERED';
    const updated = await prisma.$transaction(async (tx) => {
      if (wasOut) {
        await postStockBatch(
          tx,
          dorder.items.map((it) => ({
            type: 'RETURN_IN' as const,
            productId: it.productId,
            warehouseId: dorder.warehouseId,
            qtyDelta: Number(it.quantity),
            refTable: 'DeliveryOrder',
            refId: dorder.id,
            notes: 'Cancellation restock',
            createdBy: req.user?.sub,
          })),
        );
      }
      return tx.deliveryOrder.update({ where: { id: dorder.id }, data: { status: 'CANCELLED' }, include: DETAIL_INCLUDE });
    });
    await invalidatePdf('deliveryorder', dorder.number);
    res.json({ data: updated });
  }),
);

// DELETE (DRAFT only)
deliveryOrdersRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('delivery.write'),
  asyncHandler(async (req, res) => {
    const dorder = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id } });
    if (!dorder) throw NotFound('Delivery order not found');
    if (dorder.status !== 'DRAFT') throw BadRequest(`Cannot delete a ${dorder.status} delivery order`);
    await prisma.deliveryOrder.delete({ where: { id: dorder.id } });
    res.status(204).end();
  }),
);

attachPdfRoute(deliveryOrdersRouter, 'deliveryorder', 'delivery.read');
