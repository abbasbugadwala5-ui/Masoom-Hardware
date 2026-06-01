'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage, Spinner } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { useWarehouses, apiErrorMessage } from '@/lib/lookups';
import { useAuth } from '@/lib/auth-store';
import { n2 } from '@/lib/format';
import type { StockRow } from '@/lib/erp-api';

interface Paginated<T> { data: T[]; pagination: { totalPages: number; total: number; page: number } }

export default function InventoryPage() {
  const can = useAuth((s) => s.can);
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [low, setLow] = useState(false);
  const [panel, setPanel] = useState<'adjust' | 'transfer' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', q, low],
    queryFn: async () => (await api.get<Paginated<StockRow>>(`/inventory?pageSize=100&q=${encodeURIComponent(q)}${low ? '&low=1' : ''}`)).data,
  });
  const valuation = useQuery({
    queryKey: ['inv-valuation'],
    queryFn: async () => (await api.get<{ data: { totalValue: number; lines: number } }>(`/reports/inventory-valuation`)).data.data,
  });

  return (
    <ErpPage
      kicker="Master"
      title="Inventory"
      description="Live stock on hand across warehouses, with adjustments and transfers."
      actions={
        <>
          {can('inventory.transfer') && <button onClick={() => setPanel(panel === 'transfer' ? null : 'transfer')} className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeftRight className="h-4 w-4" /> Transfer</button>}
          {can('inventory.adjust') && <button onClick={() => setPanel(panel === 'adjust' ? null : 'adjust')} className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400"><SlidersHorizontal className="h-4 w-4" /> Adjust</button>}
        </>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="text-[11px] font-bold uppercase tracking-widest text-ink-500">Stock value (at cost)</div><div className="mt-2 font-mono text-2xl font-bold text-ink-900">AED {valuation.data ? n2(valuation.data.totalValue) : '—'}</div></Card>
        <Card className="p-5"><div className="text-[11px] font-bold uppercase tracking-widest text-ink-500">SKUs with stock</div><div className="mt-2 font-mono text-2xl font-bold text-ink-900">{valuation.data?.lines ?? '—'}</div></Card>
        <Card className="p-5"><div className="text-[11px] font-bold uppercase tracking-widest text-ink-500">Low-stock items</div><div className="mt-2 font-mono text-2xl font-bold text-amber-700">{data?.data.filter((r) => r.low).length ?? '—'}</div></Card>
      </div>

      {panel === 'adjust' && <AdjustPanel onDone={() => { setPanel(null); void qc.invalidateQueries({ queryKey: ['inventory'] }); void qc.invalidateQueries({ queryKey: ['inv-valuation'] }); }} />}
      {panel === 'transfer' && <TransferPanel onDone={() => { setPanel(null); void qc.invalidateQueries({ queryKey: ['inventory'] }); }} />}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU or name…" className="w-72 rounded-sm border border-ink-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} className="h-4 w-4 accent-brand-500" /> Low stock only</label>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? <div className="grid h-32 place-items-center"><Spinner /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
              <th className="px-4 py-3">SKU</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">By warehouse</th><th className="px-4 py-3 text-right">Reorder</th><th className="px-4 py-3 text-right">On hand</th>
            </tr></thead>
            <tbody>
              {data?.data.map((r) => (
                <tr key={r.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{r.sku}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-ink-500">{r.byWarehouse.length ? r.byWarehouse.map((w) => `${w.warehouse}: ${n2(w.quantity)}`).join(' · ') : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink-500">{r.reorderLevel}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    <span className={r.low ? 'inline-flex items-center gap-1 text-amber-700' : ''}>{r.low && <AlertTriangle className="h-3.5 w-3.5" />}{n2(r.onHand)} {r.unit}</span>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400">No products found.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </ErpPage>
  );
}

function useProducts() {
  return useQuery({ queryKey: ['products-all'], queryFn: async () => (await api.get<{ data: { id: string; sku: string; name: string }[] }>('/products?pageSize=200')).data.data });
}

function AdjustPanel({ onDone }: { onDone: () => void }) {
  const { data: products } = useProducts();
  const { data: warehouses } = useWarehouses();
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [qtyDelta, setQtyDelta] = useState(0);
  const [type, setType] = useState('ADJUSTMENT');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mut = useMutation({ mutationFn: async (b: object) => (await api.post('/inventory/adjust', b)).data, onSuccess: onDone });

  return (
    <Card className="mb-5 border-brand-200 p-5">
      <h3 className="mb-3 font-display text-base tracking-widest text-ink-900">STOCK ADJUSTMENT</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Product"><select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}><option value="">—</option>{products?.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></Field>
        <Field label="Warehouse"><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}><option value="">—</option>{warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
        <Field label="Qty change (±)"><input type="number" step="0.001" value={qtyDelta} onChange={(e) => setQtyDelta(Number(e.target.value))} className={inputCls} /></Field>
        <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>{['ADJUSTMENT', 'DAMAGE', 'OPENING'].map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></Field>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onDone} className="rounded-sm border border-ink-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-700">Cancel</button>
        <button disabled={!productId || !warehouseId || qtyDelta === 0 || mut.isPending} onClick={() => { setError(null); mut.mutate({ productId, warehouseId, qtyDelta, type, notes: notes || null }, { onError: (e) => setError(apiErrorMessage(e)) }); }} className="rounded-sm bg-brand-500 px-5 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400 disabled:opacity-60">Apply</button>
      </div>
    </Card>
  );
}

function TransferPanel({ onDone }: { onDone: () => void }) {
  const { data: products } = useProducts();
  const { data: warehouses } = useWarehouses();
  const [fromW, setFromW] = useState('');
  const [toW, setToW] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mut = useMutation({ mutationFn: async (b: object) => (await api.post('/inventory/transfer', b)).data, onSuccess: onDone });

  return (
    <Card className="mb-5 border-brand-200 p-5">
      <h3 className="mb-3 font-display text-base tracking-widest text-ink-900">STOCK TRANSFER</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From warehouse"><select value={fromW} onChange={(e) => setFromW(e.target.value)} className={inputCls}><option value="">—</option>{warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
        <Field label="To warehouse"><select value={toW} onChange={(e) => setToW(e.target.value)} className={inputCls}><option value="">—</option>{warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
        <Field label="Product"><select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}><option value="">—</option>{products?.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></Field>
        <Field label="Quantity"><input type="number" step="0.001" min="0" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputCls} /></Field>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onDone} className="rounded-sm border border-ink-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-700">Cancel</button>
        <button disabled={!fromW || !toW || !productId || quantity <= 0 || mut.isPending} onClick={() => { setError(null); mut.mutate({ fromWarehouseId: fromW, toWarehouseId: toW, items: [{ productId, quantity }] }, { onError: (e) => setError(apiErrorMessage(e)) }); }} className="rounded-sm bg-brand-500 px-5 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400 disabled:opacity-60">Transfer</button>
      </div>
    </Card>
  );
}
