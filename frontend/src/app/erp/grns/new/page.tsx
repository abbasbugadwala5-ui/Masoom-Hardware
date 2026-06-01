'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { useWarehouses, apiErrorMessage } from '@/lib/lookups';
import type { Grn, Lpo, Product } from '@/lib/erp-api';

interface GLine { productId: string; quantity: number; unitCost: number }
const blank = (): GLine => ({ productId: '', quantity: 1, unitCost: 0 });

function NewGrnInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const lpoId = sp.get('lpoId');
  const today = new Date().toISOString().slice(0, 10);

  const [warehouseId, setWarehouseId] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<GLine[]>([blank()]);
  const [error, setError] = useState<string | null>(null);

  const { data: warehouses } = useWarehouses();
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: async () => (await api.get<{ data: Product[] }>('/products?pageSize=200')).data.data });
  const { data: lpo } = useQuery({ queryKey: ['lpo-src', lpoId], enabled: !!lpoId, queryFn: async () => (await api.get<{ data: Lpo }>(`/lpos/${lpoId}`)).data.data });

  useEffect(() => { if (lpo?.items?.length) setLines(lpo.items.map((it) => ({ productId: it.productId, quantity: Number(it.quantity), unitCost: Number(it.unitPrice) }))); }, [lpo]);
  useEffect(() => { if (warehouses?.length && !warehouseId) setWarehouseId(warehouses[0]!.id); }, [warehouses, warehouseId]);

  const create = useMutation({ mutationFn: async (b: object) => (await api.post<{ data: Grn }>('/grns', b)).data.data, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['grns'] }); void qc.invalidateQueries({ queryKey: ['inventory'] }); } });

  function patch(i: number, ch: Partial<GLine>) { const n = [...lines]; n[i] = { ...n[i]!, ...ch }; setLines(n); }
  function pick(i: number, productId: string) { const p = products?.find((x) => x.id === productId); patch(i, { productId, unitCost: Number(p?.costPrice) || 0 }); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!warehouseId) { setError('Pick a warehouse'); return; }
    const clean = lines.filter((l) => l.productId && l.quantity > 0);
    if (!clean.length) { setError('Add at least one line'); return; }
    try {
      const grn = await create.mutateAsync({ warehouseId, lpoId: lpoId || null, date, notes: notes || null, items: clean });
      router.push(`/erp/grns/${grn.id}`);
    } catch (err) { setError(apiErrorMessage(err, 'Create failed')); }
  }

  return (
    <ErpPage kicker="Purchases" title="New Goods Received Note" description={lpo ? `Against LPO ${lpo.number}` : 'Receiving goods adds them to warehouse stock.'} actions={<Link href="/erp/grns" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Warehouse" required><select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}><option value="">—</option>{warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
            <Field label="Date" required><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></Field>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">ITEMS RECEIVED</h2>
          <div className="overflow-hidden rounded-sm border border-ink-100">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500"><th className="px-3 py-2.5">Product</th><th className="px-2 py-2.5 text-right" style={{ width: '120px' }}>Qty</th><th className="px-2 py-2.5 text-right" style={{ width: '120px' }}>Unit cost</th><th style={{ width: '44px' }} /></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-ink-100 last:border-0">
                    <td className="px-3 py-2"><select value={l.productId} onChange={(e) => pick(i, e.target.value)} className={inputCls}><option value="">— Pick a product —</option>{products?.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></td>
                    <td className="px-2 py-2 text-right"><input type="number" step="0.001" min="0" value={l.quantity} onChange={(e) => patch(i, { quantity: Number(e.target.value) })} className={`${inputCls} text-right font-mono`} /></td>
                    <td className="px-2 py-2 text-right"><input type="number" step="0.01" min="0" value={l.unitCost} onChange={(e) => patch(i, { unitCost: Number(e.target.value) })} className={`${inputCls} text-right font-mono`} /></td>
                    <td className="px-2 py-2 text-center"><button type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-sm text-ink-400 hover:bg-red-500 hover:text-white disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-ink-100 p-3"><button type="button" onClick={() => setLines([...lines, blank()])} className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-ink-300 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink-600 hover:border-brand-500 hover:text-brand-600"><Plus className="h-3.5 w-3.5" /> Add line</button></div>
          </div>
        </Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <Link href="/erp/grns" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">Cancel</Link>
          <button type="submit" disabled={create.isPending} className="btn-shimmer inline-flex items-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60"><PackagePlus className="h-4 w-4" /> Receive goods</button>
        </div>
      </form>
    </ErpPage>
  );
}

export default function NewGrnPage() { return <Suspense fallback={null}><NewGrnInner /></Suspense>; }
