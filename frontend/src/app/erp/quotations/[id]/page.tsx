'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, Send, Check, X, ArrowRightCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { openPdf } from '@/lib/pdf';
import { useOne, type Quotation, type SalesOrder } from '@/lib/erp-api';
import { ErpPage, Spinner } from '@/components/erp/ErpPage';
import { DocHeader, PricedItemsView, StatusChip, STATUS_TONES } from '@/components/erp/DocView';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth-store';
import { apiErrorMessage } from '@/lib/lookups';

export default function QuotationViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useAuth((s) => s.can);
  const qc = useQueryClient();
  const { data: q, isLoading, error } = useOne<Quotation>('quotations', id);

  const act = useMutation({
    mutationFn: async (action: 'send' | 'accept' | 'reject') => (await api.post(`/quotations/${id}/${action}`)).data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['quotations'] }); },
  });
  const convert = useMutation({
    mutationFn: async () => (await api.post<{ data: SalesOrder }>(`/quotations/${id}/convert`)).data.data,
    onSuccess: (so) => { void qc.invalidateQueries({ queryKey: ['quotations'] }); router.push(`/erp/sales-orders/${so.id}`); },
  });

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !q) return <div className="p-8 text-sm text-red-600">Quotation not found.</div>;

  const editable = q.status === 'DRAFT' || q.status === 'SENT';
  const canConvert = !q.salesOrder && q.status !== 'REJECTED' && q.status !== 'EXPIRED';

  return (
    <ErpPage
      kicker="Quotation"
      title={q.number}
      description={<span>{q.customer?.name} · <StatusChip status={q.status} tone={STATUS_TONES[q.status]} /></span>}
      actions={
        <>
          <Link href="/erp/quotations" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>
          {can('quotation.write') && q.status === 'DRAFT' && (
            <button onClick={() => act.mutate('send')} disabled={act.isPending} className="inline-flex items-center gap-1.5 rounded-sm border border-blue-500 px-3 py-2 text-xs font-bold uppercase tracking-widest text-blue-700 hover:bg-blue-50 disabled:opacity-60"><Send className="h-4 w-4" /> Send</button>
          )}
          {can('quotation.write') && editable && (
            <>
              <button onClick={() => act.mutate('accept')} disabled={act.isPending} className="inline-flex items-center gap-1.5 rounded-sm border border-green-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-green-700 hover:bg-green-50 disabled:opacity-60"><Check className="h-4 w-4" /> Accept</button>
              <button onClick={() => act.mutate('reject')} disabled={act.isPending} className="inline-flex items-center gap-1.5 rounded-sm border border-red-500 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-60"><X className="h-4 w-4" /> Reject</button>
            </>
          )}
          {can('quotation.write') && canConvert && (
            <button onClick={() => convert.mutate()} disabled={convert.isPending} className="inline-flex items-center gap-1.5 rounded-sm bg-ink-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-ink-800 disabled:opacity-60"><ArrowRightCircle className="h-4 w-4" /> Convert to SO</button>
          )}
          <button onClick={() => void openPdf('quotations', q.id)} className="btn-shimmer inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400"><Printer className="h-4 w-4" /> PDF</button>
        </>
      }
    >
      {(act.error || convert.error) && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{apiErrorMessage(act.error || convert.error)}</div>
      )}
      {q.salesOrder && (
        <Link href={`/erp/sales-orders/${q.salesOrder.id}`} className="mb-4 inline-flex items-center gap-1.5 rounded-sm border border-brand-300 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100">
          <ExternalLink className="h-4 w-4" /> Converted → Sales Order {q.salesOrder.number}
        </Link>
      )}
      <div className="space-y-5">
        <DocHeader
          party={q.customer}
          meta={[
            { label: 'Quotation #', value: q.number },
            { label: 'Date', value: formatDate(q.date) },
            { label: 'Valid Until', value: q.validUntil ? formatDate(q.validUntil) : '—' },
            { label: 'Status', value: <StatusChip status={q.status} tone={STATUS_TONES[q.status]} /> },
          ]}
        />
        <PricedItemsView items={q.items} totals={{ subtotal: q.taxableAmount, vatAmount: q.vatAmount, total: q.total }} />
        {(q.notes || q.terms) && (
          <div className="rounded-sm border border-ink-100 bg-white p-5 text-sm text-ink-600">
            {q.notes && <div><span className="font-bold">Notes:</span> {q.notes}</div>}
            {q.terms && <div className="mt-1"><span className="font-bold">Terms:</span> {q.terms}</div>}
          </div>
        )}
      </div>
    </ErpPage>
  );
}
