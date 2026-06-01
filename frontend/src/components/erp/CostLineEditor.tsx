'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { n2 } from '@/lib/format';
import { inputCls } from './Field';
import type { Product } from '@/lib/erp-api';

export interface CostLine {
  productId: string;
  description: string;
  quantity: number;
  unitCost: number;
  vatRate: number;
  reduceStock?: boolean; // used by debit notes
}

export const blankCostLine = (): CostLine => ({ productId: '', description: '', quantity: 1, unitCost: 0, vatRate: 5 });
const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

export function costLineTotal(l: CostLine, showVat: boolean) {
  const base = l.quantity * l.unitCost;
  return round2(showVat ? base * (1 + l.vatRate / 100) : base);
}

export function CostLineEditor({
  lines, onChange, showVat = true, showReduceStock = false,
}: {
  lines: CostLine[];
  onChange: (l: CostLine[]) => void;
  showVat?: boolean;
  showReduceStock?: boolean;
}) {
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => (await api.get<{ data: Product[] }>('/products?pageSize=200')).data.data,
  });

  function patch(i: number, ch: Partial<CostLine>) { const n = [...lines]; n[i] = { ...n[i]!, ...ch }; onChange(n); }
  function pick(i: number, productId: string) {
    const p = products?.find((x) => x.id === productId);
    patch(i, { productId, description: p?.name ?? '', unitCost: Number(p?.costPrice) || 0, vatRate: Number(p?.vatRate) || 5 });
  }
  const grand = round2(lines.reduce((s, l) => s + costLineTotal(l, showVat), 0));
  const colCount = 3 + (showVat ? 1 : 0) + (showReduceStock ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-sm border border-ink-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
            <th className="px-3 py-2.5" style={{ width: '34%' }}>Product</th>
            <th className="px-2 py-2.5 text-right" style={{ width: '90px' }}>Qty</th>
            <th className="px-2 py-2.5 text-right" style={{ width: '110px' }}>Unit cost</th>
            {showVat && <th className="px-2 py-2.5 text-right" style={{ width: '70px' }}>VAT%</th>}
            {showReduceStock && <th className="px-2 py-2.5 text-center" style={{ width: '80px' }}>Stock−</th>}
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
              <td className="px-2 py-2 text-right"><input type="number" step="0.01" min="0" value={l.unitCost} onChange={(e) => patch(i, { unitCost: Number(e.target.value) })} className={`${inputCls} text-right font-mono`} /></td>
              {showVat && <td className="px-2 py-2 text-right"><input type="number" step="0.01" min="0" max="100" value={l.vatRate} onChange={(e) => patch(i, { vatRate: Number(e.target.value) })} className={`${inputCls} text-right font-mono`} /></td>}
              {showReduceStock && <td className="px-2 py-3 text-center"><input type="checkbox" checked={!!l.reduceStock} onChange={(e) => patch(i, { reduceStock: e.target.checked })} className="h-4 w-4 accent-brand-500" /></td>}
              <td className="px-2 py-3 text-right font-mono font-bold">{n2(costLineTotal(l, showVat))}</td>
              <td className="px-2 py-3 text-center"><button type="button" disabled={lines.length === 1} onClick={() => onChange(lines.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-sm text-ink-400 hover:bg-red-500 hover:text-white disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-brand-500/10">
            <td colSpan={colCount} className="px-3 py-3 text-right font-display text-base tracking-wide text-ink-900">TOTAL</td>
            <td className="px-2 py-3 text-right font-mono text-base font-bold text-ink-900">AED {n2(grand)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      <div className="border-t border-ink-100 p-3">
        <button type="button" onClick={() => onChange([...lines, blankCostLine()])} className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-ink-300 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink-600 hover:border-brand-500 hover:text-brand-600"><Plus className="h-3.5 w-3.5" /> Add line</button>
      </div>
    </div>
  );
}
