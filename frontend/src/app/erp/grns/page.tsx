'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Plus, Search } from 'lucide-react';
import { ErpPage } from '@/components/erp/ErpPage';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { useList, type Grn } from '@/lib/erp-api';
import { useAuth } from '@/lib/auth-store';
import { formatDate } from '@/lib/format';

export default function GrnsListPage() {
  const can = useAuth((s) => s.can);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, isFetching } = useList<Grn>('grns', { page, pageSize: 20, q, sort: 'date', order: 'desc' });

  const cols: Column<Grn>[] = [
    { header: 'GRN #', width: '170px', accessor: (r) => <Link href={`/erp/grns/${r.id}`} className="font-mono text-xs font-bold text-ink-900 hover:text-brand-600">{r.number}</Link> },
    { header: 'Warehouse', accessor: (r) => <span className="text-ink-900">{r.warehouse?.name ?? '—'}</span> },
    { header: 'Against LPO', width: '160px', accessor: (r) => r.lpo ? <Link href={`/erp/purchases/${r.lpo.id}`} className="font-mono text-xs text-brand-600">{r.lpo.number}</Link> : <span className="text-ink-400">—</span> },
    { header: 'Date', width: '120px', accessor: (r) => <span className="text-ink-700">{formatDate(r.date)}</span> },
    { header: '', align: 'right', width: '60px', accessor: (r) => <Link href={`/erp/grns/${r.id}`} aria-label="View" className="grid h-8 w-8 place-items-center rounded-sm text-ink-500 hover:bg-brand-500 hover:text-ink-950"><Eye className="h-3.5 w-3.5" /></Link> },
  ];

  return (
    <ErpPage
      kicker="Purchases"
      title="Goods Received Notes"
      description="Record stock received into a warehouse — posts stock-in automatically."
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search number, LPO…" className="w-64 rounded-sm border border-ink-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          {can('grn.write') && <Link href="/erp/grns/new" className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400"><Plus className="h-4 w-4" /> New GRN</Link>}
        </>
      }
    >
      <DataTable columns={cols} rows={data?.data} isLoading={isLoading || isFetching} pagination={data?.pagination} onPageChange={setPage} emptyTitle="No goods-received notes yet" emptyDesc="Receive goods against an LPO or directly." />
    </ErpPage>
  );
}
