import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHero } from '@/components/site/PageHero';
import { ProductsClient } from './products-client';

export const metadata: Metadata = {
  title: 'Products — Industrial Tools & Hardware Catalogue',
  description:
    'Browse Masoom Hardware products: Stanley, Bosch, Makita, DeWalt power tools, hand tools, measuring instruments, safety PPE and more.',
};

export default function ProductsPage() {
  return (
    <SiteShell>
      <PageHero
        kicker="Catalogue"
        title="PRODUCTS"
        description="A curated slice of our 10,000+ active SKUs. Filter by category or brand on the left."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Products' }]}
      />
      <Suspense fallback={<div className="container-page py-12 text-sm text-ink-500">Loading catalogue…</div>}>
        <ProductsClient />
      </Suspense>
    </SiteShell>
  );
}
