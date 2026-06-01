import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotFound, BadRequest } from '../../utils/errors';
import { pageQuerySchema, paginate } from '../../utils/pagination';
import { nextDocNumber } from '../numbering/numbering.service';
import { computeLine, sumLines, vatBreakdown } from '../../utils/vat';
import { buildQrPayload } from '../pdf/fta-qr';
import { getCompany } from '../pdf/company';
import { attachPdfRoute } from '../pdf/pdf.routes';

export const invoicesRouter = Router();

const itemSchema = z.object({
  productId:    z.string().min(1),
  description:  z.string().optional().nullable(),
  quantity:     z.coerce.number().positive(),
  unitPrice:    z.coerce.number().nonnegative(),
  discount:     z.coerce.number().nonnegative().default(0),
  vatRate:      z.coerce.number().min(0).max(100).default(5),
});

const createSchema = z.object({
  customerId:  z.string().min(1),
  date:        z.coerce.date().default(() => new Date()),
  dueDate:     z.coerce.date().optional().nullable(),
  notes:       z.string().optional().nullable(),
  terms:       z.string().optional().nullable(),
  items:       z.array(itemSchema).min(1, 'Add at least one line item'),
  postNow:     z.boolean().default(true),
});

const INVOICE_INCLUDE = {
  customer: { select: { id: true, code: true, name: true, legalName: true, trn: true, email: true, phone: true, addressLine1: true, city: true, country: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } }, orderBy: { position: 'asc' as const } },
} as const;

// LIST
invoicesRouter.get(
  '/',
  requireAuth,
  requirePermission('invoice.read'),
  validate(pageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, sort, order } = req.query as unknown as z.infer<typeof pageQuerySchema>;
    const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
    // `status=open` is a convenience filter for unpaid/partly-paid posted invoices.
    const statusFilter =
      statusRaw === 'open'
        ? { status: { in: ['POSTED', 'PART_PAID'] as const } }
        : statusRaw
          ? { status: statusRaw as 'DRAFT' | 'POSTED' | 'PAID' | 'PART_PAID' | 'CANCELLED' }
          : {};
    const where = {
      ...(customerId ? { customerId } : {}),
      ...statusFilter,
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: 'insensitive' as const } },
              { customer: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort ?? 'date']: order },
        include: { customer: { select: { id: true, name: true, code: true } } },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json(paginate(rows, total, page, pageSize));
  }),
);

// READ ONE
invoicesRouter.get(
  '/:id',
  requireAuth,
  requirePermission('invoice.read'),
  asyncHandler(async (req, res) => {
    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: INVOICE_INCLUDE,
    });
    if (!inv) throw NotFound('Invoice not found');
    res.json({ data: inv });
  }),
);

// CREATE
invoicesRouter.post(
  '/',
  requireAuth,
  requirePermission('invoice.create'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;

    // Verify customer
    const customer = await prisma.customer.findFirst({ where: { id: body.customerId, deletedAt: null } });
    if (!customer) throw BadRequest('Customer not found');

    // Resolve product details + compute lines
    const productIds = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, deletedAt: null } });
    const pmap = new Map(products.map((p) => [p.id, p]));
    for (const id of productIds) {
      if (!pmap.has(id)) throw BadRequest(`Product ${id} not found or inactive`);
    }

    const computedItems = body.items.map((it, i) => {
      const c = computeLine(it);
      return {
        position:    i,
        productId:   it.productId,
        description: it.description ?? pmap.get(it.productId)!.name,
        quantity:    it.quantity,
        unitPrice:   it.unitPrice,
        discount:    it.discount ?? 0,
        vatRate:     it.vatRate,
        subtotal:    c.subtotal,
        vatAmount:   c.vatAmount,
        total:       c.total,
      };
    });

    const totals = sumLines(computedItems);
    const breakdown = vatBreakdown(computedItems);

    const company = await getCompany();

    const result = await prisma.$transaction(async (tx) => {
      const number = await nextDocNumber(tx, 'INV', body.date);
      const qrPayload = body.postNow
        ? buildQrPayload({
            sellerName: company.legalName,
            trn: company.trn,
            timestamp: body.date,
            total: totals.total,
            vatAmount: totals.vatAmount,
          })
        : undefined;
      const inv = await tx.invoice.create({
        data: {
          number,
          customerId: body.customerId,
          date: body.date,
          dueDate: body.dueDate ?? undefined,
          notes: body.notes ?? undefined,
          terms: body.terms ?? undefined,
          status: body.postNow ? 'POSTED' : 'DRAFT',
          postedAt: body.postNow ? new Date() : undefined,
          subtotal:      totals.subtotal,
          discount:      0,
          taxableAmount: totals.subtotal,
          vatAmount:     totals.vatAmount,
          total:         totals.total,
          vatBreakdown:  breakdown as unknown as object,
          qrPayload,
          createdBy:     req.user?.sub,
          items: { create: computedItems },
        },
        include: INVOICE_INCLUDE,
      });
      return inv;
    });

    res.status(201).json({ data: result });
  }),
);

// POST (finalise an existing DRAFT)
invoicesRouter.post(
  '/:id/post',
  requireAuth,
  requirePermission('invoice.post'),
  asyncHandler(async (req, res) => {
    const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!inv) throw NotFound('Invoice not found');
    if (inv.status !== 'DRAFT') throw BadRequest(`Cannot post: invoice is ${inv.status}`);
    const company = await getCompany();
    const qrPayload = inv.qrPayload ?? buildQrPayload({
      sellerName: company.legalName,
      trn: company.trn,
      timestamp: inv.date,
      total: Number(inv.total),
      vatAmount: Number(inv.vatAmount),
    });
    const updated = await prisma.invoice.update({
      where: { id: inv.id },
      data:  { status: 'POSTED', postedAt: new Date(), qrPayload },
      include: INVOICE_INCLUDE,
    });
    res.json({ data: updated });
  }),
);

// CANCEL (only DRAFT)
invoicesRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('invoice.post'),
  asyncHandler(async (req, res) => {
    const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!inv) throw NotFound('Invoice not found');
    if (inv.status !== 'DRAFT') throw BadRequest(`Cannot delete: invoice is ${inv.status}. Use a credit note instead.`);
    await prisma.invoice.delete({ where: { id: inv.id } });
    res.status(204).end();
  }),
);

attachPdfRoute(invoicesRouter, 'invoice', 'invoice.read');
