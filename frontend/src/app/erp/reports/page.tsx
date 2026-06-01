'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Wallet, Receipt, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage, Spinner } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { n2 } from '@/lib/format';

const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

interface SalesSummary {
  invoiceCount: number; taxable: number; vat: number; total: number; collected: number; outstanding: number;
  topCustomers: { name?: string; code?: string; revenue: number }[];
  topProducts: { name?: string; sku?: string; quantity: number; revenue: number }[];
}
interface PL { revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number; marginPct: number }
interface Aging {
  rows: { id: string; name: string; code: string; d0_30: number; d31_60: number; d61_90: number; d90_plus: number; total: number }[];
  totals: { d0_30: number; d31_60: number; d61_90: number; d90_plus: number; total: number };
}

function Kpi({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-ink-500"><Icon className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-widest">{label}</span></div>
      <div className={`mt-2 font-mono text-2xl font-bold ${tone ?? 'text-ink-900'}`}>{value}</div>
    </Card>
  );
}

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const range = `from=${from}&to=${to}`;

  const sales = useQuery({ queryKey: ['rep-sales', from, to], queryFn: async () => (await api.get<{ data: SalesSummary }>(`/reports/sales-summary?${range}`)).data.data });
  const pl = useQuery({ queryKey: ['rep-pl', from, to], queryFn: async () => (await api.get<{ data: PL }>(`/reports/profit-loss?${range}`)).data.data });
  const aging = useQuery({ queryKey: ['rep-aging'], queryFn: async () => (await api.get<{ data: Aging }>(`/reports/aging`)).data.data });

  return (
    <ErpPage
      kicker="Finance"
      title="Reports"
      description="Sales performance, profitability and receivables aging."
      actions={
        <div className="flex items-end gap-2">
          <Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></Field>
          <Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></Field>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Sales KPIs */}
        {sales.isLoading || !sales.data ? <div className="grid h-32 place-items-center"><Spinner /></div> : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={TrendingUp} label="Sales (incl. VAT)" value={`AED ${n2(sales.data.total)}`} />
              <Kpi icon={Receipt} label="Net VAT" value={`AED ${n2(sales.data.vat)}`} />
              <Kpi icon={Wallet} label="Collected" value={`AED ${n2(sales.data.collected)}`} tone="text-green-700" />
              <Kpi icon={AlertTriangle} label="Outstanding" value={`AED ${n2(sales.data.outstanding)}`} tone="text-amber-700" />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="mb-3 font-display text-base tracking-widest text-ink-900">TOP CUSTOMERS</h3>
                {sales.data.topCustomers.length === 0 ? <p className="text-sm text-ink-400">No sales in this period.</p> : (
                  <table className="w-full text-sm">
                    <tbody>{sales.data.topCustomers.map((c, i) => (
                      <tr key={i} className="border-b border-ink-100 last:border-0"><td className="py-2">{c.name ?? '—'}</td><td className="py-2 text-right font-mono font-bold">{n2(c.revenue)}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </Card>
              <Card className="p-5">
                <h3 className="mb-3 font-display text-base tracking-widest text-ink-900">TOP PRODUCTS</h3>
                {sales.data.topProducts.length === 0 ? <p className="text-sm text-ink-400">No sales in this period.</p> : (
                  <table className="w-full text-sm">
                    <tbody>{sales.data.topProducts.map((p, i) => (
                      <tr key={i} className="border-b border-ink-100 last:border-0"><td className="py-2">{p.name ?? '—'}<span className="ml-2 text-xs text-ink-400">{n2(p.quantity)} units</span></td><td className="py-2 text-right font-mono font-bold">{n2(p.revenue)}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </Card>
            </div>
          </>
        )}

        {/* P&L */}
        {pl.data && (
          <Card className="p-6">
            <h3 className="mb-4 font-display text-base tracking-widest text-ink-900">PROFIT &amp; LOSS</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
              {[['Revenue', pl.data.revenue], ['COGS (purchases)', pl.data.cogs], ['Gross Profit', pl.data.grossProfit], ['Expenses', pl.data.expenses], ['Net Profit', pl.data.netProfit]].map(([label, val], i) => (
                <div key={i} className={`rounded-sm p-3 ${i === 4 ? 'bg-ink-950 text-white' : 'bg-ink-50'}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${i === 4 ? 'text-brand-500' : 'text-ink-500'}`}>{label}</div>
                  <div className="mt-1 font-mono text-lg font-bold">{n2(Number(val))}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-400">Net margin {n2(pl.data.marginPct)}%. COGS approximated from purchase invoices (not true per-unit cost).</p>
          </Card>
        )}

        {/* Aging */}
        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 px-5 py-3"><h3 className="font-display text-base tracking-widest text-ink-900">RECEIVABLES AGING</h3></div>
          {aging.isLoading || !aging.data ? <div className="grid h-24 place-items-center"><Spinner /></div> : aging.data.rows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-400">No outstanding receivables.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
                <th className="px-4 py-3">Customer</th><th className="px-4 py-3 text-right">0–30</th><th className="px-4 py-3 text-right">31–60</th><th className="px-4 py-3 text-right">61–90</th><th className="px-4 py-3 text-right">90+</th><th className="px-4 py-3 text-right">Total</th>
              </tr></thead>
              <tbody>
                {aging.data.rows.map((r) => (
                  <tr key={r.id} className="border-b border-ink-100 last:border-0">
                    <td className="px-4 py-2.5">{r.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{n2(r.d0_30)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{n2(r.d31_60)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{n2(r.d61_90)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-700">{n2(r.d90_plus)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold">{n2(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-ink-950 text-white font-bold">
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right font-mono">{n2(aging.data.totals.d0_30)}</td>
                <td className="px-4 py-3 text-right font-mono">{n2(aging.data.totals.d31_60)}</td>
                <td className="px-4 py-3 text-right font-mono">{n2(aging.data.totals.d61_90)}</td>
                <td className="px-4 py-3 text-right font-mono">{n2(aging.data.totals.d90_plus)}</td>
                <td className="px-4 py-3 text-right font-mono">{n2(aging.data.totals.total)}</td>
              </tr></tfoot>
            </table>
          )}
        </Card>
      </div>
    </ErpPage>
  );
}
