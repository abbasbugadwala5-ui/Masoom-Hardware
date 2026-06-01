import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

export const warehousesRouter = Router();

// LIST active warehouses (for delivery-order / transfer pickers)
warehousesRouter.get(
  '/',
  requireAuth,
  requirePermission('inventory.read'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, city: true },
    });
    res.json({ data: rows });
  }),
);
