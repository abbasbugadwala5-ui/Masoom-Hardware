import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, Hammer, Truck, Users } from 'lucide-react';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHero } from '@/components/site/PageHero';
import { BrandsMarquee } from '@/components/site/BrandsMarquee';
import { Reveal } from '@/components/site/Reveal';

export const metadata: Metadata = {
  title: 'About — Industrial Hardware Supplier in Deira, Dubai',
  description:
    'Masoom Hardware has supplied industrial tools, building materials and safety equipment from Deira, Dubai since 2003.',
};

export default function AboutPage() {
  return (
    <SiteShell>
      <PageHero
        kicker="About us"
        title="ABOUT US"
        description="22 years equipping the UAE's professionals — from a single Deira storefront to one of the most relied-upon names in industrial hardware."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About Us' }]}
      />

      <section className="container-page py-20">
        <div className="grid items-start gap-12 md:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-4xl tracking-tight text-ink-900 md:text-5xl">
              YOUR TRUSTED <span className="text-brand-600">HARDWARE PARTNER</span>
            </h2>
            <p className="mt-6 leading-relaxed text-ink-700">
              Masoom Hardware opened its doors in <strong>Deira, Dubai in 2003</strong> — a small
              counter-service shop stocking the hand tools and tape measures that local contractors
              needed yesterday. Two decades on, we operate stocked warehouses, a dedicated delivery
              fleet, and a trade-account network that spans every emirate.
            </p>
            <p className="mt-4 leading-relaxed text-ink-700">
              What hasn&apos;t changed: a fanatical focus on stocking what works. Every brand we
              carry has earned its place on a real jobsite.
            </p>

            <ul className="mt-8 grid grid-cols-2 gap-4">
              {[
                { n: '22+',     l: 'Years experience' },
                { n: '10,000+', l: 'Products' },
                { n: '5000+',   l: 'Happy clients' },
                { n: '7',       l: 'Emirates served' },
              ].map((s) => (
                <li key={s.l} className="rounded-sm border border-ink-100 bg-white p-4 shadow-sm">
                  <div className="font-display text-3xl tracking-tight text-brand-600">{s.n}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-widest text-ink-500">{s.l}</div>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link
                href="/contact"
                className="btn-shimmer inline-flex items-center gap-2 rounded-sm bg-brand-500 px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow hover:bg-brand-400"
              >
                Contact us <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          {/* Stylised showroom card */}
          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-sm border border-ink-100 bg-gradient-to-br from-ink-900 to-ink-950 p-8 shadow-soft">
              <div className="caution-stripe absolute inset-x-0 top-0" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-sm border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-500">
                  Deira showroom
                </div>
                <div className="mt-6 font-display text-5xl tracking-tight text-white md:text-6xl">
                  MASOOM<br/>HARDWARE
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-300">
                  Walk-in counter sales, trade desk and same-day pickup at our Deira showroom.
                  Project teams welcome — bring your BOM, walk out with the gear.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                  {[
                    { l: 'Hours',     v: 'Sat–Thu, 8–7' },
                    { l: 'Pickup',    v: 'Same-day' },
                    { l: 'Trade',     v: 'Credit accounts' },
                    { l: 'Languages', v: 'EN · AR · HI · UR' },
                  ].map((kv) => (
                    <div key={kv.l} className="rounded-sm border border-white/10 bg-white/5 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-brand-500">{kv.l}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{kv.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <BrandsMarquee />

      <section className="container-page py-20">
        <Reveal>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">What we do</p>
            <h2 className="mt-3 font-display text-4xl tracking-tight text-ink-900 md:text-5xl">FULL-STACK HARDWARE PARTNER</h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: Hammer,    t: 'Industrial hardware', d: 'Hand tools, power tools, measuring, fasteners, abrasives, paint & finishing.' },
            { i: Building2, t: 'Building materials',  d: 'Site essentials for MEP, fit-out, fabrication and facility maintenance.' },
            { i: Users,     t: 'Trade accounts',      d: 'Credit terms, dedicated reps and project-staged dispatch for contractors.' },
            { i: Truck,     t: 'UAE-wide delivery',   d: 'Same-day Dubai dispatch, next-day across the other six emirates.' },
          ].map((b, i) => (
            <Reveal key={b.t} delay={i * 0.08}>
              <div className="group h-full rounded-sm border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-500 hover:shadow-yellow">
                <div className="grid h-12 w-12 place-items-center rounded-sm bg-brand-500/10 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-ink-950">
                  <b.i className="h-5 w-5" />
                </div>
                <div className="mt-5 font-display text-xl tracking-wide text-ink-900">{b.t}</div>
                <p className="mt-2 text-sm text-ink-600">{b.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
