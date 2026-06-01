'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, CheckCircle, HandCoins, Undo2 } from 'lucide-react';
import { api } from '@/lib/api';
import { openPdf } from '@/lib/pdf';
import { useOne, type PurchaseInvoice } from '@/lib/erp-api';
import { Card, ErpPage, Spinner } from '@/components/erp/ErpPage';
import { DocHeader, StatusChip, STATUS_TONES } from '@/components/erp/DocView';
import { n2, formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth-store';

export default function PurchaseInvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const can = useAuth((s) => s.can);
  const qc = useQueryClient();
  const { data: pi, isLoading, error } = useOne<PurchaseInvoice>('purchase-invoices', id);

  const post = useMutation({ mutationFn: async () => (await api.post(`/purchase-invoices/${id}/post`)).data, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['purchase-invoices'] }); } });

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !pi) return <div className="p-8 text-sm text-red-600">Purchase invoice not found.</div>;

  const balance = Number(pi.total) - Number(pi.amountPaid ?? 0);
  const isOpen = pi.status === 'POSTED' || pi.status === 'PART_PAID';

  return (
    <ErpPage
      kicker="Purchase Invoice"
      title={pi.number}
      description={<span>{pi.supplier?.name} · <StatusChip status={pi.status} tone={STATUS_TONES[pi.status]} />{Number(pi.amountPaid ?? 0) > 0 ? ` · Balance AED ${n2(balance)}` : ''}</span>}
      actions={
        <>
          <Link href="/erp/purchase-invoices" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>
          {can('purchaseinvoice.write') && pi.status === 'DRAFT' && <button onClick={() => post.mutate()} disabled={post.isPending} className="inline-flex items-center gap-1.5 rounded-sm border border-green-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-green-700 hover:bg-green-50 disabled:opacity-60"><CheckCircle className="h-4 w-4" /> Post</button>}
          <button onClick={() => void openPdf('purchase-invoices', pi.id)} className="btn-shimmer inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400"><Printer className="h-4 w-4" /> PDF</button>
        </>
      }
    >
      {isOpen && (
        <div className="mb-4 flex flex-wrap gap-2">
          {can('payment.pay') && balance > 0 && <Link href={`/erp/payments/new?purchaseInvoiceId=${pi.id}`} className="inline-flex items-center gap-1.5 rounded-sm border border-green-300 bg-green-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-green-700 hover:bg-green-100"><HandCoins className="h-4 w-4" /> Pay Supplier</Link>}
          {can('debitnote.write') && <Link href={`/erp/debit-notes/new?purchaseInvoiceId=${pi.id}`} className="inline-flex items-center gap-1.5 rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-700 hover:bg-red-100"><Undo2 className="h-4 w-4" /> Debit Note</Link>}
        </div>
      )}
      <div className="space-y-5">
        <DocHeader
          party={pi.supplier}
          partyLabel="Supplier"
          meta={[
            { label: 'PI #', value: pi.number },
            { label: 'Supplier Inv', value: pi.supplierInvoiceNo ?? '—' },
            { label: 'Date', value: formatDate(pi.date) },
            { label: 'Due', value: pi.dueDate ? formatDate(pi.dueDate) : '—' },
            { label: 'Status', value: <StatusChip status={pi.status} tone={STATUS_TONES[pi.status]} /> },
          ]}
        />
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500"><th className="px-4 py-3">#</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">VAT%</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
            <tbody>
              {pi.items?.map((it, i) => (
                <tr key={it.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-3 text-ink-400">{i + 1}</td>
                  <td className="px-4 py-3"><div className="font-semibold text-ink-900">{it.description ?? it.product?.name}</div>{it.product?.sku && <div className="text-xs text-ink-400">{it.product.sku}</div>}</td>
                  <td className="px-4 py-3 text-right font-mono">{n2(it.quantity)} {it.product?.unit ?? ''}</td>
                  <td className="px-4 py-3 text-right font-mono">{n2(it.unitCost)}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink-500">{n2(it.vatRate ?? 0)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{n2(it.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-ink-50"><td colSpan={4} /><td className="px-4 py-2 text-right text-xs font-bold uppercase tracking-widest text-ink-500">Subtotal</td><td className="px-4 py-2 text-right font-mono">{n2(pi.subtotal)}</td></tr>
              <tr className="bg-ink-50"><td colSpan={4} /><td className="px-4 py-2 text-right text-xs font-bold uppercase tracking-widest text-ink-500">VAT</td><td className="px-4 py-2 text-right font-mono">{n2(pi.vatAmount)}</td></tr>
              <tr className="bg-brand-500/10"><td colSpan={4} /><td className="px-4 py-3 text-right font-display text-base tracking-wide text-ink-900">TOTAL</td><td className="px-4 py-3 text-right font-mono text-base font-bold">AED {n2(pi.total)}</td></tr>
            </tfoot>
          </table>
        </Card>
      </div>
    </ErpPage>
  );
}
