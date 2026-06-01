'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, Truck, PackageCheck, Ban, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { openPdf } from '@/lib/pdf';
import { useOne, type DeliveryOrder } from '@/lib/erp-api';
import { ErpPage, Spinner } from '@/components/erp/ErpPage';
import { DocHeader, QtyItemsView, StatusChip, STATUS_TONES } from '@/components/erp/DocView';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth-store';
import { apiErrorMessage } from '@/lib/lookups';

export default function DeliveryViewPage() {
  const { id } = useParams<{ id: string }>();
  const can = useAuth((s) => s.can);
  const qc = useQueryClient();
  const { data: d, isLoading, error } = useOne<DeliveryOrder>('delivery-orders', id);

  const act = useMutation({
    mutationFn: async (action: 'dispatch' | 'deliver' | 'cancel') => (await api.post(`/delivery-orders/${id}/${action}`)).data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['delivery-orders'] }); },
  });

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !d) return <div className="p-8 text-sm text-red-600">Delivery order not found.</div>;

  return (
    <ErpPage
      kicker="Delivery Order"
      title={d.number}
      description={<span>{d.customer?.name} · <StatusChip status={d.status} tone={STATUS_TONES[d.status]} /></span>}
      actions={
        <>
          <Link href="/erp/deliveries" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>
          {can('delivery.write') && d.status === 'DRAFT' && (
            <button onClick={() => act.mutate('dispatch')} disabled={act.isPending} className="inline-flex items-center gap-1.5 rounded-sm border border-blue-500 px-3 py-2 text-xs font-bold uppercase tracking-widest text-blue-700 hover:bg-blue-50 disabled:opacity-60"><Truck className="h-4 w-4" /> Dispatch</button>
          )}
          {can('delivery.write') && d.status === 'DISPATCHED' && (
            <button onClick={() => act.mutate('deliver')} disabled={act.isPending} className="inline-flex items-center gap-1.5 rounded-sm border border-green-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-green-700 hover:bg-green-50 disabled:opacity-60"><PackageCheck className="h-4 w-4" /> Mark Delivered</button>
          )}
          {can('delivery.write') && d.status !== 'CANCELLED' && (
            <button onClick={() => act.mutate('cancel')} disabled={act.isPending} className="inline-flex items-center gap-1.5 rounded-sm border border-red-500 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-60"><Ban className="h-4 w-4" /> Cancel</button>
          )}
          <button onClick={() => void openPdf('delivery-orders', d.id)} className="btn-shimmer inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400"><Printer className="h-4 w-4" /> PDF</button>
        </>
      }
    >
      {act.error && <div className="mb-4 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{apiErrorMessage(act.error)}</div>}
      {d.invoice && (
        <Link href={`/erp/sales/${d.invoice.id}`} className="mb-4 inline-flex items-center gap-1.5 rounded-sm border border-brand-300 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100"><ExternalLink className="h-4 w-4" /> Against invoice {d.invoice.number}</Link>
      )}
      <div className="space-y-5">
        <DocHeader
          party={d.customer}
          partyLabel="Deliver To"
          meta={[
            { label: 'DO #', value: d.number },
            { label: 'Date', value: formatDate(d.date) },
            { label: 'Warehouse', value: d.warehouse?.name ?? '—' },
            { label: 'Driver', value: d.driverName ?? '—' },
            { label: 'Vehicle', value: d.vehicleNo ?? '—' },
            { label: 'Status', value: <StatusChip status={d.status} tone={STATUS_TONES[d.status]} /> },
          ]}
        />
        <QtyItemsView items={d.items} />
      </div>
    </ErpPage>
  );
}
