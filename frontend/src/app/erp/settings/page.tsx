'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, ErpPage, Spinner } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { useAuth } from '@/lib/auth-store';
import { apiErrorMessage } from '@/lib/lookups';
import type { CompanySettings } from '@/lib/erp-api';

export default function SettingsPage() {
  const can = useAuth((s) => s.can);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<{ data: CompanySettings }>('/settings')).data.data });

  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async (b: object) => (await api.put<{ data: CompanySettings }>('/settings', b)).data.data,
    onSuccess: () => { setMsg('Saved'); void qc.invalidateQueries({ queryKey: ['settings'] }); setTimeout(() => setMsg(null), 2500); },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const set = (k: keyof CompanySettings, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const readonly = !can('settings.manage');

  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;

  return (
    <ErpPage kicker="Admin" title="Company Settings" description="These details print on every invoice, quotation and voucher.">
      <form onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate({
        legalName: form.legalName, tradeName: form.tradeName, trn: form.trn, email: form.email || '', phone: form.phone,
        addressLine1: form.addressLine1, addressLine2: form.addressLine2, city: form.city, country: form.country || 'United Arab Emirates',
        defaultVatRate: form.defaultVatRate ?? 5, invoiceFooter: form.invoiceFooter,
      }); }} className="max-w-3xl space-y-5">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-brand-600" /><h2 className="font-display text-lg tracking-widest text-ink-900">LEGAL ENTITY</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name" required><input disabled={readonly} value={form.legalName ?? ''} onChange={(e) => set('legalName', e.target.value)} className={inputCls} /></Field>
            <Field label="Trade name"><input disabled={readonly} value={form.tradeName ?? ''} onChange={(e) => set('tradeName', e.target.value)} className={inputCls} /></Field>
            <Field label="TRN (15 digits)" required><input disabled={readonly} value={form.trn ?? ''} onChange={(e) => set('trn', e.target.value)} className={`${inputCls} font-mono`} /></Field>
            <Field label="Default VAT rate (%)"><input disabled={readonly} type="number" step="0.01" value={form.defaultVatRate ?? '5'} onChange={(e) => set('defaultVatRate', e.target.value)} className={inputCls} /></Field>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">CONTACT &amp; ADDRESS</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email"><input disabled={readonly} value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Field>
            <Field label="Phone"><input disabled={readonly} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></Field>
            <Field label="Address line 1"><input disabled={readonly} value={form.addressLine1 ?? ''} onChange={(e) => set('addressLine1', e.target.value)} className={inputCls} /></Field>
            <Field label="Address line 2"><input disabled={readonly} value={form.addressLine2 ?? ''} onChange={(e) => set('addressLine2', e.target.value)} className={inputCls} /></Field>
            <Field label="City"><input disabled={readonly} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} className={inputCls} /></Field>
            <Field label="Country"><input disabled={readonly} value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} className={inputCls} /></Field>
          </div>
        </Card>

        <Card className="p-6">
          <Field label="Invoice footer (printed at the bottom of documents)"><textarea disabled={readonly} rows={2} value={form.invoiceFooter ?? ''} onChange={(e) => set('invoiceFooter', e.target.value)} className={inputCls} /></Field>
        </Card>

        {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!readonly && (
          <div className="flex items-center justify-end gap-3">
            {msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}
            <button type="submit" disabled={save.isPending} className="btn-shimmer inline-flex items-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60"><Save className="h-4 w-4" /> Save settings</button>
          </div>
        )}
        {readonly && <p className="text-sm text-ink-400">You have read-only access to settings.</p>}
      </form>
    </ErpPage>
  );
}
