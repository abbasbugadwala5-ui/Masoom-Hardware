'use client';

import { ReactNode } from 'react';
import { Spinner, EmptyState, Card } from './ErpPage';

export interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

interface Pagination { page: number; pageSize: number; total: number; totalPages: number }

export function DataTable<T extends { id: string }>({
  columns, rows, isLoading, pagination, onPageChange, emptyTitle = 'Nothing here yet', emptyDesc, emptyAction,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  isLoading: boolean;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyAction?: ReactNode;
}) {
  if (isLoading && !rows) {
    return (
      <Card className="grid place-items-center py-16">
        <Spinner size="md" />
      </Card>
    );
  }
  if (!rows || rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDesc} action={emptyAction} />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
              {columns.map((c) => (
                <th
                  key={c.header}
                  style={c.width ? { width: c.width } : undefined}
                  className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink-100 last:border-b-0 hover:bg-brand-500/5">
                {columns.map((c, i) => (
                  <td key={i} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                    {c.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-xs text-ink-500">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange?.(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="rounded-sm border border-ink-200 px-3 py-1 font-bold disabled:opacity-40 hover:border-brand-500"
            >Prev</button>
            <button
              onClick={() => onPageChange?.(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-sm border border-ink-200 px-3 py-1 font-bold disabled:opacity-40 hover:border-brand-500"
            >Next</button>
          </div>
        </div>
      )}
    </Card>
  );
}
