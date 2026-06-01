'use client';

import type { ReactNode } from 'react';

export const inputCls =
  'w-full rounded-sm border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-ink-50';

export function Field({
  label, hint, required, children, className = '',
}: { label: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-700">
        {label} {required && <span className="text-brand-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-500">{hint}</span>}
    </label>
  );
}
