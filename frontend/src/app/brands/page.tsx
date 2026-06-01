import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHero } from '@/components/site/PageHero';
import { Reveal } from '@/components/site/Reveal';
import { BRANDS, ALL_PRODUCTS } from '@/lib/catalog-data';

export const metadata: Metadata = {
  title: 'Our Brands — Stanley, Bosch, Makita, DeWalt, Victor, Rasta, Success Tapes',
  description:
    'Masoom Hardware is an authorised UAE dealer for Stanley, Bosch, Makita, DeWalt, Victor, Rasta and Success Tapes — genuine products, full manufacturer warranty.',
};

export default function BrandsPage() {
  return (
    <SiteShell>
      <PageHero
        kicker="Authorised dealer"
        title="OUR BRANDS"
        description="Every brand below is supplied through authorised UAE channels with full manufacturer warranty. No grey-market product, ever."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Our Brands' }]}
      />

      <section className="container-page py-16">
        {/* Brand tile grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BRANDS.map((b, i) => (
            <Reveal key={b.slug} delay={i * 0.05}>
              <Link
                href={`/products?brand=${b.slug}`}
                className="group flex h-44 flex-col justify-between rounded-sm border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-500 hover:shadow-yellow"
              >
                <div className="grid flex-1 place-items-center">
                  <span className="font-display text-5xl tracking-widest text-ink-900 transition-colors group-hover:text-brand-600 md:text-6xl">
                    {b.name.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-ink-500">
                    {b.tagline}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-brand-600">
                    View <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* Detail strip */}
        <div className="mt-16 grid gap-5 md:grid-cols-2">
          {BRANDS.map((b, i) => {
            const count = ALL_PRODUCTS.filter((p) => p.brandSlug === b.slug).length;
            return (
              <Reveal key={`row-${b.slug}`} delay={i * 0.04}>
                <div className="group flex items-start gap-4 rounded-sm border border-ink-100 bg-white p-6 shadow-sm transition hover:border-brand-500">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-sm bg-brand-500 font-display text-xl font-bold text-ink-950">
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-2xl tracking-tight text-ink-900">{b.name}</h3>
                      <span className="chip">{count} SKUs shown</span>
                    </div>
                    <p className="mt-2 text-sm text-ink-600">{b.blurb}</p>
                    <div className="mt-4 flex items-center gap-4">
                      <Link href={`/products?brand=${b.slug}`} className="link-underline text-xs font-bold uppercase tracking-widest text-brand-600">
                        View {b.name} products
                      </Link>
                      <Link href={`/rfq?brand=${b.slug}`} className="text-xs font-semibold uppercase tracking-widest text-ink-500 hover:text-brand-600">
                        Get a quote →
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
