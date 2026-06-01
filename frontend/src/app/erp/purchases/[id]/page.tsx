'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, FileDown, Send, Ban, PackagePlus } from 'lucide-react';
import { api } from '@/lib/api';
import { openPdf } from '@/lib/pdf';
import { useOne, type Lpo } from '@/lib/erp-api';
import { ErpPage, Spinner } from '@/components/erp/ErpPage';
import { PrintableLpo } from '@/components/erp/PrintableInvoice';
import { useAuth } from '@/lib/auth-store';

export default function LpoViewPage() {
  const params = useParams<{ id: string }>();
  const can = useAuth((s) => s.can);
  const qc = useQueryClient();
  const { data: lpo, isLoading, error } = useOne<Lpo>('lpos', params.id);

  const act = useMutation({
    mutationFn: async (action: 'send' | 'receive' | 'cancel') => (await api.post(`/lpos/${params.id}/${action}`)).data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['lpos'] }); },
  });

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !lpo) return <div className="p-8 text-sm text-red-600">LPO not found.</div>;

  const active = lpo.status === 'DRAFT' || lpo.status === 'SENT';

  return (
    <ErpPage
      kicker="Purchase Order"
      title={lpo.number}
      description={`${lpo.supplier?.name ?? 'Supplier'} · ${lpo.status}`}
      actions={
        <>
          <Link href="/erp/purchases" className="no-print inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          {can('lpo.write') && lpo.status === 'DRAFT' && <button onClick={() => act.mutate('send')} disabled={act.isPending} className="no-print inline-flex items-center gap-1.5 rounded-sm border border-blue-500 px-3 py-2 text-xs font-bold uppercase tracking-widest text-blue-700 hover:bg-blue-50 disabled:opacity-60"><Send className="h-4 w-4" /> Send</button>}
          {can('grn.write') && active && <Link href={`/erp/grns/new?lpoId=${lpo.id}`} className="no-print inline-flex items-center gap-1.5 rounded-sm bg-ink-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-ink-800"><PackagePlus className="h-4 w-4" /> Receive (GRN)</Link>}
          {can('lpo.write') && active && <button onClick={() => act.mutate('cancel')} disabled={act.isPending} className="no-print inline-flex items-center gap-1.5 rounded-sm border border-red-500 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-60"><Ban className="h-4 w-4" /> Cancel</button>}
          <button onClick={() => void openPdf('lpos', lpo.id, { download: true })} className="no-print inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><FileDown className="h-4 w-4" /> PDF</button>
          <button onClick={() => window.print()} className="btn-shimmer no-print inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400"><Printer className="h-4 w-4" /> Print</button>
        </>
      }
    >
      <div className="rounded-sm border border-ink-100 bg-white shadow-soft">
        <div className="print-zone">
          <PrintableLpo lpo={lpo} />
        </div>
      </div>
    </ErpPage>
  );
}
