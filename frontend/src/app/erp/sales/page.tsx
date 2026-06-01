'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Plus, Search } from 'lucide-react';
import { ErpPage } from '@/components/erp/ErpPage';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { useList, type Invoice } from '@/lib/erp-api';
import { useAuth } from '@/lib/auth-store';
import { aed, formatDate } from '@/lib/format';

const STATUS_TONE: Record<Invoice['status'], string> = {
  DRAFT:      'bg-ink-100 text-ink-700 ring-ink-200',
  POSTED:     'bg-brand-500/15 text-brand-700 ring-brand-500/30',
  PAID:       'bg-green-50 text-green-700 ring-green-200',
  PART_PAID:  'bg-amber-50 text-amber-700 ring-amber-200',
  CANCELLED:  'bg-red-50 text-red-700 ring-red-200',
};

export default function InvoicesListPage() {
  const can = useAuth((s) => s.can);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, isFetching } = useList<Invoice>('invoices', { page, pageSize: 20, q, sort: 'date', order: 'desc' });

  const cols: Column<Invoice>[] = [
    { header: 'Invoice #', accessor: (r) => (
        <Link href={`/erp/sales/${r.id}`} className="font-mono text-xs font-bold text-ink-900 hover:text-brand-600">
          {r.number}
        </Link>
    ), width: '180px' },
    { header: 'Customer', accessor: (r) => <span className="text-ink-900">{r.customer?.name ?? '—'}</span> },
    { header: 'Date',     accessor: (r) => <span className="text-ink-700">{formatDate(r.date)}</span>, width: '120px' },
    { header: 'Due',      accessor: (r) => <span className="text-ink-500">{r.dueDate ? formatDate(r.dueDate) : '—'}</span>, width: '120px' },
    { header: 'Total',    accessor: (r) => <span className="font-mono font-bold">{aed.format(Number(r.total))}</span>, align: 'right', width: '160px' },
    { header: 'Status',   accessor: (r) => <span className={`chip ring-1 ${STATUS_TONE[r.status]}`}>{r.status}</span>, align: 'center', width: '120px' },
    { header: '', align: 'right', width: '60px', accessor: (r) => (
        <Link href={`/erp/sales/${r.id}`} aria-label="View" className="grid h-8 w-8 place-items-center rounded-sm text-ink-500 hover:bg-brand-500 hover:text-ink-950">
          <Eye className="h-3.5 w-3.5" />
        </Link>
    )},
  ];

  return (
    <ErpPage
      kicker="Sales"
      title="Tax Invoices"
      description="FTA-compliant tax invoices with auto-numbered series and printable PDFs."
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search number, customer…"
              className="w-72 rounded-sm border border-ink-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          {can('invoice.create') && (
            <Link href="/erp/sales/new" className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400">
              <Plus className="h-4 w-4" /> Create invoice
            </Link>
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
        emptyTitle="No invoices yet"
        emptyDesc="Create your first tax invoice."
        emptyAction={can('invoice.create') ? (
          <Link href="/erp/sales/new" className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950">
            <Plus className="h-4 w-4" /> Create invoice
          </Link>
        ) : undefined}
      />
    </ErpPage>
  );
}
