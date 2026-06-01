import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';

export const usersRouter = Router();
export const rolesRouter = Router();

const USER_SELECT = {
  id: true, email: true, fullName: true, phone: true,
  isActive: true, lastLoginAt: true, createdAt: true,
  role: { select: { id: true, name: true, description: true } },
} as const;

usersRouter.get(
  '/',
  requireAuth,
  requirePermission('user.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const where = {
      deletedAt: null,
      ...(q ? {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' as const } },
          { email:    { contains: q, mode: 'insensitive' as const } },
        ],
      } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { [sort ?? 'createdAt']: order },
        select: USER_SELECT,
      }),
      prisma.user.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

usersRouter.patch(
  '/:id/active',
  requireAuth,
  requirePermission('user.update'),
  validate(z.object({ isActive: z.boolean() })),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) throw NotFound('User not found');
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data:  { isActive: req.body.isActive as boolean },
      select: USER_SELECT,
    });
    res.json({ data: updated });
  }),
);

rolesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true, permissions: true } } },
    });
    res.json({ data: roles });
  }),
);
