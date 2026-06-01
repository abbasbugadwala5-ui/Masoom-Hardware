'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage, Spinner } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { useCustomers, apiErrorMessage } from '@/lib/lookups';
import { useAuth } from '@/lib/auth-store';
import { n2, formatDate } from '@/lib/format';
import type { Expense } from '@/lib/erp-api';

interface LedgerRow { date: string; type: string; ref: string; debit: number; credit: number; balance: number }
interface Ledger { customer?: { name: string; code: string }; supplier?: { name: string; code: string }; opening: number; closing: number; rows: LedgerRow[] }

export default function AccountsPage() {
  const [tab, setTab] = useState<'expenses' | 'ledger'>('expenses');
  return (
    <ErpPage kicker="Finance" title="Accounts" description="Expenses, and customer / supplier ledgers with running balances.">
      <div className="mb-5 flex gap-1 border-b border-ink-200">
        {(['expenses', 'ledger'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-bold uppercase tracking-widest ${tab === t ? 'border-b-2 border-brand-500 text-ink-900' : 'text-ink-400 hover:text-ink-700'}`}>{t === 'expenses' ? 'Expenses' : 'Ledgers'}</button>
        ))}
      </div>
      {tab === 'expenses' ? <Expenses /> : <LedgerLookup />}
    </ErpPage>
  );
}

function Expenses() {
  const can = useAuth((s) => s.can);
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['expenses'], queryFn: async () => (await api.get<{ data: Expense[] }>('/expenses?pageSize=100')).data.data });

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({ mutationFn: async (b: object) => (await api.post('/expenses', b)).data, onSuccess: () => { setShow(false); void qc.invalidateQueries({ queryKey: ['expenses'] }); } });

  return (
    <div>
      {can('accounts.write') && (
        <div className="mb-4">
          <button onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400"><Plus className="h-4 w-4" /> Add expense</button>
        </div>
      )}
      {show && (
        <Card className="mb-5 border-brand-200 p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Category"><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Rent / Salary / Fuel…" className={inputCls} /></Field>
            <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></Field>
            <Field label="Amount"><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputCls} /></Field>
            <Field label="VAT"><input type="number" step="0.01" value={vatAmount} onChange={(e) => setVatAmount(Number(e.target.value))} className={inputCls} /></Field>
          </div>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShow(false)} className="rounded-sm border border-ink-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-700">Cancel</button>
            <button disabled={!category || amount <= 0 || create.isPending} onClick={() => { setError(null); create.mutate({ date, category, description: description || null, amount, vatAmount }, { onError: (e) => setError(apiErrorMessage(e)) }); }} className="rounded-sm bg-brand-500 px-5 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400 disabled:opacity-60">Save</button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {isLoading ? <div className="grid h-24 place-items-center"><Spinner /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500"><th className="px-4 py-3">Ref</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">VAT</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
            <tbody>
              {data?.map((e) => (
                <tr key={e.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{e.number}</td><td className="px-4 py-2.5">{formatDate(e.date)}</td><td className="px-4 py-2.5 font-semibold">{e.category}</td><td className="px-4 py-2.5 text-ink-500">{e.description ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{n2(e.amount)}</td><td className="px-4 py-2.5 text-right font-mono text-ink-500">{n2(e.vatAmount)}</td><td className="px-4 py-2.5 text-right font-mono font-bold">{n2(e.total)}</td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-400">No expenses recorded.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function LedgerLookup() {
  const [kind, setKind] = useState<'customer' | 'supplier'>('customer');
  const [partyId, setPartyId] = useState('');
  const { data: customers } = useCustomers();
  const { data: suppliers } = useQuery({ queryKey: ['suppliers-all'], queryFn: async () => (await api.get<{ data: { id: string; code: string; name: string }[] }>('/suppliers?pageSize=200')).data.data });

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['ledger', kind, partyId],
    enabled: !!partyId,
    queryFn: async () => (await api.get<{ data: Ledger }>(`/reports/${kind}-ledger/${partyId}`)).data.data,
  });

  const parties = kind === 'customer' ? customers : suppliers;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Ledger type"><select value={kind} onChange={(e) => { setKind(e.target.value as 'customer' | 'supplier'); setPartyId(''); }} className={inputCls}><option value="customer">Customer</option><option value="supplier">Supplier</option></select></Field>
        <Field label={kind === 'customer' ? 'Customer' : 'Supplier'} className="min-w-[280px]"><select value={partyId} onChange={(e) => setPartyId(e.target.value)} className={inputCls}><option value="">— Pick —</option>{parties?.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></Field>
      </div>

      {!partyId ? (
        <Card className="grid place-items-center py-16 text-ink-400"><BookOpen className="mb-2 h-8 w-8" />Pick a {kind} to view their ledger.</Card>
      ) : isLoading || !ledger ? (
        <div className="grid h-32 place-items-center"><Spinner /></div>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <div><div className="font-display text-lg tracking-wide text-ink-900">{(ledger.customer ?? ledger.supplier)?.name}</div></div>
            <div className="text-right"><div className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Closing Balance</div><div className={`font-mono text-xl font-bold ${ledger.closing >= 0 ? 'text-ink-900' : 'text-green-700'}`}>AED {n2(Math.abs(ledger.closing))} {ledger.closing >= 0 ? 'Dr' : 'Cr'}</div></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Ref</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr></thead>
            <tbody>
              <tr className="border-b border-ink-100 bg-ink-50/50"><td className="px-4 py-2.5 italic text-ink-500" colSpan={5}>Opening balance</td><td className="px-4 py-2.5 text-right font-mono">{n2(ledger.opening)}</td></tr>
              {ledger.rows.map((r, i) => (
                <tr key={i} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-2.5">{formatDate(r.date)}</td><td className="px-4 py-2.5">{r.type}</td><td className="px-4 py-2.5 font-mono text-xs">{r.ref}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{r.debit ? n2(r.debit) : '—'}</td><td className="px-4 py-2.5 text-right font-mono">{r.credit ? n2(r.credit) : '—'}</td><td className="px-4 py-2.5 text-right font-mono font-bold">{n2(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
