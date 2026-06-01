export const DOCUMENT_PREFIXES = {
  QUOTATION: 'QT',
  SALES_ORDER: 'SO',
  INVOICE: 'INV',
  DELIVERY_ORDER: 'DO',
  CREDIT_NOTE: 'CN',
  RECEIPT_VOUCHER: 'RV',
  LPO: 'LPO',
  GRN: 'GRN',
  PURCHASE_INVOICE: 'PI',
  DEBIT_NOTE: 'DN',
  PAYMENT_VOUCHER: 'PV',
  STOCK_TRANSFER: 'ST',
  EXPENSE: 'EXP',
  JOURNAL: 'JV',
} as const;

export type DocumentPrefix = typeof DOCUMENT_PREFIXES[keyof typeof DOCUMENT_PREFIXES];

export const formatDocNumber = (prefix: DocumentPrefix, year: number, seq: number) =>
  `${prefix}/${String(year).padStart(2, '0')}/${String(seq).padStart(6, '0')}`;
