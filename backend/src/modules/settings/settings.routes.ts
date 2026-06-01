import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';

export const settingsRouter = Router();

const updateSchema = z.object({
  legalName: z.string().min(1),
  tradeName: z.string().optional().nullable(),
  trn: z.string().regex(/^\d{15}$/, 'TRN must be 15 digits'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().default('United Arab Emirates'),
  defaultVatRate: z.coerce.number().min(0).max(100).default(5),
  invoiceFooter: z.string().optional().nullable(),
});

// READ — any authenticated user (needed for document headers).
settingsRouter.get('/', requireAuth, asyncHandler(async (_req, res) => {
  const s = await prisma.companySettings.findFirst();
  res.json({ data: s });
}));

// UPDATE — settings managers only.
settingsRouter.put('/', requireAuth, requirePermission('settings.manage'), validate(updateSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof updateSchema>;
  const data = { ...body, email: body.email || null };
  const existing = await prisma.companySettings.findFirst();
  const saved = existing
    ? await prisma.companySettings.update({ where: { id: existing.id }, data })
    : await prisma.companySettings.create({ data });
  res.json({ data: saved });
}));
