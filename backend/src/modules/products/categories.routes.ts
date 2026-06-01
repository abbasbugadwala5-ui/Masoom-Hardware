import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound } from '../../utils/errors';

export const categoriesRouter = Router();
export const brandsRouter = Router();

const catSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  parentId: z.string().optional().nullable(),
});

const brandSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  logoUrl: z.string().url().optional().nullable(),
});

categoriesRouter.get('/',  requireAuth, requirePermission('product.read'), asyncHandler(async (_req, res) => {
  res.json({ data: await prisma.category.findMany({ orderBy: { name: 'asc' } }) });
}));
categoriesRouter.post('/', requireAuth, requirePermission('product.write'), validate(catSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await prisma.category.create({ data: req.body }) });
}));
categoriesRouter.put('/:id', requireAuth, requirePermission('product.write'), validate(catSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('Category not found');
  res.json({ data: await prisma.category.update({ where: { id: req.params.id }, data: req.body }) });
}));
categoriesRouter.delete('/:id', requireAuth, requirePermission('product.write'), asyncHandler(async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

brandsRouter.get('/',  requireAuth, requirePermission('product.read'), asyncHandler(async (_req, res) => {
  res.json({ data: await prisma.brand.findMany({ orderBy: { name: 'asc' } }) });
}));
brandsRouter.post('/', requireAuth, requirePermission('product.write'), validate(brandSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await prisma.brand.create({ data: req.body }) });
}));
brandsRouter.put('/:id', requireAuth, requirePermission('product.write'), validate(brandSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.brand.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('Brand not found');
  res.json({ data: await prisma.brand.update({ where: { id: req.params.id }, data: req.body }) });
}));
brandsRouter.delete('/:id', requireAuth, requirePermission('product.write'), asyncHandler(async (req, res) => {
  await prisma.brand.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));
