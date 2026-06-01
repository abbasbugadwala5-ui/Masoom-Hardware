import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';

export const suppliersRouter = Router();

const upsertSchema = z.object({
  code:          z.string().min(1).max(64),
  name:          z.string().min(1).max(200),
  legalName:     z.string().optional().nullable(),
  trn:           z.string().regex(/^\d{15}$/).optional().nullable().or(z.literal('')),
  email:         z.string().email().optional().nullable().or(z.literal('')),
  phone:         z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  addressLine1:  z.string().optional().nullable(),
  addressLine2:  z.string().optional().nullable(),
  city:          z.string().optional().nullable(),
  country:       z.string().default('United Arab Emirates'),
  creditDays:    z.coerce.number().int().min(0).default(0),
  openingBalance:z.coerce.number().default(0),
  notes:         z.string().optional().nullable(),
  isActive:      z.boolean().default(true),
});

suppliersRouter.get(
  '/',
  requireAuth,
  requirePermission('supplier.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const where = {
      deletedAt: null,
      ...(q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { code: { contains: q, mode: 'insensitive' as const } },
          { phone:{ contains: q } },
        ],
      } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.supplier.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [sort ?? 'createdAt']: order } }),
      prisma.supplier.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

suppliersRouter.get('/:id', requireAuth, requirePermission('supplier.read'), asyncHandler(async (req, res) => {
  const s = await prisma.supplier.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!s) throw NotFound('Supplier not found');
  res.json({ data: s });
}));

suppliersRouter.post('/', requireAuth, requirePermission('supplier.write'), validate(upsertSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof upsertSchema>;
  const data = { ...body, trn: body.trn || null, email: body.email || null };
  const dup = await prisma.supplier.findUnique({ where: { code: data.code } });
  if (dup) throw BadRequest(`Supplier code "${data.code}" already exists`);
  res.status(201).json({ data: await prisma.supplier.create({ data }) });
}));

suppliersRouter.put('/:id', requireAuth, requirePermission('supplier.write'), validate(upsertSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof upsertSchema>;
  const data = { ...body, trn: body.trn || null, email: body.email || null };
  const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw NotFound('Supplier not found');
  if (data.code !== existing.code) {
    const dup = await prisma.supplier.findUnique({ where: { code: data.code } });
    if (dup) throw BadRequest(`Supplier code "${data.code}" already exists`);
  }
  res.json({ data: await prisma.supplier.update({ where: { id: req.params.id }, data }) });
}));

suppliersRouter.delete('/:id', requireAuth, requirePermission('supplier.write'), asyncHandler(async (req, res) => {
  const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw NotFound('Supplier not found');
  await prisma.supplier.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), isActive: false } });
  res.status(204).end();
}));
