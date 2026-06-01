'use client';

import type { Invoice, Lpo } from '@/lib/erp-api';
import { amountInWordsAed, formatDate, n2 } from '@/lib/format';
import { COMPANY } from '@/lib/company';

function qrUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(payload)}`;
}

/* ── Reusable letterhead (top of every invoice / LPO) ─────────────────── */
function CompanyLetterhead({ docTitle }: { docTitle: string }) {
  return (
    <div className="border-b-2 border-brand-500 pb-5">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <div
            className="grid h-14 w-14 place-items-center bg-brand-500"
            style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}
          >
            <span className="font-display text-xl font-bold tracking-tight text-ink-950">MH</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-widest text-ink-900">MASOOM</div>
            <div className="font-display text-xl tracking-[0.32em] text-brand-600">HARDWARE</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-ink-500">{COMPANY.legalName}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl tracking-tight text-ink-900">{docTitle}</div>
          <div className="mt-1 font-mono text-[11px] text-ink-700">TRN: {COMPANY.trn}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[10.5px] leading-tight">
        {([COMPANY.branches.dubai, COMPANY.branches.sharjah] as const).map((b) => (
          <div key={b.label} className="rounded-sm bg-ink-50 px-3 py-2">
            <div className="font-bold uppercase tracking-widest text-brand-700">{b.label}</div>
            <div className="text-ink-700">{b.address}, {b.city} · {b.poBox}</div>
            <div className="text-ink-700">Tel: {b.tel} · Fax: {b.fax} · Mob: {b.mob}</div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 text-center text-[10.5px] text-ink-600">
        E-mail: <span className="font-semibold">{COMPANY.email}</span>
      </div>
    </div>
  );
}

/* ── TAX INVOICE ──────────────────────────────────────────────────────── */
export function PrintableInvoice({ invoice }: { invoice: Invoice }) {
  const qr = qrUrl(
    `${COMPANY.legalName}|TRN:${COMPANY.trn}|${invoice.number}|${invoice.date}|AED ${n2(invoice.total)}`,
  );

  return (
    <div className="mx-auto max-w-[820px] bg-white text-ink-900 print:max-w-none print:p-0" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="p-10 print:p-6">
        <CompanyLetterhead docTitle="TAX INVOICE" />

        {/* Meta */}
        <div className="mt-5 grid grid-cols-2 gap-8 text-sm">
          <div className="rounded-sm bg-ink-50 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-500">Bill To</div>
            <div className="mt-1 text-base font-bold text-ink-900">{invoice.customer?.legalName ?? invoice.customer?.name}</div>
            {invoice.customer?.addressLine1 && <div className="text-sm text-ink-700">{invoice.customer.addressLine1}</div>}
            {invoice.customer?.city && <div className="text-sm text-ink-700">{invoice.customer.city}{invoice.customer.country ? `, ${invoice.customer.country}` : ''}</div>}
            {invoice.customer?.trn && <div className="text-sm text-ink-700">Customer TRN: <span className="font-mono">{invoice.customer.trn}</span></div>}
            {invoice.customer?.phone && <div className="text-sm text-ink-700">Mob: {invoice.customer.phone}</div>}
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-sm self-start">
            <KV k="Invoice No.">{invoice.number}</KV>
            <KV k="Status"><span className="rounded-sm bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase">{invoice.status}</span></KV>
            <KV k="Invoice Date">{formatDate(invoice.date)}</KV>
            <KV k="Due Date">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</KV>
            <KV k="Currency">AED</KV>
          </div>
        </div>

        {/* Items */}
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="bg-ink-950 text-white">
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest" style={{ width: '40px' }}>S.No</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest">Description</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '60px' }}>Qty</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '90px' }}>Rate (Dhs)</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '90px' }}>Amount</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '90px' }}>VAT 5% Dhs</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '110px' }}>Incl. (Dhs)</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items ?? []).map((it, i) => (
              <tr key={it.id} className="border-b border-ink-100">
                <td className="px-3 py-2.5 text-ink-500">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-ink-900">{it.description}</div>
                  {it.product && <div className="text-[10px] text-ink-500">SKU: <span className="font-mono">{it.product.sku}</span></div>}
                </td>
                <td className="px-2 py-2.5 text-right font-mono">{Number(it.quantity)}</td>
                <td className="px-2 py-2.5 text-right font-mono">{n2(it.unitPrice)}</td>
                <td className="px-2 py-2.5 text-right font-mono">{n2(it.subtotal)}</td>
                <td className="px-2 py-2.5 text-right font-mono">{n2(it.vatAmount)}</td>
                <td className="px-2 py-2.5 text-right font-mono font-bold">{n2(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals + amount in words */}
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div className="rounded-sm bg-ink-50 p-3 text-xs text-ink-700">
            <span className="font-bold uppercase tracking-widest text-ink-500">Amount in words: </span>
            <div className="mt-1 text-sm text-ink-900">{amountInWordsAed(invoice.total)}</div>
          </div>
          <div className="justify-self-end">
            <table className="text-sm">
              <tbody>
                <Row label="Subtotal"      value={n2(invoice.subtotal)} />
                <Row label="VAT (5%)"      value={n2(invoice.vatAmount)} />
                <Row label="TOTAL"         value={`AED ${n2(invoice.total)}`} bold />
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-8 border-t-2 border-ink-200 pt-5">
          <div>
            {invoice.notes && <div className="text-xs text-ink-600"><span className="font-bold">Notes:</span> {invoice.notes}</div>}
            {invoice.terms && <div className="mt-1 text-xs text-ink-600"><span className="font-bold">Terms:</span> {invoice.terms}</div>}
            <div className="mt-10 inline-block border-t border-ink-300 pt-2 text-xs text-ink-500" style={{ minWidth: 200 }}>
              Authorised Signature
            </div>
          </div>
          <div className="text-right">
            <img src={qr} alt="FTA QR code" className="ml-auto h-24 w-24 border border-ink-200 p-1" />
            <div className="mt-1 text-[10px] uppercase tracking-widest text-ink-500">Scan to verify</div>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-ink-400">
          Thank you for your business! · {COMPANY.legalName} · TRN {COMPANY.trn}
        </div>
      </div>
    </div>
  );
}

/* ── PURCHASE ORDER ──────────────────────────────────────────────────── */
export function PrintableLpo({ lpo }: { lpo: Lpo }) {
  return (
    <div className="mx-auto max-w-[820px] bg-white text-ink-900 print:max-w-none print:p-0" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="p-10 print:p-6">
        <CompanyLetterhead docTitle="PURCHASE ORDER" />

        <div className="mt-5 grid grid-cols-2 gap-8 text-sm">
          <div className="rounded-sm bg-ink-50 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-500">Supplier</div>
            <div className="mt-1 text-base font-bold text-ink-900">{lpo.supplier?.legalName ?? lpo.supplier?.name}</div>
            {lpo.supplier?.addressLine1 && <div className="text-sm text-ink-700">{lpo.supplier.addressLine1}</div>}
            {lpo.supplier?.city && <div className="text-sm text-ink-700">{lpo.supplier.city}{lpo.supplier.country ? `, ${lpo.supplier.country}` : ''}</div>}
            {lpo.supplier?.trn && <div className="text-sm text-ink-700">Supplier TRN: <span className="font-mono">{lpo.supplier.trn}</span></div>}
            {lpo.supplier?.phone && <div className="text-sm text-ink-700">Mob: {lpo.supplier.phone}</div>}
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-sm self-start">
            <KV k="LPO No.">{lpo.number}</KV>
            <KV k="Status"><span className="rounded-sm bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase">{lpo.status}</span></KV>
            <KV k="Order Date">{formatDate(lpo.date)}</KV>
            <KV k="Currency">AED</KV>
          </div>
        </div>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="bg-ink-950 text-white">
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest" style={{ width: '40px' }}>S.No</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest">Description</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '60px' }}>Qty</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '90px' }}>Rate (Dhs)</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '90px' }}>Amount</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '90px' }}>VAT 5% Dhs</th>
              <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-widest" style={{ width: '110px' }}>Incl. (Dhs)</th>
            </tr>
          </thead>
          <tbody>
            {(lpo.items ?? []).map((it, i) => (
              <tr key={it.id} className="border-b border-ink-100">
                <td className="px-3 py-2.5 text-ink-500">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-ink-900">{it.description}</div>
                  {it.product && <div className="text-[10px] text-ink-500">SKU: <span className="font-mono">{it.product.sku}</span></div>}
                </td>
                <td className="px-2 py-2.5 text-right font-mono">{Number(it.quantity)}</td>
                <td className="px-2 py-2.5 text-right font-mono">{n2(it.unitPrice)}</td>
                <td className="px-2 py-2.5 text-right font-mono">{n2(it.subtotal)}</td>
                <td className="px-2 py-2.5 text-right font-mono">{n2(it.vatAmount)}</td>
                <td className="px-2 py-2.5 text-right font-mono font-bold">{n2(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 grid grid-cols-2 gap-6">
          <div className="rounded-sm bg-ink-50 p-3 text-xs text-ink-700">
            <span className="font-bold uppercase tracking-widest text-ink-500">Amount in words: </span>
            <div className="mt-1 text-sm text-ink-900">{amountInWordsAed(lpo.total)}</div>
          </div>
          <div className="justify-self-end">
            <table className="text-sm">
              <tbody>
                <Row label="Subtotal" value={n2(lpo.subtotal)} />
                <Row label="VAT (5%)" value={n2(lpo.vatAmount)} />
                <Row label="TOTAL"    value={`AED ${n2(lpo.total)}`} bold />
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 items-end gap-8 border-t-2 border-ink-200 pt-5">
          <div>
            {lpo.notes && <div className="text-xs text-ink-600"><span className="font-bold">Notes:</span> {lpo.notes}</div>}
            <div className="mt-10 inline-block border-t border-ink-300 pt-2 text-xs text-ink-500" style={{ minWidth: 200 }}>
              Prepared By
            </div>
          </div>
          <div className="text-right">
            <div className="mt-10 inline-block border-t border-ink-300 pt-2 text-xs text-ink-500" style={{ minWidth: 220 }}>
              Supplier Acceptance &amp; Stamp
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-ink-400">
          {COMPANY.legalName} · TRN {COMPANY.trn} · {COMPANY.email}
        </div>
      </div>
    </div>
  );
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{k}</div>
      <div className="text-right font-mono text-ink-900">{children}</div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={bold ? 'border-t-2 border-ink-900' : ''}>
      <td className={`pr-6 ${bold ? 'py-2 font-display text-base tracking-wide' : 'py-1 text-ink-500'}`}>{label}</td>
      <td className={`text-right font-mono ${bold ? 'py-2 text-lg font-bold' : 'py-1 text-ink-700'}`}>{value}</td>
    </tr>
  );
}
