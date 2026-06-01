'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, HandCoins } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { useCustomers, apiErrorMessage } from '@/lib/lookups';
import { n2, formatDate } from '@/lib/format';
import type { Invoice, Payment } from '@/lib/erp-api';

const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

function NewReceiptInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const invoiceId = sp.get('invoiceId');
  const today = new Date().toISOString().slice(0, 10);

  const [customerId, setCustomerId] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [date, setDate] = useState(today);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [alloc, setAlloc] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: customers } = useCustomers();

  // If launched from an invoice, resolve its customer first.
  const { data: srcInvoice } = useQuery({
    queryKey: ['invoice-src', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => (await api.get<{ data: Invoice }>(`/invoices/${invoiceId}`)).data.data,
  });
  useEffect(() => { if (srcInvoice) setCustomerId(srcInvoice.customerId); }, [srcInvoice]);

  // Open invoices for the chosen customer.
  const { data: openInvoices } = useQuery({
    queryKey: ['open-invoices', customerId],
    enabled: !!customerId,
    queryFn: async () => (await api.get<{ data: Invoice[] }>(`/invoices?customerId=${customerId}&status=open&pageSize=200`)).data.data,
  });

  const balanceOf = (inv: Invoice) => round2(Number(inv.total) - Number(inv.amountPaid ?? 0));

  // Preselect the source invoice's balance.
  useEffect(() => {
    if (invoiceId && openInvoices) {
      const inv = openInvoices.find((i) => i.id === invoiceId);
      if (inv) setAlloc((a) => (a[invoiceId] ? a : { ...a, [invoiceId]: balanceOf(inv) }));
    }
  }, [invoiceId, openInvoices]);

  const allocTotal = useMemo(() => round2(Object.values(alloc).reduce((s, v) => s + (v || 0), 0)), [alloc]);

  const create = useMutation({
    mutationFn: async (body: object) => (await api.post<{ data: Payment }>('/payments', body)).data.data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payments'] });
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) { setError('Pick a customer'); return; }
    const allocations = Object.entries(alloc).filter(([, v]) => v > 0).map(([invId, amount]) => ({ invoiceId: invId, amount: round2(amount) }));
    if (allocations.length === 0) { setError('Allocate the receipt to at least one invoice'); return; }
    try {
      const p = await create.mutateAsync({ direction: 'RECEIVED', method, date, amount: allocTotal, reference: reference || null, notes: notes || null, customerId, allocations });
      router.push(`/erp/receipts/${p.id}`);
    } catch (err) { setError(apiErrorMessage(err, 'Create failed')); }
  }

  return (
    <ErpPage
      kicker="Finance"
      title="New Receipt"
      description="Record a customer payment and settle their open invoices."
      actions={<Link href="/erp/receipts" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Customer" required className="lg:col-span-2">
              <select required value={customerId} onChange={(e) => { setCustomerId(e.target.value); setAlloc({}); }} disabled={!!invoiceId} className={inputCls}>
                <option value="">— Pick a customer —</option>
                {customers?.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </select>
            </Field>
            <Field label="Method" required>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                {['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE', 'OTHER'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Date" required><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Reference" className="lg:col-span-2"><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque / TT reference" className={inputCls} /></Field>
            <Field label="Notes" className="lg:col-span-2"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></Field>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">OPEN INVOICES</h2>
          {!customerId ? (
            <p className="text-sm text-ink-500">Pick a customer to see their unpaid invoices.</p>
          ) : !openInvoices?.length ? (
            <p className="text-sm text-ink-500">No open invoices for this customer.</p>
          ) : (
            <div className="overflow-hidden rounded-sm border border-ink-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
                    <th className="px-3 py-2.5">Invoice</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                    <th className="px-3 py-2.5 text-right">Paid</th>
                    <th className="px-3 py-2.5 text-right">Balance</th>
                    <th className="px-3 py-2.5 text-right" style={{ width: '160px' }}>Allocate</th>
                  </tr>
                </thead>
                <tbody>
                  {openInvoices.map((inv) => {
                    const bal = balanceOf(inv);
                    return (
                      <tr key={inv.id} className="border-b border-ink-100 last:border-b-0">
                        <td className="px-3 py-2.5">
                          <div className="font-mono text-xs font-bold text-ink-900">{inv.number}</div>
                          <div className="text-xs text-ink-400">{formatDate(inv.date)}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">{n2(inv.total)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-ink-500">{n2(inv.amountPaid ?? 0)}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold">{n2(bal)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <input type="number" step="0.01" min="0" max={bal} value={alloc[inv.id] ?? ''} placeholder="0.00"
                              onChange={(e) => { const v = Math.min(Number(e.target.value) || 0, bal); setAlloc((a) => ({ ...a, [inv.id]: v })); }}
                              className={`${inputCls} w-28 text-right font-mono`} />
                            <button type="button" onClick={() => setAlloc((a) => ({ ...a, [inv.id]: bal }))} className="rounded-sm border border-ink-200 px-2 py-1.5 text-[10px] font-bold uppercase text-ink-600 hover:border-brand-500">Full</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-500/10">
                    <td colSpan={4} className="px-3 py-3 text-right font-display text-base tracking-wide text-ink-900">RECEIPT TOTAL</td>
                    <td className="px-3 py-3 text-right font-mono text-base font-bold text-ink-900">AED {n2(allocTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/erp/receipts" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">Cancel</Link>
          <button type="submit" disabled={create.isPending || allocTotal <= 0} className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60">
            <HandCoins className="h-4 w-4" /> Record receipt · AED {n2(allocTotal)}
          </button>
        </div>
      </form>
    </ErpPage>
  );
}

export default function NewReceiptPage() {
  return <Suspense fallback={null}><NewReceiptInner /></Suspense>;
}
