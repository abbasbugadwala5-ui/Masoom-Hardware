import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';
import { nextDocNumber } from '../numbering/numbering.service';

export const expensesRouter = Router();

const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

const createSchema = z.object({
  date: z.coerce.date().default(() => new Date()),
  category: z.string().min(1),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  vatAmount: z.coerce.number().nonnegative().default(0),
  paidVia: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE', 'OTHER']).optional().nullable(),
});

expensesRouter.get('/', requireAuth, requirePermission('accounts.read'), validate(pageQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
  const where = q ? { OR: [{ number: { contains: q, mode: 'insensitive' as const } }, { category: { contains: q, mode: 'insensitive' as const } }, { description: { contains: q, mode: 'insensitive' as const } }] } : {};
  const [rows, total] = await Promise.all([
    prisma.expense.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [sort ?? 'date']: order } }),
    prisma.expense.count({ where }),
  ]);
  res.json(paginate(rows, total, page, pageSize));
}));

expensesRouter.post('/', requireAuth, requirePermission('accounts.write'), validate(createSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createSchema>;
  const created = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, 'EXP', body.date);
    return tx.expense.create({
      data: {
        number,
        date: body.date,
        category: body.category,
        description: body.description ?? undefined,
        amount: body.amount,
        vatAmount: body.vatAmount,
        total: round2(body.amount + body.vatAmount),
        paidVia: body.paidVia ?? undefined,
        createdBy: req.user?.sub,
      },
    });
  });
  res.status(201).json({ data: created });
}));

expensesRouter.delete('/:id', requireAuth, requirePermission('accounts.write'), asyncHandler(async (req, res) => {
  const exp = await prisma.expense.findUnique({ where: { id: req.params.id } });
  if (!exp) throw NotFound('Expense not found');
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));
