'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useCreate, useUpdate, useDelete, type Brand, type Category, type Product } from '@/lib/erp-api';
import { Card, ErpPage } from '@/components/erp/ErpPage';
import { Field, inputCls } from '@/components/erp/Field';
import { useAuth } from '@/lib/auth-store';

interface ProductInput {
  sku: string; barcode?: string | null; name: string; description?: string | null;
  unit: string;
  costPrice: number; sellingPrice: number; vatRate: number;
  reorderLevel: number; isActive: boolean;
  categoryId?: string | null; brandId?: string | null;
}

const blankForm: ProductInput = {
  sku: '', barcode: '', name: '', description: '',
  unit: 'PCS',
  costPrice: 0, sellingPrice: 0, vatRate: 5,
  reorderLevel: 0, isActive: true,
  categoryId: '', brandId: '',
};

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const can = useAuth((s) => s.can);
  const create = useCreate<ProductInput>('products');
  const update = useUpdate<ProductInput>('products');
  const del = useDelete('products');

  const isEdit = !!product;

  const [form, setForm] = useState<ProductInput>(() =>
    product ? {
      sku: product.sku, barcode: product.barcode ?? '', name: product.name,
      description: product.description ?? '', unit: product.unit,
      costPrice: Number(product.costPrice), sellingPrice: Number(product.sellingPrice), vatRate: Number(product.vatRate),
      reorderLevel: product.reorderLevel, isActive: product.isActive,
      categoryId: product.categoryId ?? '', brandId: product.brandId ?? '',
    } : blankForm,
  );
  const [error, setError] = useState<string | null>(null);

  // Categories + brands for dropdowns
  const { data: cats }   = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<{ data: Category[] }>('/categories')).data.data });
  const { data: brands } = useQuery({ queryKey: ['brands'],     queryFn: async () => (await api.get<{ data: Brand[] }>('/brands')).data.data });

  useEffect(() => { setError(null); }, [form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: ProductInput = {
      ...form,
      barcode:     form.barcode     || null,
      description: form.description || null,
      categoryId:  form.categoryId  || null,
      brandId:     form.brandId     || null,
    };
    try {
      if (isEdit && product) {
        await update.mutateAsync({ id: product.id, body: payload });
      } else {
        await create.mutateAsync(payload);
      }
      router.push('/erp/products');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Save failed';
      setError(msg);
    }
  }

  async function onDelete() {
    if (!product) return;
    if (!confirm(`Delete "${product.name}"?`)) return;
    await del.mutateAsync(product.id);
    router.push('/erp/products');
  }

  const margin = form.sellingPrice > 0
    ? Math.round(((form.sellingPrice - form.costPrice) / form.sellingPrice) * 100)
    : 0;

  return (
    <ErpPage
      kicker={isEdit ? 'Edit product' : 'New product'}
      title={isEdit ? (product?.name ?? 'Product') : 'Add a product'}
      description={isEdit ? `SKU ${product?.sku}` : 'Create a new SKU in your catalog.'}
      actions={
        <Link href="/erp/products" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* MAIN */}
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">BASICS</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU" required>
                <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Barcode">
                <input value={form.barcode ?? ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Product name" required className="sm:col-span-2">
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">PRICING &amp; VAT</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Cost (AED)">
                <input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Selling (AED)">
                <input type="number" step="0.01" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="VAT %" hint="UAE default 5%">
                <input type="number" step="0.01" min="0" max="100" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Margin">
                <input disabled value={`${margin}%`} className={`${inputCls} font-mono`} />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">STOCK</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Unit">
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls}>
                  {['PCS','BOX','SET','KG','M','BAG','PR','PAIR','PKT','ROLL'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Reorder level" hint="Trigger low-stock alert below">
                <input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} className={inputCls} />
              </Field>
              <Field label="Status">
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                  Active &amp; sellable
                </label>
              </Field>
            </div>
          </Card>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg tracking-widest text-ink-900">CLASSIFICATION</h2>
            <div className="space-y-4">
              <Field label="Category">
                <select value={form.categoryId ?? ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
                  <option value="">— None —</option>
                  {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Brand">
                <select value={form.brandId ?? ''} onChange={(e) => setForm({ ...form, brandId: e.target.value })} className={inputCls}>
                  <option value="">— None —</option>
                  {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <p className="text-xs text-ink-500">Categories &amp; brands can be created from the catalog admin (Phase 2 polish).</p>
            </div>
          </Card>

          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={create.isPending || update.isPending || !can(isEdit ? 'product.write' : 'product.write')}
              className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-5 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400 disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {isEdit ? 'Save changes' : 'Create product'}
            </button>
            {isEdit && can('product.delete') && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-red-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete product
              </button>
            )}
          </div>
        </div>
      </form>
    </ErpPage>
  );
}
