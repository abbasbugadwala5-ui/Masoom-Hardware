'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Truck, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { useCustomers, useWarehouses, apiErrorMessage } from '@/lib/lookups';
import type { DeliveryOrder, Invoice, Product } from '@/lib/erp-api';

interface QtyLine { productId: string; description: string; quantity: number }
const blankQty = (): QtyLine => ({ productId: '', description: '', quantity: 1 });

function NewDeliveryInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const invoiceId = sp.get('invoiceId');
  const today = new Date().toISOString().slice(0, 10);

  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [date, setDate] = useState(today);
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [dispatch, setDispatch] = useState(true);
  const [lines, setLines] = useState<QtyLine[]>([blankQty()]);
  const [error, setError] = useState<string | null>(null);

  const { data: customers } = useCustomers();
  const { data: warehouses } = useWarehouses();
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => (await api.get<{ data: Product[] }>('/products?pageSize=200')).data.data,
  });

  // Prefill from an invoice if invoiceId is supplied.
  const { data: srcInvoice } = useQuery({
    queryKey: ['invoice-src', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => (await api.get<{ data: Invoice }>(`/invoices/${invoiceId}`)).data.data,
  });
  useEffect(() => {
    if (srcInvoice) {
      setCustomerId(srcInvoice.customerId);
      if (srcInvoice.items?.length) {
        setLines(srcInvoice.items.map((it) => ({ productId: it.productId, description: it.description ?? '', quantity: Number(it.quantity) })));
      }
    }
  }, [srcInvoice]);

  useEffect(() => { if (warehouses?.length && !warehouseId) setWarehouseId(warehouses[0]!.id); }, [warehouses, warehouseId]);

  const create = useMutation({
    mutationFn: async (body: object) => (await api.post<{ data: DeliveryOrder }>('/delivery-orders', body)).data.data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['delivery-orders'] }); },
  });

  function patch(i: number, ch: Partial<QtyLine>) { const n = [...lines]; n[i] = { ...n[i]!, ...ch }; setLines(n); }
  function pick(i: number, productId: string) {
    const p = products?.find((x) => x.id === productId);
    patch(i, { productId, description: p?.name ?? '' });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) { setError('Pick a customer'); return; }
    if (!warehouseId) { setError('Pick a warehouse'); return; }
    const clean = lines.filter((l) => l.productId && l.quantity > 0);
    if (!clean.length) { setError('Add at least one line'); return; }
    try {
      const dorder = await create.mutateAsync({ customerId, warehouseId, invoiceId: invoiceId || null, date, driverName: driverName || null, vehicleNo: vehicleNo || null, deliveryAddress: deliveryAddress || null, items: clean, dispatch });
      router.push(`/erp/deliveries/${dorder.id}`);
    } catch (err) { setError(apiErrorMessage(err, 'Create failed')); }
  }

  return (
    <ErpPage
      kicker="Sales"
      title="New Delivery Order"
      description={dispatch ? 'Dispatching will reduce warehouse stock.' : 'Saved as draft — dispatch later.'}
      actions={<Link href="/erp/deliveries" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">CUSTOMER &amp; WAREHOUSE</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer" required className="sm:col-span-2">
                <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
                  <option value="">— Pick a customer —</option>
                  {customers?.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                </select>
              </Field>
              <Field label="Warehouse" required>
                <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}>
                  <option value="">— Pick —</option>
                  {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </Field>
              <Field label="Date" required><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">DELIVERY DETAILS</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Driver name"><input value={driverName} onChange={(e) => setDriverName(e.target.value)} className={inputCls} /></Field>
              <Field label="Vehicle no"><input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} className={inputCls} /></Field>
              <Field label="Delivery address" className="sm:col-span-2"><input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Defaults to customer address" className={inputCls} /></Field>
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={dispatch} onChange={(e) => setDispatch(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
                <span><span className="font-semibold text-ink-900">Dispatch now</span><span className="block text-xs text-ink-500">Posts stock-out immediately.</span></span>
              </label>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">ITEMS TO DELIVER</h2>
          <div className="overflow-hidden rounded-sm border border-ink-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5 text-right" style={{ width: '140px' }}>Qty</th>
                  <th className="px-3 py-2.5" style={{ width: '48px' }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-ink-100 last:border-b-0">
                    <td className="px-3 py-2">
                      <select value={l.productId} onChange={(e) => pick(i, e.target.value)} className={`${inputCls} mb-1.5`}>
                        <option value="">— Pick a product —</option>
                        {products?.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
                      </select>
                      <input value={l.description} onChange={(e) => patch(i, { description: e.target.value })} placeholder="Description" className={`${inputCls} text-xs`} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" step="0.001" min="0" value={l.quantity} onChange={(e) => patch(i, { quantity: Number(e.target.value) })} className={`${inputCls} text-right font-mono`} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-sm text-ink-400 hover:bg-red-500 hover:text-white disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-ink-100 p-3">
              <button type="button" onClick={() => setLines([...lines, blankQty()])} className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-ink-300 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink-600 hover:border-brand-500 hover:text-brand-600"><Plus className="h-3.5 w-3.5" /> Add line</button>
            </div>
          </div>
        </Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/erp/deliveries" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">Cancel</Link>
          <button type="submit" disabled={create.isPending} className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60">
            <Truck className="h-4 w-4" /> {dispatch ? 'Create & dispatch' : 'Save draft'}
          </button>
        </div>
      </form>
    </ErpPage>
  );
}

export default function NewDeliveryPage() {
  return <Suspense fallback={null}><NewDeliveryInner /></Suspense>;
}
