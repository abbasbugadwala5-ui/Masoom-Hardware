'use client';

import { ReactNode } from 'react';

export function ErpPage({
  kicker, title, description, actions, children,
}: {
  kicker?: string; title: string; description?: ReactNode;
  actions?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {kicker && <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{kicker}</p>}
          <h1 className="mt-1 font-display text-3xl tracking-tight text-ink-900 md:text-4xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-sm border border-ink-100 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function EmptyState({
  title, description, action,
}: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-sm border border-dashed border-ink-200 bg-white p-12 text-center">
      <div className="font-display text-2xl tracking-tight text-ink-900">{title}</div>
      {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-4 w-4 border-2' : 'h-8 w-8 border-[3px]';
  return (
    <span
      className={`inline-block animate-spin rounded-full border-ink-200 border-t-brand-500 ${cls}`}
      aria-label="Loading"
    />
  );
}
