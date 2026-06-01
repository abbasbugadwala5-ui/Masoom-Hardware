export const aed = new Intl.NumberFormat('en-AE', {
  style: 'currency', currency: 'AED', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export const aedShort = new Intl.NumberFormat('en-AE', {
  style: 'currency', currency: 'AED', maximumFractionDigits: 0,
});

export const n2 = (v: number | string) =>
  Number(v).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-AE', { year: 'numeric', month: 'short', day: '2-digit' });

/* ── Amount in words (UAE-style) ──────────────────────────────────────── */

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function inWordsBelowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n]!;
  if (n < 100) return TENS[Math.floor(n / 10)]! + (n % 10 ? ' ' + ONES[n % 10] : '');
  return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + inWordsBelowThousand(n % 100) : '');
}

function inWordsInt(n: number): string {
  if (n === 0) return 'zero';
  const crore   = Math.floor(n / 10_000_000);
  const lakh    = Math.floor((n % 10_000_000) / 100_000);
  const thousand= Math.floor((n % 100_000) / 1_000);
  const rest    = n % 1_000;
  let out = '';
  if (crore)    out += inWordsBelowThousand(crore)    + ' crore ';
  if (lakh)     out += inWordsBelowThousand(lakh)     + ' lakh ';
  if (thousand) out += inWordsBelowThousand(thousand) + ' thousand ';
  if (rest)     out += inWordsBelowThousand(rest);
  return out.replace(/\s+/g, ' ').trim();
}

/** "AED 2,362.50" → "UAE Dirhams Two Thousand Three Hundred Sixty Two and Fils Fifty Only" */
export function amountInWordsAed(amount: number | string): string {
  const n = Number(amount);
  const whole = Math.floor(n);
  const fils  = Math.round((n - whole) * 100);
  const dirhamsWords = inWordsInt(whole);
  const filsWords    = inWordsInt(fils);
  const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  const dirhamPart = `UAE Dirhams ${cap(dirhamsWords)}`;
  const filsPart   = fils > 0 ? ` and Fils ${cap(filsWords)}` : '';
  return `${dirhamPart}${filsPart} Only`;
}
