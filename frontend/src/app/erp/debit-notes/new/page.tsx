'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Undo2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { CostLineEditor, blankCostLine, type CostLine } from '@/components/erp/CostLineEditor';
import { useWarehouses, apiErrorMessage } from '@/lib/lookups';
import type { DebitNote, PurchaseInvoice } from '@/lib/erp-api';

function NewDebitNoteInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const purchaseInvoiceId = sp.get('purchaseInvoiceId') ?? '';
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<CostLine[]>([blankCostLine()]);
  const [error, setError] = useState<string | null>(null);

  const { data: warehouses } = useWarehouses();
  const { data: pi } = useQuery({ queryKey: ['pi-src', purchaseInvoiceId], enabled: !!purchaseInvoiceId, queryFn: async () => (await api.get<{ data: PurchaseInvoice }>(`/purchase-invoices/${purchaseInvoiceId}`)).data.data });

  useEffect(() => {
    if (pi?.items?.length) setLines(pi.items.map((it) => ({ productId: it.productId, description: it.description ?? '', quantity: Number(it.quantity), unitCost: Number(it.unitCost), vatRate: Number(it.vatRate ?? 5), reduceStock: false })));
  }, [pi]);

  const create = useMutation({ mutationFn: async (b: object) => (await api.post<{ data: DebitNote }>('/debit-notes', b)).data.data, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['debit-notes'] }); } });
  const needsWarehouse = lines.some((l) => l.reduceStock);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!purchaseInvoiceId) { setError('Open a purchase invoice and click “Debit Note”.'); return; }
    if (needsWarehouse && !warehouseId) { setError('Pick a warehouse to reduce stock'); return; }
    const clean = lines.filter((l) => l.productId && l.quantity > 0);
    if (!clean.length) { setError('Add at least one line'); return; }
    try {
      const dn = await create.mutateAsync({ purchaseInvoiceId, date, reason: reason || null, warehouseId: warehouseId || null, items: clean.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost, reduceStock: !!l.reduceStock })) });
      router.push(`/erp/debit-notes/${dn.id}`);
    } catch (err) { setError(apiErrorMessage(err, 'Create failed')); }
  }

  return (
    <ErpPage kicker="Purchases" title="New Debit Note" description={pi ? `Against purchase invoice ${pi.number} · ${pi.supplier?.name ?? ''}` : 'Claim a return against a supplier invoice.'} actions={<Link href="/erp/debit-notes" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" required><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Short / damaged" className={inputCls} /></Field>
            <Field label="Reduce-stock warehouse" hint={needsWarehouse ? 'Required — some lines reduce stock' : 'Only used if a line reduces stock'}>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}><option value="">— None —</option>{warehouses?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            </Field>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">DEBIT LINES</h2>
          <CostLineEditor lines={lines} onChange={setLines} showVat={false} showReduceStock />
        </Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <Link href="/erp/debit-notes" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">Cancel</Link>
          <button type="submit" disabled={create.isPending} className="btn-shimmer inline-flex items-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60"><Undo2 className="h-4 w-4" /> Issue debit note</button>
        </div>
      </form>
    </ErpPage>
  );
}

export default function NewDebitNotePage() { return <Suspense fallback={null}><NewDebitNoteInner /></Suspense>; }
