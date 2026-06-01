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
import type { Customer, Invoice } from '@/lib/erp-api';

export default function NewInvoicePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const due30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const [customerId, setCustomerId] = useState('');
  const [date,       setDate]       = useState(today);
  const [dueDate,    setDueDate]    = useState(due30);
  const [notes,      setNotes]      = useState('');
  const [terms,      setTerms]      = useState('Payment within 30 days of invoice date.');
  const [postNow,    setPostNow]    = useState(true);
  const [lines,      setLines]      = useState<LineDraft[]>([blankLine()]);
  const [error,      setError]      = useState<string | null>(null);

  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: async () => (await api.get<{ data: Customer[] }>('/customers?pageSize=200')).data.data,
  });

  const create = useMutation({
    mutationFn: async (body: object) => (await api.post<{ data: Invoice }>('/invoices', body)).data.data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['kpis'] });
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) { setError('Please select a customer'); return; }
    const cleanLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (cleanLines.length === 0) { setError('Add at least one line with a product and quantity'); return; }
    try {
      const inv = await create.mutateAsync({
        customerId,
        date,
        dueDate: dueDate || null,
        notes: notes || null,
        terms: terms || null,
        items: cleanLines,
        postNow,
      });
      router.push(`/erp/sales/${inv.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Create failed';
      setError(msg);
    }
  }

  return (
    <ErpPage
      kicker="Sales"
      title="New Tax Invoice"
      description="Auto-numbers on save · VAT calculated per line."
      actions={
        <Link href="/erp/sales" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">CUSTOMER &amp; DATES</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer" required className="sm:col-span-2">
                <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
                  <option value="">— Pick a customer —</option>
                  {customers?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name}{c.trn ? ` · TRN ${c.trn}` : ''}
                    </option>
                  ))}
                </select>
                {customerId && customers && (() => {
                  const c = customers.find((x) => x.id === customerId);
                  return c ? (
                    <div className="mt-2 rounded-sm bg-ink-50 p-3 text-xs text-ink-700">
                      <div className="font-bold text-ink-900">{c.legalName ?? c.name}</div>
                      {c.addressLine1 && <div>{c.addressLine1}{c.city ? `, ${c.city}` : ''}</div>}
                      {c.trn && <div>TRN: <span className="font-mono">{c.trn}</span></div>}
                    </div>
                  ) : null;
                })()}
              </Field>
              <Field label="Invoice date" required>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Due date">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">OPTIONS</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={postNow} onChange={(e) => setPostNow(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
                <span>
                  <span className="font-semibold text-ink-900">Post immediately</span>
                  <span className="block text-xs text-ink-500">Locks the invoice. Corrections then require a credit note.</span>
                </span>
              </label>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">LINE ITEMS</h2>
          <LineItemsEditor lines={lines} onChange={setLines} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">NOTES &amp; TERMS</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Notes (private)">
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Terms (printed on PDF)">
              <textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/erp/sales" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={create.isPending}
            className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60"
          >
            {postNow ? <FilePlus2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {postNow ? 'Create & post' : 'Save as draft'}
          </button>
        </div>
      </form>
    </ErpPage>
  );
}
