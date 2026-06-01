'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { LineItemsEditor, blankLine, type LineDraft } from '@/components/erp/LineItemsEditor';
import type { Supplier, Lpo } from '@/lib/erp-api';

export default function NewLpoPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);

  const [supplierId, setSupplierId] = useState('');
  const [date,       setDate]       = useState(today);
  const [notes,      setNotes]      = useState('');
  const [sendNow,    setSendNow]    = useState(true);
  const [lines,      setLines]      = useState<LineDraft[]>([blankLine()]);
  const [error,      setError]      = useState<string | null>(null);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: async () => (await api.get<{ data: Supplier[] }>('/suppliers?pageSize=200')).data.data,
  });

  const create = useMutation({
    mutationFn: async (body: object) => (await api.post<{ data: Lpo }>('/lpos', body)).data.data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lpos'] });
      void qc.invalidateQueries({ queryKey: ['kpis'] });
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supplierId) { setError('Please select a supplier'); return; }
    const cleanLines = lines.filter((l) => l.productId && l.quantity > 0).map(({ discount: _d, ...rest }) => rest);
    if (cleanLines.length === 0) { setError('Add at least one line with a product and quantity'); return; }
    try {
      const lpo = await create.mutateAsync({
        supplierId,
        date,
        notes: notes || null,
        items: cleanLines,
        sendNow,
      });
      router.push(`/erp/purchases/${lpo.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Create failed';
      setError(msg);
    }
  }

  return (
    <ErpPage
      kicker="Purchases"
      title="New Purchase Order"
      description="Auto-numbers on save · sent or kept as draft."
      actions={
        <Link href="/erp/purchases" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">SUPPLIER &amp; DATE</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Supplier" required className="sm:col-span-2">
                <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
                  <option value="">— Pick a supplier —</option>
                  {suppliers?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}{s.trn ? ` · TRN ${s.trn}` : ''}
                    </option>
                  ))}
                </select>
                {supplierId && suppliers && (() => {
                  const s = suppliers.find((x) => x.id === supplierId);
                  return s ? (
                    <div className="mt-2 rounded-sm bg-ink-50 p-3 text-xs text-ink-700">
                      <div className="font-bold text-ink-900">{s.legalName ?? s.name}</div>
                      {s.addressLine1 && <div>{s.addressLine1}{s.city ? `, ${s.city}` : ''}</div>}
                      {s.trn && <div>TRN: <span className="font-mono">{s.trn}</span></div>}
                    </div>
                  ) : null;
                })()}
              </Field>
              <Field label="Order date" required>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">OPTIONS</h2>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
              <span>
                <span className="font-semibold text-ink-900">Mark as sent</span>
                <span className="block text-xs text-ink-500">Otherwise the LPO stays in DRAFT.</span>
              </span>
            </label>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">LINE ITEMS</h2>
          <LineItemsEditor lines={lines} onChange={setLines} showDiscount={false} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">NOTES</h2>
          <Field label="Notes (printed on LPO)">
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </Field>
        </Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/erp/purchases" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={create.isPending}
            className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60"
          >
            {sendNow ? <FilePlus2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {sendNow ? 'Create & send' : 'Save as draft'}
          </button>
        </div>
      </form>
    </ErpPage>
  );
}
