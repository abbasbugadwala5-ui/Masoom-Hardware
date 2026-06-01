/**
 * Money formatting + amount-in-words for PDF documents.
 * Server-side mirror of frontend/src/lib/format.ts so PDFs read identically to the UI.
 */

export const n2 = (v: number | string) =>
  Number(v).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-AE', { year: 'numeric', month: 'short', day: '2-digit' });

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function belowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n]!;
  if (n < 100) return TENS[Math.floor(n / 10)]! + (n % 10 ? ' ' + ONES[n % 10] : '');
  return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + belowThousand(n % 100) : '');
}

function inWordsInt(n: number): string {
  if (n === 0) return 'zero';
  const million = Math.floor(n / 1_000_000);
  const thousand = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;
  let out = '';
  if (million) out += belowThousand(million) + ' million ';
  if (thousand) out += belowThousand(thousand) + ' thousand ';
  if (rest) out += belowThousand(rest);
  return out.replace(/\s+/g, ' ').trim();
}

/** "2362.50" → "UAE Dirhams Two Thousand Three Hundred Sixty Two and Fils Fifty Only" */
export function amountInWordsAed(amount: number | string): string {
  const num = Number(amount);
  const whole = Math.floor(num);
  const fils = Math.round((num - whole) * 100);
  const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  const dirhamPart = `UAE Dirhams ${cap(inWordsInt(whole))}`;
  const filsPart = fils > 0 ? ` and Fils ${cap(inWordsInt(fils))}` : '';
  return `${dirhamPart}${filsPart} Only`;
}
