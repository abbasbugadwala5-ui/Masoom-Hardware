'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, ClipboardCheck, FileText, Ban, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { openPdf } from '@/lib/pdf';
import { useOne, type SalesOrder, type Invoice } from '@/lib/erp-api';
import { Card, ErpPage, Spinner } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { DocHeader, PricedItemsView, StatusChip, STATUS_TONES } from '@/components/erp/DocView';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth-store';
import { apiErrorMessage } from '@/lib/lookups';

export default function SalesOrderViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useAuth((s) => s.can);
  const qc = useQueryClient();
  const { data: so, isLoading, error } = useOne<SalesOrder>('sales-orders', id);

  const due30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const [showInv, setShowInv] = useState(false);
  const [dueDate, setDueDate] = useState(due30);
  const [terms, setTerms] = useState('Payment within 30 days of invoice date.');

  const confirm = useMutation({
    mutationFn: async () => (await api.post(`/sales-orders/${id}/confirm`)).data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['sales-orders'] }); },
  });
  const cancel = useMutation({
    mutationFn: async () => (await api.post(`/sales-orders/${id}/cancel`)).data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['sales-orders'] }); },
  });
  const toInvoice = useMutation({
    mutationFn: async () => (await api.post<{ data: Invoice }>(`/sales-orders/${id}/invoice`, { dueDate: dueDate || null, terms: terms || null })).data.data,
    onSuccess: (inv) => { void qc.invalidateQueries({ queryKey: ['sales-orders'] }); router.push(`/erp/sales/${inv.id}`); },
  });

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !so) return <div className="p-8 text-sm text-red-600">Sales order not found.</div>;

  const canInvoice = !so.invoice && so.status !== 'CANCELLED';

  return (
    <ErpPage
      kicker="Sales Order"
      title={so.number}
      description={<span>{so.customer?.name} · <StatusChip status={so.status} tone={STATUS_TONES[so.status]} /></span>}
      actions={
        <>
          <Link href="/erp/sales-orders" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>
          {can('salesorder.write') && so.status === 'DRAFT' && (
            <button onClick={() => confirm.mutate()} disabled={confirm.isPending} className="inline-flex items-center gap-1.5 rounded-sm border border-green-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-green-700 hover:bg-green-50 disabled:opacity-60"><ClipboardCheck className="h-4 w-4" /> Confirm</button>
          )}
          {can('invoice.create') && canInvoice && (
            <button onClick={() => setShowInv((v) => !v)} className="inline-flex items-center gap-1.5 rounded-sm bg-ink-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-ink-800"><FileText className="h-4 w-4" /> Create Invoice</button>
          )}
          {can('salesorder.write') && canInvoice && so.status !== 'INVOICED' && (
            <button onClick={() => cancel.mutate()} disabled={cancel.isPending} className="inline-flex items-center gap-1.5 rounded-sm border border-red-500 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-60"><Ban className="h-4 w-4" /> Cancel</button>
          )}
          <button onClick={() => void openPdf('sales-orders', so.id)} className="btn-shimmer inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400"><Printer className="h-4 w-4" /> PDF</button>
        </>
      }
    >
      {(confirm.error || cancel.error || toInvoice.error) && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{apiErrorMessage(confirm.error || cancel.error || toInvoice.error)}</div>
      )}
      {so.invoice && (
        <Link href={`/erp/sales/${so.invoice.id}`} className="mb-4 inline-flex items-center gap-1.5 rounded-sm border border-brand-300 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100"><ExternalLink className="h-4 w-4" /> Invoiced → {so.invoice.number}</Link>
      )}
      {so.quotation && (
        <Link href={`/erp/quotations/${so.quotation.id}`} className="mb-4 ml-2 inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold text-ink-600 hover:border-brand-500"><ExternalLink className="h-4 w-4" /> From quotation {so.quotation.number}</Link>
      )}

      {showInv && canInvoice && (
        <Card className="mb-5 border-brand-200 p-5">
          <h3 className="mb-3 font-display text-base tracking-widest text-ink-900">CREATE TAX INVOICE</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Terms"><input value={terms} onChange={(e) => setTerms(e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowInv(false)} className="rounded-sm border border-ink-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-700">Cancel</button>
            <button onClick={() => toInvoice.mutate()} disabled={toInvoice.isPending} className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-5 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400 disabled:opacity-60"><FileText className="h-4 w-4" /> Generate invoice</button>
          </div>
        </Card>
      )}

      <div className="space-y-5">
        <DocHeader
          party={so.customer}
          meta={[
            { label: 'Order #', value: so.number },
            { label: 'Date', value: formatDate(so.date) },
            { label: 'Status', value: <StatusChip status={so.status} tone={STATUS_TONES[so.status]} /> },
          ]}
        />
        <PricedItemsView items={so.items} totals={{ subtotal: so.taxableAmount, vatAmount: so.vatAmount, total: so.total }} />
      </div>
    </ErpPage>
  );
}
