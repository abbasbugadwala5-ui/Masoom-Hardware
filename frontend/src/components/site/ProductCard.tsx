'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, MessageCircle, ShoppingCart, Star } from 'lucide-react';
import { findBrand, findCategory, type ProductData } from '@/lib/catalog-data';

/**
 * Deterministic pseudo-price by hashing SKU so cards always show the same number.
 * Range: AED 25 – AED 1,250 in clean increments of 5.
 */
function pseudoPriceAed(sku: string): number {
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  return 25 + (h % 246) * 5;
}

export function ProductCard({ p }: { p: ProductData }) {
  const brand    = findBrand(p.brandSlug);
  const category = findCategory(p.categorySlug);
  const price    = pseudoPriceAed(p.sku);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-ink-100 bg-white shadow-sm transition hover:border-brand-500 hover:shadow-yellow"
    >
      {/* Image area — light, with stylised brand letters in the centre */}
      <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-ink-50 to-white">
        <div className="absolute inset-0 grid place-items-center">
          <div className="font-display text-7xl tracking-widest text-ink-200 transition duration-500 group-hover:scale-105 group-hover:text-brand-500/70">
            {brand?.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Diagonal yellow accent that sweeps in */}
        <div className="absolute -right-10 -top-2 h-3 w-40 rotate-45 bg-brand-500/0 transition duration-500 group-hover:bg-brand-500" />

        {/* Top-left badge */}
        {p.highlight && (
          <span className="absolute left-3 top-3 rounded-sm bg-brand-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950 shadow-yellow">
            {p.highlight}
          </span>
        )}

        {/* Top-right brand chip */}
        <span className="absolute right-3 top-3 rounded-sm bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-700 ring-1 ring-ink-100">
          {brand?.name}
        </span>

        {/* Hover quick-actions */}
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <QuickAction label="Inquire"  href={`/rfq?sku=${encodeURIComponent(p.sku)}`} icon={<Eye className="h-4 w-4" />} />
          <QuickAction label="Cart"    icon={<ShoppingCart className="h-4 w-4" />} />
          <QuickAction
            label="WhatsApp"
            href={`https://wa.me/971500000000?text=${encodeURIComponent('Hi, I want to inquire about ' + p.sku + ' — ' + p.name)}`}
            external
            icon={<MessageCircle className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Text area */}
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">{category?.name}</div>
        <h3 className="mt-1 line-clamp-2 font-display text-lg leading-tight tracking-wide text-ink-900">
          {p.name}
        </h3>

        <div className="mt-1 flex items-center gap-1 text-xs text-ink-500">
          <Star className="h-3 w-3 fill-brand-500 text-brand-500" />
          <Star className="h-3 w-3 fill-brand-500 text-brand-500" />
          <Star className="h-3 w-3 fill-brand-500 text-brand-500" />
          <Star className="h-3 w-3 fill-brand-500 text-brand-500" />
          <Star className="h-3 w-3 fill-brand-500/40 text-brand-500" />
          <span className="ml-1 text-ink-400">(4.6)</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <div className="font-display text-2xl tracking-tight text-ink-950">
              AED {price.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-ink-500">/ {p.unit}</span>
            </div>
            <div className="text-[11px] font-mono text-ink-400">SKU: {p.sku}</div>
          </div>
          <Link
            href={`/rfq?sku=${encodeURIComponent(p.sku)}`}
            className="link-underline text-xs font-bold uppercase tracking-widest text-brand-600"
          >
            View
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function QuickAction({
  icon, label, href, external,
}: { icon: React.ReactNode; label: string; href?: string; external?: boolean }) {
  const cls =
    'inline-flex items-center justify-center gap-1 rounded-sm bg-ink-950 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-500 hover:text-ink-950';
  if (!href) return <button aria-label={label} className={cls}>{icon}</button>;
  if (external) return <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={cls}>{icon}</a>;
  return <Link href={href} aria-label={label} className={cls}>{icon}</Link>;
}
