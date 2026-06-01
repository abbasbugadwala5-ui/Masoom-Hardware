'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Printer, FileDown, HandCoins, Truck, Undo2 } from 'lucide-react';
import { api } from '@/lib/api';
import { openPdf } from '@/lib/pdf';
import { useOne, type Invoice } from '@/lib/erp-api';
import { ErpPage, Spinner } from '@/components/erp/ErpPage';
import { PrintableInvoice } from '@/components/erp/PrintableInvoice';
import { useAuth } from '@/lib/auth-store';
import { n2 } from '@/lib/format';

export default function InvoiceViewPage() {
  const params = useParams<{ id: string }>();
  const can = useAuth((s) => s.can);
  const qc = useQueryClient();
  const { data: inv, isLoading, error } = useOne<Invoice>('invoices', params.id);

  const post = useMutation({
    mutationFn: async (id: string) => (await api.post<{ data: Invoice }>(`/invoices/${id}/post`)).data.data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices', params.id] });
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !inv) return <div className="p-8 text-sm text-red-600">Invoice not found.</div>;

  const balance = Number(inv.total) - Number(inv.amountPaid ?? 0);
  const isOpen = inv.status === 'POSTED' || inv.status === 'PART_PAID';

  return (
    <ErpPage
      kicker="Tax Invoice"
      title={inv.number}
      description={`${inv.customer?.name ?? 'Customer'} · ${inv.status}${Number(inv.amountPaid ?? 0) > 0 ? ` · Balance AED ${n2(balance)}` : ''}`}
      actions={
        <>
          <Link href="/erp/sales" className="no-print inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          {inv.status === 'DRAFT' && can('invoice.post') && (
            <button onClick={() => post.mutate(inv.id)} disabled={post.isPending}
              className="no-print inline-flex items-center gap-1.5 rounded-sm border border-green-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-green-700 hover:bg-green-50 disabled:opacity-60">
              <CheckCircle className="h-4 w-4" /> Post
            </button>
          )}
          <button onClick={() => void openPdf('invoices', inv.id, { download: true })}
            className="no-print inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">
            <FileDown className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => window.print()}
            className="btn-shimmer no-print inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400">
            <Printer className="h-4 w-4" /> Print
          </button>
        </>
      }
    >
      {/* Related-document quick actions */}
      {isOpen && (
        <div className="no-print mb-4 flex flex-wrap items-center gap-2">
          {can('payment.receive') && balance > 0 && (
            <Link href={`/erp/receipts/new?invoiceId=${inv.id}`} className="inline-flex items-center gap-1.5 rounded-sm border border-green-300 bg-green-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-green-700 hover:bg-green-100">
              <HandCoins className="h-4 w-4" /> Receive Payment
            </Link>
          )}
          {can('delivery.write') && (
            <Link href={`/erp/deliveries/new?invoiceId=${inv.id}`} className="inline-flex items-center gap-1.5 rounded-sm border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-blue-700 hover:bg-blue-100">
              <Truck className="h-4 w-4" /> Delivery Order
            </Link>
          )}
          {can('creditnote.write') && (
            <Link href={`/erp/credit-notes/new?invoiceId=${inv.id}`} className="inline-flex items-center gap-1.5 rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-700 hover:bg-red-100">
              <Undo2 className="h-4 w-4" /> Credit Note
            </Link>
          )}
        </div>
      )}

      <div className="rounded-sm border border-ink-100 bg-white shadow-soft">
        <div className="print-zone">
          <PrintableInvoice invoice={inv} />
        </div>
      </div>
    </ErpPage>
  );
}
