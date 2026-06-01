/**
 * Shared building blocks for the sales documents (quotation / sales order /
 * invoice / credit note): the line-item schema, product resolution, and the
 * VAT line/total/breakdown computation.
 */
import { z } from 'zod';
import type { Prisma, PrismaClient } from '@prisma/client';
import { BadRequest } from '../../utils/errors';
import { computeLine, sumLines, vatBreakdown } from '../../utils/vat';

export const pricedItemSchema = z.object({
  productId: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  vatRate: z.coerce.number().min(0).max(100).default(5),
});

export type PricedItemInput = z.infer<typeof pricedItemSchema>;

export interface ComputedItem {
  position: number;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
}

/**
 * Validate that every product exists/active, then compute each line plus the
 * document totals and the per-rate VAT breakdown.
 */
export async function resolveAndComputeItems(
  db: PrismaClient | Prisma.TransactionClient,
  items: PricedItemInput[],
) {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await db.product.findMany({ where: { id: { in: productIds }, deletedAt: null } });
  const pmap = new Map(products.map((p) => [p.id, p]));
  for (const id of productIds) {
    if (!pmap.has(id)) throw BadRequest(`Product ${id} not found or inactive`);
  }

  const computedItems: ComputedItem[] = items.map((it, i) => {
    const c = computeLine(it);
    return {
      position: i,
      productId: it.productId,
      description: it.description ?? pmap.get(it.productId)!.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount ?? 0,
      vatRate: it.vatRate,
      subtotal: c.subtotal,
      vatAmount: c.vatAmount,
      total: c.total,
    };
  });

  const totals = sumLines(computedItems);
  const breakdown = vatBreakdown(computedItems);
  return { computedItems, totals, breakdown };
}

/** Party + items include used across sales-document detail responses. */
export const SALES_PARTY_SELECT = {
  id: true, code: true, name: true, legalName: true, trn: true, email: true,
  phone: true, addressLine1: true, addressLine2: true, city: true, country: true,
} as const;

export const SALES_ITEMS_INCLUDE = {
  include: { product: { select: { id: true, sku: true, name: true, unit: true } } },
  orderBy: { position: 'asc' as const },
} as const;
