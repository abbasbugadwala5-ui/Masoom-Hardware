/**
 * Document-PDF orchestration: fetch → render HTML → Chrome → cache to disk → return buffer.
 *
 * Generated PDFs are archived under <STORAGE>/pdfs/<kind>/<number>.pdf and the relative
 * path is persisted on the record's `pdfUrl`. Re-requests serve the cached file unless
 * `force` is set (e.g. the document was edited).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import { NotFound } from '../../utils/errors';
import { getCompany } from './company';
import { htmlToPdf } from './browser';
import { buildQrPayload, qrDataUrl } from './fta-qr';
import {
  renderInvoiceHtml,
  renderQuotationHtml,
  renderSalesOrderHtml,
  renderDeliveryOrderHtml,
  renderCreditNoteHtml,
  renderPaymentHtml,
  renderLpoHtml,
  renderGrnHtml,
  renderPurchaseInvoiceHtml,
  renderDebitNoteHtml,
} from './templates';

export type DocKind =
  | 'invoice'
  | 'quotation'
  | 'salesorder'
  | 'deliveryorder'
  | 'creditnote'
  | 'payment'
  | 'lpo'
  | 'grn'
  | 'purchaseinvoice'
  | 'debitnote';

const PRICED_ITEMS = {
  items: {
    include: { product: { select: { sku: true, name: true, unit: true } } },
    orderBy: { position: 'asc' as const },
  },
} as const;

const PARTY = {
  select: {
    id: true, code: true, name: true, legalName: true, trn: true, email: true,
    phone: true, addressLine1: true, addressLine2: true, city: true, country: true,
  },
} as const;

const storageRoot = path.resolve(env.STORAGE_LOCAL_PATH);

function safeName(n: string): string {
  return n.replace(/[^\w.-]+/g, '-');
}

async function fetchDocument(kind: DocKind, id: string): Promise<{ number: string; pdfUrl: string | null; html: string }> {
  const company = await getCompany();

  switch (kind) {
    case 'invoice': {
      const inv = await prisma.invoice.findUnique({
        where: { id },
        include: { customer: PARTY, ...PRICED_ITEMS },
      });
      if (!inv) throw NotFound('Invoice not found');
      // Ensure a QR payload exists, then render the QR image inline.
      let payload = inv.qrPayload;
      if (!payload) {
        payload = buildQrPayload({
          sellerName: company.legalName,
          trn: company.trn,
          timestamp: inv.date,
          total: Number(inv.total),
          vatAmount: Number(inv.vatAmount),
        });
        await prisma.invoice.update({ where: { id }, data: { qrPayload: payload } });
      }
      const qrImg = await qrDataUrl(payload);
      return { number: inv.number, pdfUrl: inv.pdfUrl, html: renderInvoiceHtml(inv, company, qrImg) };
    }
    case 'quotation': {
      const q = await prisma.quotation.findUnique({ where: { id }, include: { customer: PARTY, ...PRICED_ITEMS } });
      if (!q) throw NotFound('Quotation not found');
      return { number: q.number, pdfUrl: q.pdfUrl, html: renderQuotationHtml(q, company) };
    }
    case 'salesorder': {
      const so = await prisma.salesOrder.findUnique({
        where: { id },
        include: { customer: PARTY, quotation: { select: { number: true } }, ...PRICED_ITEMS },
      });
      if (!so) throw NotFound('Sales order not found');
      return { number: so.number, pdfUrl: so.pdfUrl, html: renderSalesOrderHtml(so, company) };
    }
    case 'deliveryorder': {
      const dorder = await prisma.deliveryOrder.findUnique({
        where: { id },
        include: {
          customer: PARTY,
          warehouse: { select: { name: true, code: true } },
          invoice: { select: { number: true } },
          items: { include: { product: { select: { sku: true, name: true, unit: true } } }, orderBy: { position: 'asc' } },
        },
      });
      if (!dorder) throw NotFound('Delivery order not found');
      return { number: dorder.number, pdfUrl: dorder.pdfUrl, html: renderDeliveryOrderHtml(dorder, company) };
    }
    case 'creditnote': {
      const cn = await prisma.creditNote.findUnique({
        where: { id },
        include: { customer: PARTY, invoice: { select: { number: true } }, ...PRICED_ITEMS },
      });
      if (!cn) throw NotFound('Credit note not found');
      return { number: cn.number, pdfUrl: cn.pdfUrl, html: renderCreditNoteHtml(cn, company) };
    }
    case 'payment': {
      const p = await prisma.payment.findUnique({
        where: { id },
        include: {
          customer: PARTY,
          supplier: PARTY,
          allocations: {
            include: {
              invoice: { select: { number: true } },
              purchaseInvoice: { select: { number: true } },
            },
          },
        },
      });
      if (!p) throw NotFound('Payment not found');
      return { number: p.number, pdfUrl: p.pdfUrl, html: renderPaymentHtml(p, company) };
    }
    case 'lpo': {
      const lpo = await prisma.lpo.findUnique({ where: { id }, include: { supplier: PARTY, ...PRICED_ITEMS } });
      if (!lpo) throw NotFound('LPO not found');
      return { number: lpo.number, pdfUrl: lpo.pdfUrl, html: renderLpoHtml(lpo, company) };
    }
    case 'grn': {
      const grn = await prisma.grn.findUnique({
        where: { id },
        include: {
          warehouse: { select: { name: true, code: true } },
          lpo: { select: { number: true, supplier: PARTY } },
          items: { include: { product: { select: { sku: true, name: true, unit: true } } } },
        },
      });
      if (!grn) throw NotFound('GRN not found');
      return { number: grn.number, pdfUrl: null, html: renderGrnHtml(grn, company) };
    }
    case 'purchaseinvoice': {
      const pi = await prisma.purchaseInvoice.findUnique({ where: { id }, include: { supplier: PARTY, ...PRICED_ITEMS } });
      if (!pi) throw NotFound('Purchase invoice not found');
      return { number: pi.number, pdfUrl: pi.pdfUrl, html: renderPurchaseInvoiceHtml(pi, company) };
    }
    case 'debitnote': {
      const dn = await prisma.debitNote.findUnique({
        where: { id },
        include: { supplier: PARTY, purchaseInvoice: { select: { number: true } }, items: { include: { product: { select: { sku: true, name: true, unit: true } } } } },
      });
      if (!dn) throw NotFound('Debit note not found');
      return { number: dn.number, pdfUrl: dn.pdfUrl, html: renderDebitNoteHtml(dn, company) };
    }
  }
}

async function persistPdfUrl(kind: DocKind, id: string, rel: string): Promise<void> {
  const data = { pdfUrl: rel };
  switch (kind) {
    case 'invoice': await prisma.invoice.update({ where: { id }, data }); break;
    case 'quotation': await prisma.quotation.update({ where: { id }, data }); break;
    case 'salesorder': await prisma.salesOrder.update({ where: { id }, data }); break;
    case 'deliveryorder': await prisma.deliveryOrder.update({ where: { id }, data }); break;
    case 'creditnote': await prisma.creditNote.update({ where: { id }, data }); break;
    case 'payment': await prisma.payment.update({ where: { id }, data }); break;
    case 'lpo': await prisma.lpo.update({ where: { id }, data }); break;
    case 'purchaseinvoice': await prisma.purchaseInvoice.update({ where: { id }, data }); break;
    case 'debitnote': await prisma.debitNote.update({ where: { id }, data }); break;
    case 'grn': break; // GRN has no pdfUrl column — always regenerate
  }
}

export interface PdfResult {
  buffer: Buffer;
  filename: string;
}

/**
 * Return the PDF for a document, generating + archiving it on first request (or when `force`).
 */
export async function getDocumentPdf(kind: DocKind, id: string, force = false): Promise<PdfResult> {
  const doc = await fetchDocument(kind, id);
  const rel = path.join('pdfs', kind, `${safeName(doc.number)}.pdf`);
  const abs = path.join(storageRoot, rel);

  if (!force && doc.pdfUrl) {
    try {
      const buffer = await fs.readFile(abs);
      return { buffer, filename: `${safeName(doc.number)}.pdf` };
    } catch {
      /* cached file missing — fall through and regenerate */
    }
  }

  const buffer = await htmlToPdf(doc.html);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buffer);
  await persistPdfUrl(kind, id, rel);

  return { buffer, filename: `${safeName(doc.number)}.pdf` };
}

/** Invalidate a cached PDF after the document changes (best-effort). */
export async function invalidatePdf(kind: DocKind, number: string): Promise<void> {
  const abs = path.join(storageRoot, 'pdfs', kind, `${safeName(number)}.pdf`);
  await fs.rm(abs, { force: true }).catch(() => undefined);
}
