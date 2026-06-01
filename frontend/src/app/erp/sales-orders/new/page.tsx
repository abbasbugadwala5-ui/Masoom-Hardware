'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardCheck, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { LineItemsEditor, blankLine, type LineDraft } from '@/components/erp/LineItemsEditor';
import { useCustomers, apiErrorMessage } from '@/lib/lookups';
import type { SalesOrder } from '@/lib/erp-api';

export default function NewSalesOrderPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState(true);
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [error, setError] = useState<string | null>(null);

  const { data: customers } = useCustomers();
  const create = useMutation({
    mutationFn: async (body: object) => (await api.post<{ data: SalesOrder }>('/sales-orders', body)).data.data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['sales-orders'] }); },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) { setError('Please select a customer'); return; }
    const cleanLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (cleanLines.length === 0) { setError('Add at least one line'); return; }
    try {
      const so = await create.mutateAsync({ customerId, date, notes: notes || null, items: cleanLines, confirm });
      router.push(`/erp/sales-orders/${so.id}`);
    } catch (err) { setError(apiErrorMessage(err, 'Create failed')); }
  }

  return (
    <ErpPage
      kicker="Sales"
      title="New Sales Order"
      actions={<Link href="/erp/sales-orders" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">CUSTOMER &amp; DATE</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer" required className="sm:col-span-2">
                <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
                  <option value="">— Pick a customer —</option>
                  {customers?.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                </select>
              </Field>
              <Field label="Order date" required>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">OPTIONS</h2>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
              <span><span className="font-semibold text-ink-900">Confirm now</span><span className="block text-xs text-ink-500">Ready to invoice. Otherwise saved as draft.</span></span>
            </label>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">LINE ITEMS</h2>
          <LineItemsEditor lines={lines} onChange={setLines} />
        </Card>

        <Card className="p-6">
          <Field label="Notes"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></Field>
        </Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/erp/sales-orders" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">Cancel</Link>
          <button type="submit" disabled={create.isPending} className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60">
            {confirm ? <ClipboardCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {confirm ? 'Create & confirm' : 'Save as draft'}
          </button>
        </div>
      </form>
    </ErpPage>
  );
}
