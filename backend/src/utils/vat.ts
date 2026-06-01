/**
 * VAT line math. Inputs are JS numbers, outputs rounded to 2dp.
 * Mirrors shared/src/vat.ts so backend has zero workspace deps.
 */

export interface LineIn {
  quantity:    number;
  unitPrice:   number;
  discount?:   number;
  vatRate:     number;        // percent
  vatInclusive?: boolean;
}

export interface LineOut {
  subtotal:  number;          // taxable amount (after discount)
  vatAmount: number;
  total:     number;
}

const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

export function computeLine(input: LineIn): LineOut {
  const gross = input.quantity * input.unitPrice;
  const afterDiscount = gross - (input.discount ?? 0);
  if (input.vatInclusive) {
    const subtotal = afterDiscount / (1 + input.vatRate / 100);
    const vatAmount = afterDiscount - subtotal;
    return { subtotal: round2(subtotal), vatAmount: round2(vatAmount), total: round2(afterDiscount) };
  }
  const vatAmount = afterDiscount * (input.vatRate / 100);
  return {
    subtotal:  round2(afterDiscount),
    vatAmount: round2(vatAmount),
    total:     round2(afterDiscount + vatAmount),
  };
}

export function sumLines(lines: LineOut[]) {
  let subtotal = 0, vatAmount = 0, total = 0;
  for (const l of lines) {
    subtotal  += l.subtotal;
    vatAmount += l.vatAmount;
    total     += l.total;
  }
  return { subtotal: round2(subtotal), vatAmount: round2(vatAmount), total: round2(total) };
}

/**
 * Per-rate breakdown stored on the Invoice for FTA-style display.
 * Returns: [{ rate: 5, taxable: 1234.00, vat: 61.70 }, ...]
 */
export function vatBreakdown(items: { vatRate: number; subtotal: number; vatAmount: number }[]) {
  const map = new Map<number, { rate: number; taxable: number; vat: number }>();
  for (const i of items) {
    const cur = map.get(i.vatRate) ?? { rate: i.vatRate, taxable: 0, vat: 0 };
    cur.taxable += i.subtotal;
    cur.vat     += i.vatAmount;
    map.set(i.vatRate, cur);
  }
  return [...map.values()]
    .map((b) => ({ rate: b.rate, taxable: round2(b.taxable), vat: round2(b.vat) }))
    .sort((a, b) => a.rate - b.rate);
}
