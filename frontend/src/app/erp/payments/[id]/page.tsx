'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { openPdf } from '@/lib/pdf';
import { useOne, type Payment } from '@/lib/erp-api';
import { Card, ErpPage, Spinner } from '@/components/erp/ErpPage';
import { DocHeader } from '@/components/erp/DocView';
import { n2, formatDate, amountInWordsAed } from '@/lib/format';

export default function SupplierPaymentViewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: p, isLoading, error } = useOne<Payment>('payments', id);

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !p) return <div className="p-8 text-sm text-red-600">Payment not found.</div>;

  const isReceipt = p.direction === 'RECEIVED';
  const party = isReceipt ? p.customer : p.supplier;
  const backHref = isReceipt ? '/erp/receipts' : '/erp/payments';

  return (
    <ErpPage
      kicker={isReceipt ? 'Receipt Voucher' : 'Payment Voucher'}
      title={p.number}
      description={`${party?.name ?? ''} · AED ${n2(p.amount)}`}
      actions={
        <>
          <Link href={backHref} className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <button onClick={() => void openPdf('payments', p.id)} className="btn-shimmer inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400"><Printer className="h-4 w-4" /> PDF</button>
        </>
      }
    >
      <div className="space-y-5">
        <DocHeader
          party={party}
          partyLabel={isReceipt ? 'Received From' : 'Paid To'}
          meta={[
            { label: 'Voucher #', value: p.number },
            { label: 'Date', value: formatDate(p.date) },
            { label: 'Method', value: p.method.replace('_', ' ') },
            { label: 'Reference', value: p.reference ?? '—' },
          ]}
        />
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <span className="font-display text-lg tracking-widest text-ink-900">AMOUNT {isReceipt ? 'RECEIVED' : 'PAID'}</span>
            <span className={`font-mono text-2xl font-bold ${isReceipt ? 'text-green-700' : 'text-red-700'}`}>AED {n2(p.amount)}</span>
          </div>
          <p className="mt-3 text-xs italic text-ink-500">{amountInWordsAed(Number(p.amount))}</p>
          {p.allocations && p.allocations.length > 0 && (
            <table className="mt-5 w-full text-sm">
              <thead><tr className="border-b border-ink-100 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500"><th className="py-2">Allocated to</th><th className="py-2 text-right">Amount</th></tr></thead>
              <tbody>{p.allocations.map((a) => (<tr key={a.id} className="border-b border-ink-100 last:border-0"><td className="py-2 font-mono text-xs">{a.invoice?.number ?? a.purchaseInvoice?.number ?? '—'}</td><td className="py-2 text-right font-mono font-bold">{n2(a.amount)}</td></tr>))}</tbody>
            </table>
          )}
          {p.notes && <p className="mt-4 text-sm text-ink-600"><span className="font-bold">Notes:</span> {p.notes}</p>}
        </Card>
      </div>
    </ErpPage>
  );
}
