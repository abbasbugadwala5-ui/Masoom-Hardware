'use client';

import Link from 'next/link';
import { ArrowRight, Construction } from 'lucide-react';
import { ErpPage, Card } from './ErpPage';

export function ComingSoon({
  module, phase, kicker, points,
}: {
  module: string;
  phase: 'Phase 2' | 'Phase 3' | 'Phase 4' | 'Phase 5';
  kicker?: string;
  points: string[];
}) {
  return (
    <ErpPage kicker={kicker ?? phase} title={module} description={`${module} module — landing in ${phase}.`}>
      <Card className="overflow-hidden">
        <div className="caution-stripe" />
        <div className="grid gap-8 p-8 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-sm bg-brand-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-600">
              <Construction className="h-3.5 w-3.5" /> Under construction
            </div>
            <h2 className="mt-4 font-display text-4xl tracking-tight text-ink-900">
              {module.toUpperCase()} ARRIVES IN <span className="text-brand-600">{phase.toUpperCase()}</span>.
            </h2>
            <p className="mt-3 text-sm text-ink-600">
              The data model is already in the Prisma schema and the navigation slot is reserved.
              This page activates when the backend module ships.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/erp" className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400">
                Back to dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/erp/products" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500 hover:text-brand-600">
                Manage products
              </Link>
            </div>
          </div>

          <div className="rounded-sm bg-ink-50 p-6">
            <h3 className="font-display text-lg tracking-widest text-ink-900">WHAT&apos;S COMING</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-700">
              {points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </ErpPage>
  );
}
