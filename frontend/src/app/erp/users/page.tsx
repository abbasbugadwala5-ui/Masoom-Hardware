'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { ErpPage } from '@/components/erp/ErpPage';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { useList, type UserRow, type Role } from '@/lib/erp-api';

export default function UsersListPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, isFetching } = useList<UserRow>('users', { page, pageSize: 20, q });
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get<{ data: Role[] }>('/roles')).data.data,
  });

  const cols: Column<UserRow>[] = [
    { header: 'Name',   accessor: (r) => <span className="font-semibold text-ink-900">{r.fullName}</span> },
    { header: 'Email',  accessor: (r) => <span className="text-ink-700">{r.email}</span> },
    { header: 'Role',   accessor: (r) => <span className="chip">{r.role.name.replace('_', ' ')}</span> },
    { header: 'Phone',  accessor: (r) => <span className="text-ink-600">{r.phone ?? '—'}</span> },
    { header: 'Last login', accessor: (r) => <span className="text-ink-500">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : 'Never'}</span> },
    { header: 'Active', accessor: (r) => r.isActive ? <span className="chip bg-green-50 text-green-700 ring-green-200">Active</span> : <span className="chip">Disabled</span>, align: 'center', width: '100px' },
  ];

  return (
    <ErpPage
      kicker="Access control"
      title="Users & Roles"
      description="Internal accounts and their role assignments."
      actions={
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name or email…"
            className="w-72 rounded-sm border border-ink-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <DataTable
            columns={cols}
            rows={data?.data}
            isLoading={isLoading || isFetching}
            pagination={data?.pagination}
            onPageChange={setPage}
            emptyTitle="No users"
          />
          <p className="text-xs text-ink-500">
            Creating users requires the <span className="chip">user.create</span> permission. Use <code className="rounded-sm bg-ink-50 px-1 py-0.5 font-mono">POST /api/auth/register</code> for now —
            a UI form lands in Phase 2 polish.
          </p>
        </div>

        <aside>
          <div className="rounded-sm border border-ink-100 bg-white p-5 shadow-sm">
            <h3 className="font-display text-lg tracking-widest text-ink-900">ROLES</h3>
            <ul className="mt-3 divide-y divide-ink-100">
              {(roles ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{r.name.replace('_', ' ')}</div>
                    {r.description && <div className="text-xs text-ink-500">{r.description}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-ink-600">{r._count.users} users</div>
                    <div className="font-mono text-[10px] text-ink-400">{r._count.permissions} perms</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </ErpPage>
  );
}
