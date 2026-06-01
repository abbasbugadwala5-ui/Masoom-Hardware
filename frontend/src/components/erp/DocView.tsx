'use client';

import type { ReactNode } from 'react';
import { Card } from './ErpPage';
import { n2, formatDate } from '@/lib/format';
import type { PartyMini, PricedItem, DeliveryItem } from '@/lib/erp-api';

export function StatusChip({ status, tone }: { status: string; tone?: string }) {
  const cls = tone ?? 'bg-ink-100 text-ink-700 ring-ink-200';
  return <span className={`chip ring-1 ${cls}`}>{status}</span>;
}

export const STATUS_TONES: Record<string, string> = {
  DRAFT:      'bg-ink-100 text-ink-700 ring-ink-200',
  SENT:       'bg-blue-50 text-blue-700 ring-blue-200',
  ACCEPTED:   'bg-green-50 text-green-700 ring-green-200',
  CONFIRMED:  'bg-green-50 text-green-700 ring-green-200',
  REJECTED:   'bg-red-50 text-red-700 ring-red-200',
  EXPIRED:    'bg-ink-100 text-ink-500 ring-ink-200',
  POSTED:     'bg-brand-500/15 text-brand-700 ring-brand-500/30',
  INVOICED:   'bg-brand-500/15 text-brand-700 ring-brand-500/30',
  PAID:       'bg-green-50 text-green-700 ring-green-200',
  PART_PAID:  'bg-amber-50 text-amber-700 ring-amber-200',
  DISPATCHED: 'bg-blue-50 text-blue-700 ring-blue-200',
  DELIVERED:  'bg-green-50 text-green-700 ring-green-200',
  CANCELLED:  'bg-red-50 text-red-700 ring-red-200',
  RECEIVED:   'bg-green-50 text-green-700 ring-green-200',
};

function PartyCard({ label, party, extra }: { label: string; party?: PartyMini | null; extra?: ReactNode }) {
  if (!party) return null;
  const addr = [party.addressLine1, party.city, party.country].filter(Boolean).join(', ');
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-400">{label}</div>
      <div className="mt-1 font-bold text-ink-900">{party.legalName ?? party.name}</div>
      {party.trn && <div className="text-xs text-ink-500">TRN: <span className="font-mono">{party.trn}</span></div>}
      {addr && <div className="text-xs text-ink-500">{addr}</div>}
      {party.phone && <div className="text-xs text-ink-500">{party.phone}</div>}
      {extra}
    </div>
  );
}

export function DocMeta({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <span className="text-ink-500">{r.label}</span>
          <span className="text-right font-semibold text-ink-900">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Header card: party on the left, meta on the right. */
export function DocHeader({
  party, partyLabel = 'Customer', partyExtra, meta,
}: {
  party?: PartyMini | null; partyLabel?: string; partyExtra?: ReactNode;
  meta: { label: string; value: ReactNode }[];
}) {
  return (
    <Card className="p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <PartyCard label={partyLabel} party={party} extra={partyExtra} />
        <DocMeta rows={meta} />
      </div>
    </Card>
  );
}

/** Priced line items + totals (quotation / sales order / credit note). */
export function PricedItemsView({
  items, totals, showDiscount = true,
}: {
  items?: PricedItem[];
  totals?: { subtotal: string; vatAmount: string; total: string };
  showDiscount?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
              <th className="px-4 py-3" style={{ width: '40px' }}>#</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right" style={{ width: '90px' }}>Qty</th>
              <th className="px-4 py-3 text-right" style={{ width: '110px' }}>Rate</th>
              {showDiscount && <th className="px-4 py-3 text-right" style={{ width: '90px' }}>Disc</th>}
              <th className="px-4 py-3 text-right" style={{ width: '70px' }}>VAT%</th>
              <th className="px-4 py-3 text-right" style={{ width: '130px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((it, i) => (
              <tr key={it.id} className="border-b border-ink-100 last:border-b-0">
                <td className="px-4 py-3 text-ink-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink-900">{it.description ?? it.product?.name}</div>
                  {it.product?.sku && <div className="text-xs text-ink-400">{it.product.sku}</div>}
                </td>
                <td className="px-4 py-3 text-right font-mono">{n2(it.quantity)} {it.product?.unit ?? ''}</td>
                <td className="px-4 py-3 text-right font-mono">{n2(it.unitPrice)}</td>
                {showDiscount && <td className="px-4 py-3 text-right font-mono text-ink-500">{n2(it.discount ?? 0)}</td>}
                <td className="px-4 py-3 text-right font-mono text-ink-500">{n2(it.vatRate)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold">{n2(it.total)}</td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="border-t-2 border-ink-200 bg-ink-50">
                <td colSpan={showDiscount ? 5 : 4} />
                <td className="px-4 py-2 text-right text-xs font-bold uppercase tracking-widest text-ink-500">Subtotal</td>
                <td className="px-4 py-2 text-right font-mono">{n2(totals.subtotal)}</td>
              </tr>
              <tr className="bg-ink-50">
                <td colSpan={showDiscount ? 5 : 4} />
                <td className="px-4 py-2 text-right text-xs font-bold uppercase tracking-widest text-ink-500">VAT</td>
                <td className="px-4 py-2 text-right font-mono text-ink-500">{n2(totals.vatAmount)}</td>
              </tr>
              <tr className="bg-brand-500/10">
                <td colSpan={showDiscount ? 5 : 4} />
                <td className="px-4 py-3 text-right font-display text-base tracking-wide text-ink-900">TOTAL</td>
                <td className="px-4 py-3 text-right font-mono text-base font-bold text-ink-900">AED {n2(totals.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}

/** Quantity-only line items (delivery order). */
export function QtyItemsView({ items }: { items?: DeliveryItem[] }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
            <th className="px-4 py-3" style={{ width: '40px' }}>#</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3 text-right" style={{ width: '160px' }}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((it, i) => (
            <tr key={it.id} className="border-b border-ink-100 last:border-b-0">
              <td className="px-4 py-3 text-ink-400">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-ink-900">{it.description ?? it.product?.name}</div>
                {it.product?.sku && <div className="text-xs text-ink-400">{it.product.sku}</div>}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold">{n2(it.quantity)} {it.product?.unit ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export { formatDate };
