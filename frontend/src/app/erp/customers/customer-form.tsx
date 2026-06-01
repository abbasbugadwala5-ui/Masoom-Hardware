'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useCreate, useUpdate, useDelete, type Customer } from '@/lib/erp-api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { useAuth } from '@/lib/auth-store';

interface CustomerInput {
  code: string; name: string; legalName?: string | null;
  trn?: string | null; email?: string | null; phone?: string | null;
  contactPerson?: string | null;
  addressLine1?: string | null; addressLine2?: string | null;
  city?: string | null; country: string;
  creditLimit: number; creditDays: number; openingBalance: number;
  notes?: string | null; isActive: boolean;
}

const blank: CustomerInput = {
  code: '', name: '', legalName: '', trn: '', email: '', phone: '',
  contactPerson: '', addressLine1: '', addressLine2: '',
  city: '', country: 'United Arab Emirates',
  creditLimit: 0, creditDays: 0, openingBalance: 0,
  notes: '', isActive: true,
};

export function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const can = useAuth((s) => s.can);
  const create = useCreate<CustomerInput>('customers');
  const update = useUpdate<CustomerInput>('customers');
  const del    = useDelete('customers');

  const isEdit = !!customer;
  const [form, setForm] = useState<CustomerInput>(() =>
    customer ? {
      code: customer.code, name: customer.name, legalName: customer.legalName ?? '',
      trn: customer.trn ?? '', email: customer.email ?? '', phone: customer.phone ?? '',
      contactPerson: customer.contactPerson ?? '', addressLine1: customer.addressLine1 ?? '',
      addressLine2: '', city: customer.city ?? '', country: 'United Arab Emirates',
      creditLimit: Number(customer.creditLimit), creditDays: customer.creditDays,
      openingBalance: Number(customer.openingBalance), notes: '', isActive: customer.isActive,
    } : blank,
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && customer) await update.mutateAsync({ id: customer.id, body: form });
      else                    await create.mutateAsync(form);
      router.push('/erp/customers');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Save failed';
      setError(msg);
    }
  }

  async function onDelete() {
    if (!customer) return;
    if (!confirm(`Delete "${customer.name}"?`)) return;
    await del.mutateAsync(customer.id);
    router.push('/erp/customers');
  }

  return (
    <ErpPage
      kicker={isEdit ? 'Edit customer' : 'New customer'}
      title={isEdit ? (customer?.name ?? 'Customer') : 'Add a customer'}
      description={isEdit ? `Code ${customer?.code}` : 'Create a new customer record.'}
      actions={
        <Link href="/erp/customers" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">DETAILS</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer code" required>
                <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${inputCls} font-mono`} placeholder="e.g. CUST-0001" />
              </Field>
              <Field label="Name" required>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Legal name">
                <input value={form.legalName ?? ''} onChange={(e) => setForm({ ...form, legalName: e.target.value })} className={inputCls} />
              </Field>
              <Field label="TRN" hint="15-digit UAE Tax Registration Number">
                <input value={form.trn ?? ''} onChange={(e) => setForm({ ...form, trn: e.target.value })} className={`${inputCls} font-mono`} placeholder="100000000000000" />
              </Field>
              <Field label="Contact person">
                <input value={form.contactPerson ?? ''} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Phone">
                <input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+971…" />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">ADDRESS</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address" className="sm:col-span-2">
                <input value={form.addressLine1 ?? ''} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} className={inputCls} />
              </Field>
              <Field label="City">
                <input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Country">
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">CREDIT</h2>
            <div className="space-y-4">
              <Field label="Credit limit (AED)">
                <input type="number" step="0.01" min="0" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Credit days">
                <input type="number" min="0" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: Number(e.target.value) })} className={inputCls} />
              </Field>
              <Field label="Opening balance (AED)">
                <input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Status">
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-brand-500" /> Active
                </label>
              </Field>
            </div>
          </Card>

          {error && <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex flex-col gap-2">
            <button type="submit" disabled={create.isPending || update.isPending || !can('customer.write')} className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-5 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60">
              <Save className="h-4 w-4" /> {isEdit ? 'Save changes' : 'Create customer'}
            </button>
            {isEdit && can('customer.write') && (
              <button type="button" onClick={onDelete} className="inline-flex items-center justify-center gap-2 rounded-sm border border-red-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" /> Delete customer
              </button>
            )}
          </div>
        </div>
      </form>
    </ErpPage>
  );
}
