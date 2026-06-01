'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Search } from 'lucide-react';
import { ErpPage } from '@/components/erp/ErpPage';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { useList, type DebitNote } from '@/lib/erp-api';
import { aed, formatDate } from '@/lib/format';

export default function DebitNotesListPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, isFetching } = useList<DebitNote>('debit-notes', { page, pageSize: 20, q, sort: 'date', order: 'desc' });

  const cols: Column<DebitNote>[] = [
    { header: 'DN #', width: '170px', accessor: (r) => <Link href={`/erp/debit-notes/${r.id}`} className="font-mono text-xs font-bold text-ink-900 hover:text-brand-600">{r.number}</Link> },
    { header: 'Supplier', accessor: (r) => <span className="text-ink-900">{r.supplier?.name ?? '—'}</span> },
    { header: 'Against PI', width: '160px', accessor: (r) => r.purchaseInvoice ? <Link href={`/erp/purchase-invoices/${r.purchaseInvoice.id}`} className="font-mono text-xs text-brand-600">{r.purchaseInvoice.number}</Link> : '—' },
    { header: 'Date', width: '120px', accessor: (r) => <span className="text-ink-700">{formatDate(r.date)}</span> },
    { header: 'Total', align: 'right', width: '150px', accessor: (r) => <span className="font-mono font-bold text-red-700">{aed.format(Number(r.total))}</span> },
    { header: '', align: 'right', width: '60px', accessor: (r) => <Link href={`/erp/debit-notes/${r.id}`} aria-label="View" className="grid h-8 w-8 place-items-center rounded-sm text-ink-500 hover:bg-brand-500 hover:text-ink-950"><Eye className="h-3.5 w-3.5" /></Link> },
  ];

  return (
    <ErpPage
      kicker="Purchases"
      title="Debit Notes"
      description="Returns and claims raised against supplier purchase invoices."
      actions={
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search number, supplier…" className="w-72 rounded-sm border border-ink-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        </div>
      }
    >
      <DataTable columns={cols} rows={data?.data} isLoading={isLoading || isFetching} pagination={data?.pagination} onPageChange={setPage} emptyTitle="No debit notes yet" emptyDesc="Raise one from a purchase invoice." />
    </ErpPage>
  );
}
