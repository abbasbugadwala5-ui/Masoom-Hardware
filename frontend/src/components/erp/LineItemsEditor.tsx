'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { n2 } from '@/lib/format';
import { inputCls } from './Field';
import type { Product } from '@/lib/erp-api';

export interface LineDraft {
  productId: string;
  description: string;
  quantity:  number;
  unitPrice: number;
  discount:  number;
  vatRate:   number;
}

export function blankLine(): LineDraft {
  return { productId: '', description: '', quantity: 1, unitPrice: 0, discount: 0, vatRate: 5 };
}

function round2(n: number) { return Math.round(n * 100 + Number.EPSILON) / 100; }
export function lineMath(l: LineDraft) {
  const gross = l.quantity * l.unitPrice;
  const after = gross - (l.discount ?? 0);
  const vat   = after * (l.vatRate / 100);
  return { subtotal: round2(after), vatAmount: round2(vat), total: round2(after + vat) };
}

interface Props {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  showDiscount?: boolean;
}

export function LineItemsEditor({ lines, onChange, showDiscount = true }: Props) {
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => (await api.get<{ data: Product[] }>('/products?pageSize=200')).data.data,
  });

  const totals = useMemo(() => {
    const computed = lines.map(lineMath);
    return {
      subtotal: round2(computed.reduce((s, c) => s + c.subtotal,  0)),
      vat:      round2(computed.reduce((s, c) => s + c.vatAmount, 0)),
      total:    round2(computed.reduce((s, c) => s + c.total,     0)),
    };
  }, [lines]);

  function patch(i: number, change: Partial<LineDraft>) {
    const next = [...lines];
    next[i] = { ...next[i]!, ...change };
    onChange(next);
  }

  function pickProduct(i: number, productId: string) {
    const p = products?.find((x) => x.id === productId);
    if (!p) return patch(i, { productId });
    patch(i, {
      productId,
      description: p.name,
      unitPrice:   Number(p.sellingPrice) || 0,
      vatRate:     Number(p.vatRate) || 5,
    });
  }

  return (
    <div className="overflow-hidden rounded-sm border border-ink-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
              <th className="px-3 py-2.5" style={{ width: '32%' }}>Product</th>
              <th className="px-2 py-2.5 text-right" style={{ width: '78px' }}>Qty</th>
              <th className="px-2 py-2.5 text-right" style={{ width: '110px' }}>Unit price</th>
              {showDiscount && <th className="px-2 py-2.5 text-right" style={{ width: '90px' }}>Discount</th>}
              <th className="px-2 py-2.5 text-right" style={{ width: '70px' }}>VAT %</th>
              <th className="px-2 py-2.5 text-right" style={{ width: '110px' }}>Subtotal</th>
              <th className="px-2 py-2.5 text-right" style={{ width: '110px' }}>VAT</th>
              <th className="px-2 py-2.5 text-right" style={{ width: '120px' }}>Total</th>
              <th className="px-2 py-2.5" style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const m = lineMath(l);
              return (
                <tr key={i} className="border-b border-ink-100 last:border-b-0 align-top">
                  <td className="px-3 py-2">
                    <select
                      value={l.productId}
                      onChange={(e) => pickProduct(i, e.target.value)}
                      className={`${inputCls} mb-1.5`}
                    >
                      <option value="">— Pick a product —</option>
                      {products?.map((p) => (
                        <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>
                      ))}
                    </select>
                    <input
                      value={l.description}
                      onChange={(e) => patch(i, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className={`${inputCls} text-xs`}
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <input type="number" step="0.001" min="0" value={l.quantity}
                      onChange={(e) => patch(i, { quantity: Number(e.target.value) })}
                      className={`${inputCls} text-right font-mono`} />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <input type="number" step="0.01" min="0" value={l.unitPrice}
                      onChange={(e) => patch(i, { unitPrice: Number(e.target.value) })}
                      className={`${inputCls} text-right font-mono`} />
                  </td>
                  {showDiscount && (
                    <td className="px-2 py-2 text-right">
                      <input type="number" step="0.01" min="0" value={l.discount}
                        onChange={(e) => patch(i, { discount: Number(e.target.value) })}
                        className={`${inputCls} text-right font-mono`} />
                    </td>
                  )}
                  <td className="px-2 py-2 text-right">
                    <input type="number" step="0.01" min="0" max="100" value={l.vatRate}
                      onChange={(e) => patch(i, { vatRate: Number(e.target.value) })}
                      className={`${inputCls} text-right font-mono`} />
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-ink-700">{n2(m.subtotal)}</td>
                  <td className="px-2 py-3 text-right font-mono text-ink-500">{n2(m.vatAmount)}</td>
                  <td className="px-2 py-3 text-right font-mono font-bold text-ink-900">{n2(m.total)}</td>
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      aria-label="Remove line"
                      disabled={lines.length === 1}
                      onClick={() => onChange(lines.filter((_, j) => j !== i))}
                      className="grid h-8 w-8 place-items-center rounded-sm text-ink-400 hover:bg-red-500 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink-200 bg-ink-50 text-sm">
              <td colSpan={showDiscount ? 5 : 4} className="px-3 py-2.5 text-right font-bold uppercase tracking-widest text-ink-500">Subtotal</td>
              <td colSpan={2} className="px-2 py-2.5 text-right font-mono text-ink-700">{n2(totals.subtotal)}</td>
              <td colSpan={2}></td>
            </tr>
            <tr className="bg-ink-50 text-sm">
              <td colSpan={showDiscount ? 5 : 4} className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-ink-500">VAT</td>
              <td colSpan={2} className="px-2 py-1.5 text-right font-mono text-ink-500">{n2(totals.vat)}</td>
              <td colSpan={2}></td>
            </tr>
            <tr className="bg-brand-500/10 text-base">
              <td colSpan={showDiscount ? 5 : 4} className="px-3 py-3 text-right font-display text-lg tracking-wide text-ink-900">GRAND TOTAL</td>
              <td colSpan={2} className="px-2 py-3 text-right font-mono text-lg font-bold text-ink-900">AED {n2(totals.total)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="border-t border-ink-100 p-3">
        <button
          type="button"
          onClick={() => onChange([...lines, blankLine()])}
          className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-ink-300 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink-600 hover:border-brand-500 hover:text-brand-600"
        >
          <Plus className="h-3.5 w-3.5" /> Add line
        </button>
      </div>
    </div>
  );
}
