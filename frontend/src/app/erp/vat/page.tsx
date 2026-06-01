'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Percent } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage, Spinner } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { n2 } from '@/lib/format';

interface VatReturn {
  period: { from: string; to: string };
  sales: { taxable: number; vat: number };
  creditNotes: { taxable: number; vat: number };
  outputVat: { taxable: number; vat: number };
  inputVat: { taxable: number; vat: number };
  netPayable: number;
  note: string;
}

const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

export default function VatReturnPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const { data, isLoading } = useQuery({
    queryKey: ['vat-return', from, to],
    queryFn: async () => (await api.get<{ data: VatReturn }>(`/reports/vat-return?from=${from}&to=${to}`)).data.data,
  });

  const Row = ({ label, taxable, vat, strong }: { label: string; taxable: number; vat: number; strong?: boolean }) => (
    <tr className={strong ? 'bg-ink-50 font-bold' : ''}>
      <td className="px-4 py-3 text-ink-800">{label}</td>
      <td className="px-4 py-3 text-right font-mono">{n2(taxable)}</td>
      <td className="px-4 py-3 text-right font-mono">{n2(vat)}</td>
    </tr>
  );

  return (
    <ErpPage
      kicker="Finance"
      title="VAT Return"
      description="FTA-style summary of output and input VAT for the selected period."
      actions={
        <div className="flex items-end gap-2">
          <Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></Field>
          <Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></Field>
        </div>
      }
    >
      {isLoading || !data ? (
        <div className="grid h-64 place-items-center"><Spinner size="md" /></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-950 text-left text-[11px] font-bold uppercase tracking-widest text-white">
                  <th className="px-4 py-3">Box</th>
                  <th className="px-4 py-3 text-right">Amount (AED)</th>
                  <th className="px-4 py-3 text-right">VAT (AED)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                <Row label="Standard-rated supplies (sales)" taxable={data.sales.taxable} vat={data.sales.vat} />
                <Row label="Less: Credit notes" taxable={-data.creditNotes.taxable} vat={-data.creditNotes.vat} />
                <Row label="Total Output VAT" taxable={data.outputVat.taxable} vat={data.outputVat.vat} strong />
                <Row label="Standard-rated purchases (input)" taxable={data.inputVat.taxable} vat={data.inputVat.vat} />
                <Row label="Total Input VAT (recoverable)" taxable={data.inputVat.taxable} vat={data.inputVat.vat} strong />
              </tbody>
            </table>
            <p className="border-t border-ink-100 px-4 py-3 text-xs text-ink-400">{data.note}</p>
          </Card>

          <Card className={`p-6 ${data.netPayable >= 0 ? 'border-brand-300' : 'border-green-300'}`}>
            <div className="flex items-center gap-2 text-ink-500">
              <Percent className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Net VAT {data.netPayable >= 0 ? 'Payable' : 'Refundable'}</span>
            </div>
            <div className={`mt-3 font-mono text-4xl font-bold ${data.netPayable >= 0 ? 'text-ink-900' : 'text-green-700'}`}>
              AED {n2(Math.abs(data.netPayable))}
            </div>
            <p className="mt-2 text-xs text-ink-500">Output VAT {n2(data.outputVat.vat)} − Input VAT {n2(data.inputVat.vat)}</p>
            <div className="mt-5 rounded-sm bg-ink-50 p-3 text-xs text-ink-600">
              Period: {new Date(data.period.from).toLocaleDateString('en-AE')} → {new Date(data.period.to).toLocaleDateString('en-AE')}
            </div>
          </Card>
        </div>
      )}
    </ErpPage>
  );
}
