'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, ExternalLink } from 'lucide-react';
import { openPdf } from '@/lib/pdf';
import { useOne, type CreditNote } from '@/lib/erp-api';
import { ErpPage, Spinner } from '@/components/erp/ErpPage';
import { DocHeader, PricedItemsView } from '@/components/erp/DocView';
import { formatDate } from '@/lib/format';

export default function CreditNoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: cn, isLoading, error } = useOne<CreditNote>('credit-notes', id);

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !cn) return <div className="p-8 text-sm text-red-600">Credit note not found.</div>;

  return (
    <ErpPage
      kicker="Credit Note"
      title={cn.number}
      description={`${cn.customer?.name ?? 'Customer'} · against ${cn.invoice?.number ?? '—'}`}
      actions={
        <>
          <Link href="/erp/credit-notes" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <button onClick={() => void openPdf('credit-notes', cn.id)} className="btn-shimmer inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400"><Printer className="h-4 w-4" /> PDF</button>
        </>
      }
    >
      {cn.invoice && (
        <Link href={`/erp/sales/${cn.invoice.id}`} className="mb-4 inline-flex items-center gap-1.5 rounded-sm border border-brand-300 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100"><ExternalLink className="h-4 w-4" /> Against invoice {cn.invoice.number}</Link>
      )}
      <div className="space-y-5">
        <DocHeader
          party={cn.customer}
          partyLabel="Credit To"
          meta={[
            { label: 'Credit Note #', value: cn.number },
            { label: 'Date', value: formatDate(cn.date) },
            { label: 'Reason', value: cn.reason ?? '—' },
          ]}
        />
        <PricedItemsView items={cn.items} totals={{ subtotal: cn.taxableAmount, vatAmount: cn.vatAmount, total: cn.total }} showDiscount={false} />
      </div>
    </ErpPage>
  );
}
