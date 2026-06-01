'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, LayoutGrid, List, Search } from 'lucide-react';
import { ProductCard } from '@/components/site/ProductCard';
import { ALL_PRODUCTS, BRANDS, CATEGORIES } from '@/lib/catalog-data';

export function ProductsClient() {
  const params = useSearchParams();
  const initialBrand    = params.get('brand')    ?? '';
  const initialCategory = params.get('category') ?? '';
  const initialQ        = params.get('q')        ?? '';

  const [q,        setQ]        = useState(initialQ);
  const [brand,    setBrand]    = useState(initialBrand);
  const [category, setCategory] = useState(initialCategory);
  const [sort,     setSort]     = useState<'popularity' | 'name-asc' | 'sku'>('popularity');
  const [view,     setView]     = useState<'grid' | 'list'>('grid');

  useEffect(() => { setCategory(params.get('category') ?? ''); }, [params]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = ALL_PRODUCTS.filter((p) => {
      if (brand && p.brandSlug !== brand) return false;
      if (category && p.categorySlug !== category) return false;
      if (needle && !(`${p.name} ${p.sku}`.toLowerCase().includes(needle))) return false;
      return true;
    });
    if (sort === 'name-asc') out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'sku')      out = [...out].sort((a, b) => a.sku.localeCompare(b.sku));
    return out;
  }, [q, brand, category, sort]);

  return (
    <section className="container-page py-12">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* SIDEBAR */}
        <aside className="space-y-6">
          {/* Search */}
          <div className="rounded-sm border border-ink-100 bg-white p-4 shadow-sm">
            <label className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search SKU or name…"
                className="w-full rounded-sm border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </label>
          </div>

          {/* Categories list */}
          <div className="overflow-hidden rounded-sm border border-ink-100 bg-white shadow-sm">
            <div className="border-b border-ink-100 bg-ink-50 px-4 py-3">
              <h3 className="font-display text-lg tracking-widest text-ink-900">CATEGORIES</h3>
            </div>
            <ul>
              <li>
                <button
                  onClick={() => setCategory('')}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition ${
                    category === '' ? 'bg-brand-500 text-ink-950' : 'text-ink-700 hover:bg-ink-50'
                  }`}
                >
                  All categories <ChevronRight className="h-4 w-4" />
                </button>
              </li>
              {CATEGORIES.map((c) => {
                const active = category === c.slug;
                return (
                  <li key={c.slug} className="border-t border-ink-100">
                    <button
                      onClick={() => setCategory(c.slug)}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition ${
                        active ? 'bg-brand-500 text-ink-950' : 'text-ink-700 hover:bg-ink-50'
                      }`}
                    >
                      {c.name} <ChevronRight className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Brand filter */}
          <div className="overflow-hidden rounded-sm border border-ink-100 bg-white shadow-sm">
            <div className="border-b border-ink-100 bg-ink-50 px-4 py-3">
              <h3 className="font-display text-lg tracking-widest text-ink-900">BRANDS</h3>
            </div>
            <ul className="p-2">
              {[{ slug: '', name: 'All brands' }, ...BRANDS].map((b) => (
                <li key={b.slug || 'all'}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-ink-700 hover:bg-ink-50">
                    <input
                      type="radio"
                      name="brand-filter"
                      checked={brand === b.slug}
                      onChange={() => setBrand(b.slug)}
                      className="h-4 w-4 accent-brand-500"
                    />
                    {b.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {(brand || category || q) && (
            <button
              onClick={() => { setBrand(''); setCategory(''); setQ(''); }}
              className="w-full rounded-sm border border-ink-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-700 transition hover:border-brand-500 hover:text-brand-600"
            >
              Clear all filters
            </button>
          )}
        </aside>

        {/* RESULTS */}
        <div>
          <div className="flex flex-col items-start justify-between gap-3 rounded-sm border border-ink-100 bg-white p-4 shadow-sm md:flex-row md:items-center">
            <div className="text-sm text-ink-600">
              Showing <strong className="text-ink-900">{results.length}</strong> of {ALL_PRODUCTS.length} products
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-600">
                Sort by:
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="rounded-sm border border-ink-200 bg-white px-2 py-1.5 text-xs font-semibold text-ink-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="popularity">Popularity</option>
                  <option value="name-asc">Name (A–Z)</option>
                  <option value="sku">SKU</option>
                </select>
              </label>
              <div className="flex items-center rounded-sm border border-ink-200">
                <button
                  aria-label="Grid view"
                  onClick={() => setView('grid')}
                  className={`grid h-8 w-8 place-items-center ${view === 'grid' ? 'bg-brand-500 text-ink-950' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label="List view"
                  onClick={() => setView('list')}
                  className={`grid h-8 w-8 place-items-center ${view === 'list' ? 'bg-brand-500 text-ink-950' : 'text-ink-600 hover:text-ink-900'}`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="mt-6 rounded-sm border border-ink-100 bg-white p-10 text-center shadow-sm">
              <p className="text-ink-600">No products match those filters.</p>
              <a
                href="/rfq"
                className="mt-4 inline-block rounded-sm bg-brand-500 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-950"
              >
                Request a quote for what you need
              </a>
            </div>
          ) : (
            <motion.div
              key={`${view}-${results.length}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={
                view === 'grid'
                  ? 'mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'mt-6 flex flex-col gap-3'
              }
            >
              {view === 'grid'
                ? results.map((p) => <ProductCard key={p.sku} p={p} />)
                : results.map((p) => <ProductListRow key={p.sku} p={p} />)}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProductListRow({ p }: { p: { sku: string; name: string; brandSlug: string; categorySlug: string; unit: string; highlight?: string } }) {
  const brand = BRANDS.find((b) => b.slug === p.brandSlug);
  const category = CATEGORIES.find((c) => c.slug === p.categorySlug);

  return (
    <div className="flex items-center gap-4 rounded-sm border border-ink-100 bg-white p-4 shadow-sm transition hover:border-brand-500">
      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-sm bg-ink-50 font-display text-2xl tracking-widest text-ink-300">
        {brand?.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-widest text-brand-600">{category?.name}</div>
        <div className="truncate font-display text-lg tracking-wide text-ink-900">{p.name}</div>
        <div className="text-xs text-ink-500">SKU: <span className="font-mono">{p.sku}</span> · {brand?.name} · {p.unit}</div>
      </div>
      <a
        href={`/rfq?sku=${encodeURIComponent(p.sku)}`}
        className="rounded-sm bg-brand-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400"
      >
        Inquire
      </a>
    </div>
  );
}
