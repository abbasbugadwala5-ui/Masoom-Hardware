'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Undo2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { useWarehouses, apiErrorMessage } from '@/lib/lookups';
import { n2 } from '@/lib/format';
import type { CreditNote, Invoice, Product } from '@/lib/erp-api';

interface CNLine { productId: string; description: string; quantity: number; unitPrice: number; vatRate: number; restoreStock: boolean }
const blank = (): CNLine => ({ productId: '', description: '', quantity: 1, unitPrice: 0, vatRate: 5, restoreStock: false });
const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

function NewCreditNoteInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const invoiceId = sp.get('invoiceId') ?? '';
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<CNLine[]>([blank()]);
  const [error, setError] = useState<string | null>(null);

  const { data: warehouses } = useWarehouses();
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => (await api.get<{ data: Product[] }>('/products?pageSize=200')).data.data,
  });
  const { data: invoice } = useQuery({
    queryKey: ['invoice-src', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => (await api.get<{ data: Invoice }>(`/invoices/${invoiceId}`)).data.data,
  });

  useEffect(() => {
    if (invoice?.items?.length) {
      setLines(invoice.items.map((it) => ({
        productId: it.productId, description: it.description ?? '',
        quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), vatRate: Number(it.vatRate), restoreStock: false,
      })));
    }
  }, [invoice]);

  const create = useMutation({
    mutationFn: async (body: object) => (await api.post<{ data: CreditNote }>('/credit-notes', body)).data.data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['credit-notes'] }); },
  });

  function patch(i: number, ch: Partial<CNLine>) { const n = [...lines]; n[i] = { ...n[i]!, ...ch }; setLines(n); }
  function pick(i: number, productId: string) {
    const p = products?.find((x) => x.id === productId);
    patch(i, { productId, description: p?.name ?? '', unitPrice: Number(p?.sellingPrice) || 0, vatRate: Number(p?.vatRate) || 5 });
  }
  const lineTotal = (l: CNLine) => round2(l.quantity * l.unitPrice * (1 + l.vatRate / 100));
  const grand = round2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const needsWarehouse = lines.some((l) => l.restoreStock);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!invoiceId) { setError('A source invoice is required. Open an invoice and click “Credit Note”.'); return; }
    if (needsWarehouse && !warehouseId) { setError('Pick a warehouse to restore stock'); return; }
    const clean = lines.filter((l) => l.productId && l.quantity > 0);
    if (!clean.length) { setError('Add at least one line'); return; }
    try {
      const cn = await create.mutateAsync({ invoiceId, date, reason: reason || null, notes: notes || null, warehouseId: warehouseId || null, items: clean });
      router.push(`/erp/credit-notes/${cn.id}`);
    } catch (err) { setError(apiErrorMessage(err, 'Create failed')); }
  }

  return (
    <ErpPage
      kicker="Sales"
      title="New Credit Note"
      description={invoice ? `Against invoice ${invoice.number} · ${invoice.customer?.name ?? ''}` : 'Credit a customer against a tax invoice.'}
      actions={<Link href="/erp/credit-notes" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" required><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Damaged goods" className={inputCls} /></Field>
            <Field label="Restock warehouse" hint={needsWarehouse ? 'Required — some lines restore stock' : 'Only used if a line restores stock'}>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">CREDIT LINES</h2>
          <div className="overflow-x-auto rounded-sm border border-ink-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
                  <th className="px-3 py-2.5" style={{ width: '32%' }}>Product</th>
                  <th className="px-2 py-2.5 text-right" style={{ width: '90px' }}>Qty</th>
                  <th className="px-2 py-2.5 text-right" style={{ width: '110px' }}>Rate</th>
                  <th className="px-2 py-2.5 text-right" style={{ width: '70px' }}>VAT%</th>
                  <th className="px-2 py-2.5 text-center" style={{ width: '80px' }}>Restock</th>
                  <th className="px-2 py-2.5 text-right" style={{ width: '120px' }}>Total</th>
                  <th className="px-2 py-2.5" style={{ width: '44px' }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-ink-100 last:border-b-0 align-top">
                    <td className="px-3 py-2">
                      <select value={l.productId} onChange={(e) => pick(i, e.target.value)} className={`${inputCls} mb-1.5`}>
                        <option value="">— Pick a product —</option>
                        {products?.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
                      </select>
                      <input value={l.description} onChange={(e) => patch(i, { description: e.target.value })} placeholder="Description" className={`${inputCls} text-xs`} />
                    </td>
                    <td className="px-2 py-2 text-right"><input type="number" step="0.001" min="0" value={l.quantity} onChange={(e) => patch(i, { quantity: Number(e.target.value) })} className={`${inputCls} text-right font-mono`} /></td>
                    <td className="px-2 py-2 text-right"><input type="number" step="0.01" min="0" value={l.unitPrice} onChange={(e) => patch(i, { unitPrice: Number(e.target.value) })} className={`${inputCls} text-right font-mono`} /></td>
                    <td className="px-2 py-2 text-right"><input type="number" step="0.01" min="0" max="100" value={l.vatRate} onChange={(e) => patch(i, { vatRate: Number(e.target.value) })} className={`${inputCls} text-right font-mono`} /></td>
                    <td className="px-2 py-3 text-center"><input type="checkbox" checked={l.restoreStock} onChange={(e) => patch(i, { restoreStock: e.target.checked })} className="h-4 w-4 accent-brand-500" /></td>
                    <td className="px-2 py-3 text-right font-mono font-bold">{n2(lineTotal(l))}</td>
                    <td className="px-2 py-3 text-center"><button type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-sm text-ink-400 hover:bg-red-500 hover:text-white disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-brand-500/10">
                  <td colSpan={5} className="px-3 py-3 text-right font-display text-base tracking-wide text-ink-900">TOTAL CREDIT</td>
                  <td className="px-2 py-3 text-right font-mono text-base font-bold text-ink-900">AED {n2(grand)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            <div className="border-t border-ink-100 p-3">
              <button type="button" onClick={() => setLines([...lines, blank()])} className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-ink-300 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink-600 hover:border-brand-500 hover:text-brand-600"><Plus className="h-3.5 w-3.5" /> Add line</button>
            </div>
          </div>
        </Card>

        <Card className="p-6"><Field label="Notes"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></Field></Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/erp/credit-notes" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">Cancel</Link>
          <button type="submit" disabled={create.isPending} className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60"><Undo2 className="h-4 w-4" /> Issue credit note</button>
        </div>
      </form>
    </ErpPage>
  );
}

export default function NewCreditNotePage() {
  return <Suspense fallback={null}><NewCreditNoteInner /></Suspense>;
}
