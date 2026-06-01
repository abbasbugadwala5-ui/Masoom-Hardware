'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { ErpPage } from '@/components/erp/ErpPage';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { useList, useDelete, type Product } from '@/lib/erp-api';
import { useAuth } from '@/lib/auth-store';

export default function ProductsListPage() {
  const can = useAuth((s) => s.can);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, isFetching } = useList<Product>('products', { page, pageSize: 20, q, sort: 'createdAt', order: 'desc' });
  const del = useDelete('products');

  const cols: Column<Product>[] = [
    { header: 'SKU',  accessor: (r) => <span className="font-mono text-xs">{r.sku}</span>, width: '120px' },
    { header: 'Name', accessor: (r) => (
        <Link href={`/erp/products/${r.id}`} className="font-semibold text-ink-900 hover:text-brand-600">
          {r.name}
        </Link>
    )},
    { header: 'Brand',    accessor: (r) => <span className="text-ink-600">{r.brand?.name ?? '—'}</span> },
    { header: 'Category', accessor: (r) => <span className="text-ink-600">{r.category?.name ?? '—'}</span> },
    { header: 'Cost',  accessor: (r) => <span className="font-mono">AED {Number(r.costPrice).toFixed(2)}</span>, align: 'right' },
    { header: 'Price', accessor: (r) => <span className="font-mono text-ink-900">AED {Number(r.sellingPrice).toFixed(2)}</span>, align: 'right' },
    { header: 'VAT %', accessor: (r) => <span className="font-mono text-ink-500">{Number(r.vatRate).toFixed(0)}%</span>, align: 'right', width: '70px' },
    { header: 'Active', accessor: (r) => r.isActive ? <span className="chip bg-green-50 text-green-700 ring-green-200">Active</span> : <span className="chip">Inactive</span>, align: 'center', width: '90px' },
    { header: '', align: 'right', width: '110px', accessor: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/erp/products/${r.id}`} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-sm text-ink-500 hover:bg-brand-500 hover:text-ink-950">
            <Edit className="h-3.5 w-3.5" />
          </Link>
          {can('product.delete') && (
            <button
              aria-label="Delete"
              onClick={() => {
                if (confirm(`Delete "${r.name}"? This soft-deletes — historical documents keep the record.`)) {
                  del.mutate(r.id);
                }
              }}
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
      kicker="Catalog"
      title="Products"
      description="Master product list across all warehouses."
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search SKU or name…"
              className="w-64 rounded-sm border border-ink-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          {can('product.write') && (
            <Link
              href="/erp/products/new"
              className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400"
            >
              <Plus className="h-4 w-4" /> New product
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
        emptyTitle="No products yet"
        emptyDesc="Add your first product to get started."
        emptyAction={
          can('product.write') ? (
            <Link href="/erp/products/new" className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950">
              <Plus className="h-4 w-4" /> Add product
            </Link>
          ) : undefined
        }
      />
    </ErpPage>
  );
}
