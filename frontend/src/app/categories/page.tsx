import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, Wrench, Zap, Ruler, PackageOpen, Factory, HardHat, PaintBucket, Anchor,
} from 'lucide-react';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHero } from '@/components/site/PageHero';
import { Reveal } from '@/components/site/Reveal';
import { CATEGORIES } from '@/lib/catalog-data';

export const metadata: Metadata = {
  title: 'Catalogue — Hand Tools, Power Tools, Industrial Equipment',
  description: 'Browse Masoom Hardware categories: hand tools, power tools, measuring, storage, industrial equipment, safety PPE, paint and fasteners.',
};

const ICONS = {
  hand: Wrench, power: Zap, measure: Ruler, storage: PackageOpen,
  industrial: Factory, safety: HardHat, paint: PaintBucket, fasteners: Anchor,
} as const;

export default function CategoriesPage() {
  return (
    <SiteShell>
      <PageHero
        kicker="Catalogue"
        title="CATEGORIES"
        description="Eight curated departments — over 6,000 active SKUs from the brands UAE professionals already trust."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Catalogue' }]}
      />

      <section className="container-page py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => {
            const Icon = ICONS[c.icon];
            return (
              <Reveal key={c.slug} delay={i * 0.06}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-ink-100 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-500 hover:shadow-yellow"
                >
                  <div className="caution-stripe absolute inset-x-0 top-0 opacity-0 transition group-hover:opacity-100" />
                  <div className="grid h-14 w-14 place-items-center rounded-sm bg-brand-500/10 text-brand-600 transition-all duration-300 group-hover:rotate-6 group-hover:bg-brand-500 group-hover:text-ink-950">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h2 className="mt-6 font-display text-3xl tracking-wide text-ink-900">{c.name}</h2>
                  <p className="mt-2 text-sm text-ink-600">{c.description}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-ink-100 pt-5">
                    <span className="text-xs font-bold uppercase tracking-widest text-ink-500">
                      ~{c.itemsApprox.toLocaleString()} SKUs
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-brand-600">
                      Browse <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
