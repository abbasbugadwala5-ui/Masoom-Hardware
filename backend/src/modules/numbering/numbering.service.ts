import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Allocate the next sequence number for a document prefix in the current short-year.
 * MUST be called inside a Prisma transaction so the row-level lock prevents collisions.
 *
 * Returns the formatted document number, e.g. "INV/26/000123".
 */
export async function nextDocNumber(
  tx: Prisma.TransactionClient | PrismaClient,
  prefix: string,
  at: Date = new Date(),
): Promise<string> {
  const year = Number(String(at.getFullYear()).slice(-2));

  // Upsert ensures the row exists, then update returns the new lastNum atomically.
  const row = await tx.documentSequence.upsert({
    where:  { prefix_year: { prefix, year } },
    create: { prefix, year, lastNum: 1 },
    update: { lastNum: { increment: 1 } },
  });

  return `${prefix}/${String(year).padStart(2, '0')}/${String(row.lastNum).padStart(6, '0')}`;
}
