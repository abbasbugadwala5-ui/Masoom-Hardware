'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Plus, Search } from 'lucide-react';
import { ErpPage } from '@/components/erp/ErpPage';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { useList, type Payment } from '@/lib/erp-api';
import { useAuth } from '@/lib/auth-store';
import { aed, formatDate } from '@/lib/format';

export default function ReceiptsListPage() {
  const can = useAuth((s) => s.can);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, isFetching } = useList<Payment>('payments', { page, pageSize: 20, q, direction: 'RECEIVED', sort: 'date', order: 'desc' });

  const cols: Column<Payment>[] = [
    { header: 'Receipt #', width: '170px', accessor: (r) => (
        <Link href={`/erp/receipts/${r.id}`} className="font-mono text-xs font-bold text-ink-900 hover:text-brand-600">{r.number}</Link>
    )},
    { header: 'Customer', accessor: (r) => <span className="text-ink-900">{r.customer?.name ?? '—'}</span> },
    { header: 'Method', width: '140px', accessor: (r) => <span className="text-ink-600">{r.method.replace('_', ' ')}</span> },
    { header: 'Date', width: '120px', accessor: (r) => <span className="text-ink-700">{formatDate(r.date)}</span> },
    { header: 'Amount', align: 'right', width: '150px', accessor: (r) => <span className="font-mono font-bold text-green-700">{aed.format(Number(r.amount))}</span> },
    { header: '', align: 'right', width: '60px', accessor: (r) => (
        <Link href={`/erp/receipts/${r.id}`} aria-label="View" className="grid h-8 w-8 place-items-center rounded-sm text-ink-500 hover:bg-brand-500 hover:text-ink-950"><Eye className="h-3.5 w-3.5" /></Link>
    )},
  ];

  return (
    <ErpPage
      kicker="Finance"
      title="Receipts"
      description="Customer payments received and allocated to invoices."
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search number, customer…"
              className="w-72 rounded-sm border border-ink-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          {can('payment.receive') && (
            <Link href="/erp/receipts/new" className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400"><Plus className="h-4 w-4" /> New receipt</Link>
          )}
        </>
      }
    >
      <DataTable
        columns={cols}
        rows={data?.data}
        isLoading={isLoading || isFetching}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyTitle="No receipts yet"
        emptyDesc="Record a customer payment to get started."
        emptyAction={can('payment.receive') ? (
          <Link href="/erp/receipts/new" className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950"><Plus className="h-4 w-4" /> New receipt</Link>
        ) : undefined}
      />
    </ErpPage>
  );
}
