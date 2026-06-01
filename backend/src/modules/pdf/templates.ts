/**
 * HTML templates for every printable document. Each builder returns a full,
 * self-contained HTML string (inline CSS, no external assets except an optional
 * embedded QR data-URL) that htmlToPdf() renders to an A4 PDF.
 */
import type { CompanyInfo } from './company';
import { n2, formatDate, amountInWordsAed } from '../../utils/words';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const num = (v: unknown) => Number(v ?? 0);

/* ─────────────────────────── shared chrome ─────────────────────────── */

function styles(): string {
  return `
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1c1917; font-size: 11px; margin: 0; }
  .doc { width: 100%; }
  .muted { color: #78716c; }
  .right { text-align: right; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .head { display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2px solid #d97706; padding-bottom: 14px; }
  .brandwrap { display: flex; gap: 12px; align-items: center; }
  .logo { width: 52px; height: 52px; background: #f59e0b; color: #1c1917; font-weight: 800;
          display: flex; align-items: center; justify-content: center; font-size: 18px;
          clip-path: polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%); }
  .brand-name { font-size: 20px; letter-spacing: 3px; color: #1c1917; line-height: 1.1; }
  .brand-sub { font-size: 18px; letter-spacing: 6px; color: #b45309; line-height: 1.1; }
  .brand-legal { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #78716c; margin-top: 3px; }
  .doc-title { font-size: 26px; font-weight: 300; letter-spacing: 1px; color: #1c1917; text-align: right; }
  .doc-trn { font-size: 10px; color: #78716c; text-align: right; margin-top: 4px; }
  .meta-grid { display: flex; justify-content: space-between; gap: 24px; margin-top: 16px; }
  .party { font-size: 11px; line-height: 1.5; }
  .party .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e; margin-bottom: 3px; }
  .party .pname { font-weight: 700; font-size: 12px; }
  .metabox { font-size: 10px; }
  .metabox table { border-collapse: collapse; }
  .metabox td { padding: 2px 0; }
  .metabox td.k { color: #78716c; padding-right: 14px; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 18px; }
  table.items thead th { background: #1c1917; color: #fff; font-size: 9px; text-transform: uppercase;
                         letter-spacing: 0.5px; padding: 7px 8px; text-align: left; }
  table.items thead th.r { text-align: right; }
  table.items tbody td { padding: 7px 8px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
  table.items tbody tr:nth-child(even) td { background: #fafaf9; }
  .totals { display: flex; justify-content: flex-end; margin-top: 14px; }
  .totals table { width: 280px; border-collapse: collapse; }
  .totals td { padding: 4px 8px; font-size: 11px; }
  .totals td.k { color: #57534e; }
  .totals tr.grand td { background: #1c1917; color: #fff; font-weight: 700; font-size: 13px; }
  .words { margin-top: 12px; padding: 8px 10px; background: #fffbeb; border: 1px solid #fde68a;
           font-size: 10px; }
  .words .label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e; }
  .vatbox { margin-top: 12px; font-size: 10px; }
  .vatbox table { border-collapse: collapse; }
  .vatbox th, .vatbox td { border: 1px solid #e7e5e4; padding: 4px 10px; }
  .vatbox th { background: #f5f5f4; text-align: left; }
  .notes { margin-top: 16px; font-size: 10px; color: #57534e; line-height: 1.5; }
  .sign-row { display: flex; justify-content: space-between; margin-top: 40px; }
  .sign { width: 45%; border-top: 1px solid #a8a29e; padding-top: 5px; font-size: 10px; color: #78716c; }
  .footer { margin-top: 26px; border-top: 1px solid #e7e5e4; padding-top: 10px;
            font-size: 9px; color: #a8a29e; display: flex; justify-content: space-between; }
  .qr { text-align: right; }
  .qr img { width: 110px; height: 110px; }
  .status-chip { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9px;
                 font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  `;
}

function wrap(inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${styles()}</style></head>
  <body><div class="doc">${inner}</div></body></html>`;
}

function letterhead(company: CompanyInfo, docTitle: string): string {
  return `
  <div class="head">
    <div class="brandwrap">
      <div class="logo">MH</div>
      <div>
        <div class="brand-name">MASOOM</div>
        <div class="brand-sub">HARDWARE</div>
        <div class="brand-legal">${esc(company.legalName)}</div>
      </div>
    </div>
    <div>
      <div class="doc-title">${esc(docTitle)}</div>
      <div class="doc-trn">TRN: ${esc(company.trn)}</div>
    </div>
  </div>`;
}

interface Party {
  name?: string | null; legalName?: string | null; trn?: string | null;
  email?: string | null; phone?: string | null;
  addressLine1?: string | null; addressLine2?: string | null;
  city?: string | null; country?: string | null;
}

function partyBlock(label: string, p: Party): string {
  const addr = [p.addressLine1, p.addressLine2, p.city, p.country].filter(Boolean).join(', ');
  return `
  <div class="party">
    <div class="label">${esc(label)}</div>
    <div class="pname">${esc(p.legalName || p.name)}</div>
    ${p.trn ? `<div class="muted">TRN: ${esc(p.trn)}</div>` : ''}
    ${addr ? `<div>${esc(addr)}</div>` : ''}
    ${p.phone ? `<div class="muted">${esc(p.phone)}</div>` : ''}
    ${p.email ? `<div class="muted">${esc(p.email)}</div>` : ''}
  </div>`;
}

function metaBlock(rows: [string, string][]): string {
  return `<div class="metabox"><table>${rows
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="bold">${esc(v)}</td></tr>`)
    .join('')}</table></div>`;
}

function footer(company: CompanyInfo): string {
  const d = company.branches.dubai;
  const s = company.branches.sharjah;
  return `<div class="footer">
    <div>${esc(d.label)}: ${esc(d.address)} · ${esc(d.tel)} · ${esc(d.poBox)}</div>
    <div>${esc(s.label)}: ${esc(s.address)} · ${esc(s.tel)}</div>
  </div>
  <div class="footer"><div>${esc(company.email)} · ${esc(company.website)}</div><div>This is a computer-generated document.</div></div>`;
}

/* ─────────────────────────── value-line builders ─────────────────────────── */

interface PricedItem {
  position?: number; description?: string | null;
  product?: { sku?: string; name?: string; unit?: string } | null;
  quantity: unknown; unitPrice: unknown; discount?: unknown; vatRate: unknown;
  subtotal: unknown; vatAmount: unknown; total: unknown;
}

function pricedItemsTable(items: PricedItem[], opts: { showDiscount?: boolean } = {}): string {
  const showDisc = opts.showDiscount ?? true;
  const head = `<thead><tr>
    <th style="width:26px">#</th>
    <th>Description</th>
    <th class="r" style="width:50px">Qty</th>
    <th class="r" style="width:42px">Unit</th>
    <th class="r" style="width:70px">Rate</th>
    ${showDisc ? '<th class="r" style="width:60px">Disc</th>' : ''}
    <th class="r" style="width:46px">VAT%</th>
    <th class="r" style="width:80px">Amount</th>
  </tr></thead>`;
  const body = items
    .map((it, i) => {
      const desc = esc(it.description || it.product?.name || '');
      const sku = it.product?.sku ? `<div class="muted">${esc(it.product.sku)}</div>` : '';
      return `<tr>
        <td>${i + 1}</td>
        <td><div class="bold">${desc}</div>${sku}</td>
        <td class="r">${n2(num(it.quantity))}</td>
        <td class="r">${esc(it.product?.unit || '')}</td>
        <td class="r">${n2(num(it.unitPrice))}</td>
        ${showDisc ? `<td class="r">${n2(num(it.discount))}</td>` : ''}
        <td class="r">${n2(num(it.vatRate))}</td>
        <td class="r bold">${n2(num(it.total))}</td>
      </tr>`;
    })
    .join('');
  return `<table class="items">${head}<tbody>${body}</tbody></table>`;
}

function vatBreakdownBox(breakdown: { rate: number; taxable: number; vat: number }[] | null | undefined): string {
  if (!breakdown || breakdown.length === 0) return '';
  return `<div class="vatbox"><table>
    <tr><th>VAT Rate</th><th>Taxable (AED)</th><th>VAT (AED)</th></tr>
    ${breakdown
      .map((b) => `<tr><td>${n2(b.rate)}%</td><td class="right">${n2(b.taxable)}</td><td class="right">${n2(b.vat)}</td></tr>`)
      .join('')}
  </table></div>`;
}

function totalsBlock(t: { subtotal?: unknown; discount?: unknown; vatAmount: unknown; total: unknown; amountPaid?: unknown; label?: string }): string {
  const rows: string[] = [];
  if (t.subtotal !== undefined) rows.push(`<tr><td class="k">Subtotal (Taxable)</td><td class="right">${n2(num(t.subtotal))}</td></tr>`);
  if (t.discount !== undefined && num(t.discount) > 0) rows.push(`<tr><td class="k">Discount</td><td class="right">- ${n2(num(t.discount))}</td></tr>`);
  rows.push(`<tr><td class="k">VAT</td><td class="right">${n2(num(t.vatAmount))}</td></tr>`);
  rows.push(`<tr class="grand"><td>${esc(t.label || 'Total (AED)')}</td><td class="right">${n2(num(t.total))}</td></tr>`);
  if (t.amountPaid !== undefined && num(t.amountPaid) > 0) {
    rows.push(`<tr><td class="k">Paid</td><td class="right">${n2(num(t.amountPaid))}</td></tr>`);
    rows.push(`<tr><td class="k bold">Balance Due</td><td class="right bold">${n2(num(t.total) - num(t.amountPaid))}</td></tr>`);
  }
  return `<div class="totals"><table>${rows.join('')}</table></div>`;
}

function wordsBlock(total: unknown): string {
  return `<div class="words"><span class="label">Amount in words:</span> ${esc(amountInWordsAed(num(total)))}</div>`;
}

function notesBlock(notes?: string | null, terms?: string | null): string {
  if (!notes && !terms) return '';
  return `<div class="notes">
    ${notes ? `<div><span class="bold">Notes:</span> ${esc(notes)}</div>` : ''}
    ${terms ? `<div><span class="bold">Terms:</span> ${esc(terms)}</div>` : ''}
  </div>`;
}

function signatures(left = 'Authorised Signature', right = 'Received By'): string {
  return `<div class="sign-row"><div class="sign">${esc(left)}</div><div class="sign">${esc(right)}</div></div>`;
}

/* ─────────────────────────── per-document templates ─────────────────────────── */

export function renderInvoiceHtml(inv: any, company: CompanyInfo, qrImg?: string): string {
  const inner = `
  ${letterhead(company, 'TAX INVOICE')}
  <div class="meta-grid">
    ${partyBlock('Bill To', inv.customer)}
    <div style="display:flex; gap:24px;">
      ${metaBlock([
        ['Invoice No', inv.number],
        ['Date', formatDate(inv.date)],
        ...(inv.dueDate ? [['Due Date', formatDate(inv.dueDate)] as [string, string]] : []),
        ['Status', inv.status],
      ])}
      ${qrImg ? `<div class="qr"><img src="${qrImg}" alt="QR"/></div>` : ''}
    </div>
  </div>
  ${pricedItemsTable(inv.items || [])}
  ${vatBreakdownBox(inv.vatBreakdown)}
  ${totalsBlock({ subtotal: inv.taxableAmount ?? inv.subtotal, discount: inv.discount, vatAmount: inv.vatAmount, total: inv.total, amountPaid: inv.amountPaid })}
  ${wordsBlock(inv.total)}
  ${notesBlock(inv.notes, inv.terms)}
  ${signatures()}
  ${footer(company)}`;
  return wrap(inner);
}

export function renderQuotationHtml(q: any, company: CompanyInfo): string {
  const inner = `
  ${letterhead(company, 'QUOTATION')}
  <div class="meta-grid">
    ${partyBlock('Quotation For', q.customer)}
    ${metaBlock([
      ['Quotation No', q.number],
      ['Date', formatDate(q.date)],
      ...(q.validUntil ? [['Valid Until', formatDate(q.validUntil)] as [string, string]] : []),
      ['Status', q.status],
    ])}
  </div>
  ${pricedItemsTable(q.items || [])}
  ${vatBreakdownBox(q.vatBreakdown)}
  ${totalsBlock({ subtotal: q.taxableAmount ?? q.subtotal, discount: q.discount, vatAmount: q.vatAmount, total: q.total })}
  ${wordsBlock(q.total)}
  ${notesBlock(q.notes, q.terms)}
  ${signatures('Prepared By', 'Customer Acceptance')}
  ${footer(company)}`;
  return wrap(inner);
}

export function renderSalesOrderHtml(so: any, company: CompanyInfo): string {
  const inner = `
  ${letterhead(company, 'SALES ORDER')}
  <div class="meta-grid">
    ${partyBlock('Customer', so.customer)}
    ${metaBlock([
      ['Order No', so.number],
      ['Date', formatDate(so.date)],
      ...(so.quotation ? [['Quotation Ref', so.quotation.number] as [string, string]] : []),
      ['Status', so.status],
    ])}
  </div>
  ${pricedItemsTable(so.items || [])}
  ${totalsBlock({ subtotal: so.taxableAmount ?? so.subtotal, discount: so.discount, vatAmount: so.vatAmount, total: so.total })}
  ${wordsBlock(so.total)}
  ${notesBlock(so.notes)}
  ${signatures('Prepared By', 'Customer Confirmation')}
  ${footer(company)}`;
  return wrap(inner);
}

export function renderDeliveryOrderHtml(deliveryOrder: any, company: CompanyInfo): string {
  const items = (deliveryOrder.items || [])
    .map((it: any, i: number) => `<tr>
      <td>${i + 1}</td>
      <td><div class="bold">${esc(it.description || it.product?.name || '')}</div>${it.product?.sku ? `<div class="muted">${esc(it.product.sku)}</div>` : ''}</td>
      <td class="r">${esc(it.product?.unit || '')}</td>
      <td class="r bold">${n2(num(it.quantity))}</td>
    </tr>`)
    .join('');
  const inner = `
  ${letterhead(company, 'DELIVERY ORDER')}
  <div class="meta-grid">
    ${partyBlock('Deliver To', { ...deliveryOrder.customer, addressLine1: deliveryOrder.deliveryAddress || deliveryOrder.customer?.addressLine1 })}
    ${metaBlock([
      ['DO No', deliveryOrder.number],
      ['Date', formatDate(deliveryOrder.date)],
      ...(deliveryOrder.invoice ? [['Invoice Ref', deliveryOrder.invoice.number] as [string, string]] : []),
      ['Warehouse', deliveryOrder.warehouse?.name || ''],
      ...(deliveryOrder.vehicleNo ? [['Vehicle', deliveryOrder.vehicleNo] as [string, string]] : []),
      ...(deliveryOrder.driverName ? [['Driver', deliveryOrder.driverName] as [string, string]] : []),
      ['Status', deliveryOrder.status],
    ])}
  </div>
  <table class="items">
    <thead><tr><th style="width:26px">#</th><th>Description</th><th class="r" style="width:60px">Unit</th><th class="r" style="width:80px">Qty</th></tr></thead>
    <tbody>${items}</tbody>
  </table>
  ${notesBlock(deliveryOrder.notes)}
  ${signatures('Dispatched By', 'Received By (Name & Sign)')}
  ${footer(company)}`;
  return wrap(inner);
}

export function renderCreditNoteHtml(cn: any, company: CompanyInfo): string {
  const inner = `
  ${letterhead(company, 'CREDIT NOTE')}
  <div class="meta-grid">
    ${partyBlock('Credit To', cn.customer)}
    ${metaBlock([
      ['Credit Note No', cn.number],
      ['Date', formatDate(cn.date)],
      ['Against Invoice', cn.invoice?.number || ''],
      ...(cn.reason ? [['Reason', cn.reason] as [string, string]] : []),
    ])}
  </div>
  ${pricedItemsTable(cn.items || [], { showDiscount: false })}
  ${vatBreakdownBox(cn.vatBreakdown)}
  ${totalsBlock({ subtotal: cn.taxableAmount ?? cn.subtotal, vatAmount: cn.vatAmount, total: cn.total, label: 'Total Credit (AED)' })}
  ${wordsBlock(cn.total)}
  ${notesBlock(cn.notes)}
  ${signatures()}
  ${footer(company)}`;
  return wrap(inner);
}

export function renderPaymentHtml(p: any, company: CompanyInfo): string {
  const isReceipt = p.direction === 'RECEIVED';
  const party = isReceipt ? p.customer : p.supplier;
  const allocations = (p.allocations || [])
    .map((a: any) => {
      const ref = a.invoice?.number || a.purchaseInvoice?.number || '—';
      return `<tr><td>${esc(ref)}</td><td class="r bold">${n2(num(a.amount))}</td></tr>`;
    })
    .join('');
  const inner = `
  ${letterhead(company, isReceipt ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER')}
  <div class="meta-grid">
    ${partyBlock(isReceipt ? 'Received From' : 'Paid To', party || {})}
    ${metaBlock([
      ['Voucher No', p.number],
      ['Date', formatDate(p.date)],
      ['Method', p.method],
      ...(p.reference ? [['Reference', p.reference] as [string, string]] : []),
    ])}
  </div>
  <div class="totals" style="justify-content:flex-start;">
    <table style="width:320px;">
      <tr class="grand"><td>Amount ${isReceipt ? 'Received' : 'Paid'} (AED)</td><td class="right">${n2(num(p.amount))}</td></tr>
    </table>
  </div>
  ${wordsBlock(p.amount)}
  ${allocations
    ? `<div class="vatbox"><div class="bold" style="margin-bottom:4px;">Allocated to:</div><table>
       <tr><th>Document</th><th>Amount (AED)</th></tr>${allocations}</table></div>`
    : ''}
  ${notesBlock(p.notes)}
  ${signatures(isReceipt ? 'Received By' : 'Authorised By', 'For Masoom Hardware')}
  ${footer(company)}`;
  return wrap(inner);
}

/* ─────────────────────────── purchase documents ─────────────────────────── */

/** Cost-based line table (LPO / purchase invoice) — rate column shows unit cost. */
function costItemsTable(items: any[]): string {
  const head = `<thead><tr>
    <th style="width:26px">#</th><th>Description</th>
    <th class="r" style="width:50px">Qty</th><th class="r" style="width:42px">Unit</th>
    <th class="r" style="width:80px">Cost</th><th class="r" style="width:46px">VAT%</th>
    <th class="r" style="width:90px">Amount</th>
  </tr></thead>`;
  const body = items
    .map((it, i) => `<tr>
      <td>${i + 1}</td>
      <td><div class="bold">${esc(it.description || it.product?.name || '')}</div>${it.product?.sku ? `<div class="muted">${esc(it.product.sku)}</div>` : ''}</td>
      <td class="r">${n2(num(it.quantity))}</td>
      <td class="r">${esc(it.product?.unit || '')}</td>
      <td class="r">${n2(num(it.unitPrice ?? it.unitCost))}</td>
      <td class="r">${n2(num(it.vatRate))}</td>
      <td class="r bold">${n2(num(it.total))}</td>
    </tr>`)
    .join('');
  return `<table class="items">${head}<tbody>${body}</tbody></table>`;
}

export function renderLpoHtml(lpo: any, company: CompanyInfo): string {
  const inner = `
  ${letterhead(company, 'PURCHASE ORDER')}
  <div class="meta-grid">
    ${partyBlock('Supplier', lpo.supplier)}
    ${metaBlock([
      ['LPO No', lpo.number],
      ['Date', formatDate(lpo.date)],
      ['Status', lpo.status],
    ])}
  </div>
  ${costItemsTable(lpo.items || [])}
  ${totalsBlock({ subtotal: lpo.subtotal, vatAmount: lpo.vatAmount, total: lpo.total })}
  ${wordsBlock(lpo.total)}
  ${notesBlock(lpo.notes)}
  ${signatures('Prepared By', 'Approved By')}
  ${footer(company)}`;
  return wrap(inner);
}

export function renderGrnHtml(grn: any, company: CompanyInfo): string {
  const items = (grn.items || [])
    .map((it: any, i: number) => `<tr>
      <td>${i + 1}</td>
      <td><div class="bold">${esc(it.product?.name || '')}</div>${it.product?.sku ? `<div class="muted">${esc(it.product.sku)}</div>` : ''}</td>
      <td class="r">${esc(it.product?.unit || '')}</td>
      <td class="r bold">${n2(num(it.quantity))}</td>
      <td class="r">${n2(num(it.unitCost))}</td>
    </tr>`)
    .join('');
  const inner = `
  ${letterhead(company, 'GOODS RECEIVED NOTE')}
  <div class="meta-grid">
    ${partyBlock('Supplier', grn.lpo?.supplier || {})}
    ${metaBlock([
      ['GRN No', grn.number],
      ['Date', formatDate(grn.date)],
      ...(grn.lpo ? [['Against LPO', grn.lpo.number] as [string, string]] : []),
      ['Warehouse', grn.warehouse?.name || ''],
    ])}
  </div>
  <table class="items">
    <thead><tr><th style="width:26px">#</th><th>Description</th><th class="r" style="width:60px">Unit</th><th class="r" style="width:90px">Qty Recd</th><th class="r" style="width:90px">Unit Cost</th></tr></thead>
    <tbody>${items}</tbody>
  </table>
  ${notesBlock(grn.notes)}
  ${signatures('Received By', 'Store Keeper')}
  ${footer(company)}`;
  return wrap(inner);
}

export function renderPurchaseInvoiceHtml(pi: any, company: CompanyInfo): string {
  const inner = `
  ${letterhead(company, 'PURCHASE INVOICE')}
  <div class="meta-grid">
    ${partyBlock('Supplier', pi.supplier)}
    ${metaBlock([
      ['PI No', pi.number],
      ...(pi.supplierInvoiceNo ? [['Supplier Inv', pi.supplierInvoiceNo] as [string, string]] : []),
      ['Date', formatDate(pi.date)],
      ...(pi.dueDate ? [['Due Date', formatDate(pi.dueDate)] as [string, string]] : []),
      ['Status', pi.status],
    ])}
  </div>
  ${costItemsTable(pi.items || [])}
  ${vatBreakdownBox(pi.vatBreakdown)}
  ${totalsBlock({ subtotal: pi.subtotal, vatAmount: pi.vatAmount, total: pi.total, amountPaid: pi.amountPaid })}
  ${wordsBlock(pi.total)}
  ${notesBlock(pi.notes)}
  ${signatures('Checked By', 'Approved By')}
  ${footer(company)}`;
  return wrap(inner);
}

export function renderDebitNoteHtml(dn: any, company: CompanyInfo): string {
  const items = (dn.items || [])
    .map((it: any, i: number) => `<tr>
      <td>${i + 1}</td>
      <td><div class="bold">${esc(it.product?.name || '')}</div>${it.product?.sku ? `<div class="muted">${esc(it.product.sku)}</div>` : ''}</td>
      <td class="r">${n2(num(it.quantity))}</td>
      <td class="r">${n2(num(it.unitCost))}</td>
      <td class="r bold">${n2(num(it.total))}</td>
    </tr>`)
    .join('');
  const inner = `
  ${letterhead(company, 'DEBIT NOTE')}
  <div class="meta-grid">
    ${partyBlock('Supplier', dn.supplier)}
    ${metaBlock([
      ['Debit Note No', dn.number],
      ['Date', formatDate(dn.date)],
      ...(dn.purchaseInvoice ? [['Against PI', dn.purchaseInvoice.number] as [string, string]] : []),
      ...(dn.reason ? [['Reason', dn.reason] as [string, string]] : []),
    ])}
  </div>
  <table class="items">
    <thead><tr><th style="width:26px">#</th><th>Description</th><th class="r" style="width:80px">Qty</th><th class="r" style="width:90px">Unit Cost</th><th class="r" style="width:100px">Amount</th></tr></thead>
    <tbody>${items}</tbody>
  </table>
  <div class="totals"><table><tr class="grand"><td>Total Debit (AED)</td><td class="right">${n2(num(dn.total))}</td></tr></table></div>
  ${wordsBlock(dn.total)}
  ${signatures('Issued By', 'For Masoom Hardware')}
  ${footer(company)}`;
  return wrap(inner);
}
