/**
 * Stock-movement posting. Every quantity change goes through here so the
 * InventoryItem balance and the immutable StockLog stay in lock-step.
 * Always call inside a Prisma transaction.
 */
import type { Prisma } from '@prisma/client';
import { Prisma as P } from '@prisma/client';

export interface StockMovement {
  type: Prisma.StockLogCreateInput['type'];
  productId: string;
  warehouseId: string;
  /** Signed: negative for out, positive for in. */
  qtyDelta: number;
  refTable?: string;
  refId?: string;
  notes?: string;
  createdBy?: string;
}

/** Apply a single stock movement: adjust the warehouse balance + write the audit log. */
export async function postStock(tx: Prisma.TransactionClient, m: StockMovement): Promise<void> {
  await tx.inventoryItem.upsert({
    where: { productId_warehouseId: { productId: m.productId, warehouseId: m.warehouseId } },
    create: {
      productId: m.productId,
      warehouseId: m.warehouseId,
      quantity: new P.Decimal(m.qtyDelta),
    },
    update: { quantity: { increment: new P.Decimal(m.qtyDelta) } },
  });

  await tx.stockLog.create({
    data: {
      type: m.type,
      productId: m.productId,
      warehouseId: m.warehouseId,
      qtyDelta: new P.Decimal(m.qtyDelta),
      refTable: m.refTable,
      refId: m.refId,
      notes: m.notes,
      createdBy: m.createdBy,
    },
  });
}

/** Apply many movements in order. */
export async function postStockBatch(tx: Prisma.TransactionClient, movements: StockMovement[]): Promise<void> {
  for (const m of movements) await postStock(tx, m);
}
