'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { CostLineEditor, blankCostLine, type CostLine } from '@/components/erp/CostLineEditor';
import { useSuppliers, apiErrorMessage } from '@/lib/lookups';
import type { PurchaseInvoice } from '@/lib/erp-api';

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [postNow, setPostNow] = useState(true);
  const [lines, setLines] = useState<CostLine[]>([blankCostLine()]);
  const [error, setError] = useState<string | null>(null);

  const { data: suppliers } = useSuppliers();
  const create = useMutation({
    mutationFn: async (b: object) => (await api.post<{ data: PurchaseInvoice }>('/purchase-invoices', b)).data.data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['purchase-invoices'] }); },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supplierId) { setError('Pick a supplier'); return; }
    const clean = lines.filter((l) => l.productId && l.quantity > 0);
    if (!clean.length) { setError('Add at least one line'); return; }
    try {
      const pi = await create.mutateAsync({ supplierId, supplierInvoiceNo: supplierInvoiceNo || null, date, dueDate: dueDate || null, notes: notes || null, items: clean, postNow });
      router.push(`/erp/purchase-invoices/${pi.id}`);
    } catch (err) { setError(apiErrorMessage(err, 'Create failed')); }
  }

  return (
    <ErpPage kicker="Purchases" title="New Purchase Invoice" actions={<Link href="/erp/purchase-invoices" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500"><ArrowLeft className="h-4 w-4" /> Back</Link>}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Supplier" required className="lg:col-span-2">
              <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}><option value="">— Pick a supplier —</option>{suppliers?.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select>
            </Field>
            <Field label="Supplier invoice no"><input value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} className={inputCls} /></Field>
            <Field label="Date" required><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Due date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} /></Field>
            <label className="flex items-center gap-2 text-sm lg:col-span-3"><input type="checkbox" checked={postNow} onChange={(e) => setPostNow(e.target.checked)} className="h-4 w-4 accent-brand-500" /> <span className="font-semibold text-ink-900">Post immediately</span> <span className="text-xs text-ink-500">(counts toward input VAT)</span></label>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">LINE ITEMS</h2>
          <CostLineEditor lines={lines} onChange={setLines} showVat />
        </Card>

        <Card className="p-6"><Field label="Notes"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></Field></Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <Link href="/erp/purchase-invoices" className="inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500">Cancel</Link>
          <button type="submit" disabled={create.isPending} className="btn-shimmer inline-flex items-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60"><FilePlus2 className="h-4 w-4" /> Save purchase invoice</button>
        </div>
      </form>
    </ErpPage>
  );
}
