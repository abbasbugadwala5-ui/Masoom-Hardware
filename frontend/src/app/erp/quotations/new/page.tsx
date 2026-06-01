'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileSignature, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { LineItemsEditor, blankLine, type LineDraft } from '@/components/erp/LineItemsEditor';
import { useCustomers, apiErrorMessage } from '@/lib/lookups';
import type { Quotation } from '@/lib/erp-api';

export default function NewQuotationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const plus14 = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(today);
  const [validUntil, setValidUntil] = useState(plus14);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Prices valid for 14 days. Subject to stock availability.');
  const [send, setSend] = useState(true);
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [error, setError] = useState<string | null>(null);

  const { data: customers } = useCustomers();

  const create = useMutation({
    mutationFn: async (body: object) => (await api.post<{ data: Quotation }>('/quotations', body)).data.data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['quotations'] }); },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) { setError('Please select a customer'); return; }
    const cleanLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (cleanLines.length === 0) { setError('Add at least one line with a product and quantity'); return; }
    try {
      const qt = await create.mutateAsync({ customerId, date, validUntil: validUntil || null, notes: notes || null, terms: terms || null, items: cleanLines, send });
      router.push(`/erp/quotations/${qt.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Create failed'));
    }
  }

  return (
    <ErpPage
      kicker="Sales"
      title="New Quotation"
      description="Auto-numbers on save · VAT per line · convert to a sales order later."
      actions={
        <Link href="/erp/quotations" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500 hover:text-brand-600">
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
                    <option key={c.id} value={c.id}>{c.code} · {c.name}{c.trn ? ` · TRN ${c.trn}` : ''}</option>
                  ))}
                </select>
              </Field>
              <Field label="Quotation date" required>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Valid until">
                <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">OPTIONS</h2>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
              <span>
                <span className="font-semibold text-ink-900">Mark as sent</span>
                <span className="block text-xs text-ink-500">Otherwise it stays a draft you can edit.</span>
              </span>
            </label>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">LINE ITEMS</h2>
          <LineItemsEditor lines={lines} onChange={setLines} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">NOTES &amp; TERMS</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Notes (private)"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></Field>
            <Field label="Terms (printed on PDF)"><textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} className={inputCls} /></Field>
          </div>
        </Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/erp/quotations" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">Cancel</Link>
          <button type="submit" disabled={create.isPending} className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60">
            {send ? <FileSignature className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {send ? 'Create & send' : 'Save as draft'}
          </button>
        </div>
      </form>
    </ErpPage>
  );
}
