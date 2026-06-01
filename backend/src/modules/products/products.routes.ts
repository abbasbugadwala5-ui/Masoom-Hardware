import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';

export const productsRouter = Router();

const upsertSchema = z.object({
  sku:          z.string().min(1).max(64),
  barcode:      z.string().optional().nullable(),
  name:         z.string().min(1).max(200),
  description:  z.string().optional().nullable(),
  categoryId:   z.string().optional().nullable(),
  brandId:      z.string().optional().nullable(),
  unit:         z.string().default('PCS'),
  costPrice:    z.coerce.number().nonnegative().default(0),
  sellingPrice: z.coerce.number().nonnegative().default(0),
  vatRate:      z.coerce.number().min(0).max(100).default(5),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  isActive:     z.boolean().default(true),
});

// LIST
productsRouter.get(
  '/',
  requireAuth,
  requirePermission('product.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const where = {
      deletedAt: null,
      ...(q
        ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { sku: { contains: q, mode: 'insensitive' as const } }] }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort ?? 'createdAt']: order },
        include: { category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } } },
      }),
      prisma.product.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

// READ ONE
productsRouter.get(
  '/:id',
  requireAuth,
  requirePermission('product.read'),
  asyncHandler(async (req, res) => {
    const p = await prisma.product.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { category: true, brand: true },
    });
    if (!p) throw NotFound('Product not found');
    res.json({ data: p });
  }),
);

// CREATE
productsRouter.post(
  '/',
  requireAuth,
  requirePermission('product.write'),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof upsertSchema>;
    const exists = await prisma.product.findUnique({ where: { sku: body.sku } });
    if (exists) throw BadRequest(`SKU "${body.sku}" already exists`);
    const created = await prisma.product.create({ data: body });
    res.status(201).json({ data: created });
  }),
);

// UPDATE
productsRouter.put(
  '/:id',
  requireAuth,
  requirePermission('product.write'),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof upsertSchema>;
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) throw NotFound('Product not found');
    if (body.sku !== existing.sku) {
      const dup = await prisma.product.findUnique({ where: { sku: body.sku } });
      if (dup) throw BadRequest(`SKU "${body.sku}" already exists`);
    }
    const updated = await prisma.product.update({ where: { id: req.params.id }, data: body });
    res.json({ data: updated });
  }),
);

// SOFT DELETE
productsRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('product.delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) throw NotFound('Product not found');
    await prisma.product.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), isActive: false } });
    res.status(204).end();
  }),
);
