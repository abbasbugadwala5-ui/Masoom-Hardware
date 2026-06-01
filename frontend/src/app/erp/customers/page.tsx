'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { ErpPage } from '@/components/erp/ErpPage';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { useList, useDelete, type Customer } from '@/lib/erp-api';
import { useAuth } from '@/lib/auth-store';

export default function CustomersListPage() {
  const can = useAuth((s) => s.can);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, isFetching } = useList<Customer>('customers', { page, pageSize: 20, q, sort: 'createdAt', order: 'desc' });
  const del = useDelete('customers');

  const aedFmt = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 });

  const cols: Column<Customer>[] = [
    { header: 'Code', accessor: (r) => <span className="font-mono text-xs">{r.code}</span>, width: '110px' },
    { header: 'Name', accessor: (r) => (
        <Link href={`/erp/customers/${r.id}`} className="font-semibold text-ink-900 hover:text-brand-600">
          {r.name}
        </Link>
    )},
    { header: 'TRN',     accessor: (r) => r.trn ? <span className="font-mono text-xs text-ink-700">{r.trn}</span> : <span className="text-ink-400">—</span>, width: '160px' },
    { header: 'Phone',   accessor: (r) => <span className="text-ink-700">{r.phone ?? '—'}</span> },
    { header: 'City',    accessor: (r) => <span className="text-ink-600">{r.city ?? '—'}</span> },
    { header: 'Credit',  accessor: (r) => <span className="font-mono">{aedFmt.format(Number(r.creditLimit))}</span>, align: 'right' },
    { header: 'Active',  accessor: (r) => r.isActive ? <span className="chip bg-green-50 text-green-700 ring-green-200">Active</span> : <span className="chip">Inactive</span>, align: 'center', width: '90px' },
    { header: '', align: 'right', width: '110px', accessor: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/erp/customers/${r.id}`} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-sm text-ink-500 hover:bg-brand-500 hover:text-ink-950">
            <Edit className="h-3.5 w-3.5" />
          </Link>
          {can('customer.write') && (
            <button
              aria-label="Delete"
              onClick={() => confirm(`Delete "${r.name}"?`) && del.mutate(r.id)}
              className="grid h-8 w-8 place-items-center rounded-sm text-ink-500 hover:bg-red-500 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
    )},
  ];

  return (
    <ErpPage
      kicker="CRM"
      title="Customers"
      description="Trade and retail customers, with TRN, credit limits and contact details."
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, code, phone, TRN…"
              className="w-72 rounded-sm border border-ink-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          {can('customer.write') && (
            <Link href="/erp/customers/new" className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400">
              <Plus className="h-4 w-4" /> New customer
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
        emptyTitle="No customers yet"
        emptyDesc="Add your first customer."
        emptyAction={
          can('customer.write') ? (
            <Link href="/erp/customers/new" className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950">
              <Plus className="h-4 w-4" /> Add customer
            </Link>
          ) : undefined
        }
      />
    </ErpPage>
  );
}
