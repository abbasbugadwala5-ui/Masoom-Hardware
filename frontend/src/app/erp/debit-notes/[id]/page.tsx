'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { openPdf } from '@/lib/pdf';
import { useOne, type DebitNote } from '@/lib/erp-api';
import { Card, ErpPage, Spinner } from '@/components/erp/ErpPage';
import { DocHeader } from '@/components/erp/DocView';
import { n2, formatDate } from '@/lib/format';

export default function DebitNoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: dn, isLoading, error } = useOne<DebitNote>('debit-notes', id);

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !dn) return <div className="p-8 text-sm text-red-600">Debit note not found.</div>;

  return (
    <ErpPage
      kicker="Debit Note"
      title={dn.number}
      description={`${dn.supplier?.name ?? ''} · against ${dn.purchaseInvoice?.number ?? '—'}`}
      actions={
        <>
          <Link href="/erp/debit-notes" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <button onClick={() => void openPdf('debit-notes', dn.id)} className="btn-shimmer inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400"><Printer className="h-4 w-4" /> PDF</button>
        </>
      }
    >
      <div className="space-y-5">
        <DocHeader
          party={dn.supplier}
          partyLabel="Supplier"
          meta={[
            { label: 'Debit Note #', value: dn.number },
            { label: 'Date', value: formatDate(dn.date) },
            { label: 'Against PI', value: dn.purchaseInvoice?.number ?? '—' },
            { label: 'Reason', value: dn.reason ?? '—' },
          ]}
        />
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500"><th className="px-4 py-3">#</th><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Unit cost</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
            <tbody>
              {dn.items?.map((it, i) => (
                <tr key={it.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-3 text-ink-400">{i + 1}</td>
                  <td className="px-4 py-3"><div className="font-semibold text-ink-900">{it.product?.name}</div>{it.product?.sku && <div className="text-xs text-ink-400">{it.product.sku}</div>}</td>
                  <td className="px-4 py-3 text-right font-mono">{n2(it.quantity)} {it.product?.unit ?? ''}</td>
                  <td className="px-4 py-3 text-right font-mono">{n2(it.unitCost)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{n2(it.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-brand-500/10"><td colSpan={4} className="px-4 py-3 text-right font-display text-base tracking-wide text-ink-900">TOTAL DEBIT</td><td className="px-4 py-3 text-right font-mono text-base font-bold">AED {n2(dn.total)}</td></tr></tfoot>
          </table>
        </Card>
      </div>
    </ErpPage>
  );
}
