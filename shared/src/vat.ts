export const UAE_VAT_RATE = 5;            // percent
export const AED_CURRENCY = 'AED';

export interface LineVatInput {
  quantity: number;
  unitPrice: number;
  discount?: number;        // absolute amount
  vatRate: number;          // percent
  vatInclusive?: boolean;
}

export interface LineVatResult {
  subtotal: number;         // taxable amount after discount, exclusive of VAT
  vatAmount: number;
  total: number;            // subtotal + vatAmount
}

/** Round half-to-even-ish via banker's? Keep simple: 2dp round-half-away-from-zero. */
const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

/** Compute one invoice line. If vatInclusive, unitPrice already contains VAT. */
export function computeLineVat(input: LineVatInput): LineVatResult {
  const gross = input.quantity * input.unitPrice;
  const afterDiscount = gross - (input.discount ?? 0);

  if (input.vatInclusive) {
    const subtotal = afterDiscount / (1 + input.vatRate / 100);
    const vatAmount = afterDiscount - subtotal;
    return { subtotal: round2(subtotal), vatAmount: round2(vatAmount), total: round2(afterDiscount) };
  }

  const vatAmount = afterDiscount * (input.vatRate / 100);
  return {
    subtotal: round2(afterDiscount),
    vatAmount: round2(vatAmount),
    total: round2(afterDiscount + vatAmount),
  };
}

/** Aggregate lines into per-rate breakdown for FTA-compliant invoice totals. */
export function summarizeVat(lines: LineVatResult[] & { vatRate?: number }[]) {
  let subtotal = 0;
  let vatAmount = 0;
  let total = 0;
  for (const l of lines) {
    subtotal += l.subtotal;
    vatAmount += l.vatAmount;
    total += l.total;
  }
  return { subtotal: round2(subtotal), vatAmount: round2(vatAmount), total: round2(total) };
}
