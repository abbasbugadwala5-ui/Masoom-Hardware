import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';

export const customersRouter = Router();

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
  creditLimit:   z.coerce.number().nonnegative().default(0),
  creditDays:    z.coerce.number().int().min(0).default(0),
  openingBalance:z.coerce.number().default(0),
  notes:         z.string().optional().nullable(),
  isActive:      z.boolean().default(true),
});

customersRouter.get(
  '/',
  requireAuth,
  requirePermission('customer.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const where = {
      deletedAt: null,
      ...(q ? {
        OR: [
          { name:  { contains: q, mode: 'insensitive' as const } },
          { code:  { contains: q, mode: 'insensitive' as const } },
          { phone: { contains: q } },
          { trn:   { contains: q } },
        ],
      } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort ?? 'createdAt']: order },
      }),
      prisma.customer.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

customersRouter.get('/:id', requireAuth, requirePermission('customer.read'), asyncHandler(async (req, res) => {
  const c = await prisma.customer.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!c) throw NotFound('Customer not found');
  res.json({ data: c });
}));

customersRouter.post('/', requireAuth, requirePermission('customer.write'), validate(upsertSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof upsertSchema>;
  // normalise empty-string optionals to null
  const data = { ...body, trn: body.trn || null, email: body.email || null };
  const dup = await prisma.customer.findUnique({ where: { code: data.code } });
  if (dup) throw BadRequest(`Customer code "${data.code}" already exists`);
  res.status(201).json({ data: await prisma.customer.create({ data }) });
}));

customersRouter.put('/:id', requireAuth, requirePermission('customer.write'), validate(upsertSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof upsertSchema>;
  const data = { ...body, trn: body.trn || null, email: body.email || null };
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw NotFound('Customer not found');
  if (data.code !== existing.code) {
    const dup = await prisma.customer.findUnique({ where: { code: data.code } });
    if (dup) throw BadRequest(`Customer code "${data.code}" already exists`);
  }
  res.json({ data: await prisma.customer.update({ where: { id: req.params.id }, data }) });
}));

customersRouter.delete('/:id', requireAuth, requirePermission('customer.write'), asyncHandler(async (req, res) => {
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw NotFound('Customer not found');
  await prisma.customer.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), isActive: false } });
  res.status(204).end();
}));
