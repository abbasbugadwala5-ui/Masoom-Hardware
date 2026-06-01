import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHero } from '@/components/site/PageHero';
import { RfqClient } from './rfq-client';

export const metadata: Metadata = {
  title: 'Request a Quotation — Bulk Order Pricing',
  description:
    'Request a quote from Masoom Hardware. Bulk pricing for contractors, project staging, trade accounts and same-day Dubai dispatch.',
};

export default function RfqPage() {
  return (
    <SiteShell>
      <PageHero
        kicker="Request for quote"
        title="REQUEST A QUOTE"
        description="Bulk orders, project pricing, or a single SKU you can't find — submit the form and a sales rep will reach out within 24 hours."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'RFQ' }]}
      />
      <Suspense fallback={<div className="container-page py-14 text-sm text-ink-500">Loading form…</div>}>
        <RfqClient />
      </Suspense>
    </SiteShell>
  );
}
