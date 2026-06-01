'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Truck, Headphones, Boxes,
  Wrench, Zap, Ruler, PackageOpen, Factory, HardHat, PaintBucket, Anchor,
} from 'lucide-react';
import { SiteShell } from '@/components/site/SiteShell';
import { BrandsMarquee } from '@/components/site/BrandsMarquee';
import { ProductCard } from '@/components/site/ProductCard';
import { HeroDrill } from '@/components/site/HeroDrill';
import { Reveal, stagger, staggerItem } from '@/components/site/Reveal';
import { CATEGORIES, FEATURED_PRODUCTS } from '@/lib/catalog-data';

const CATEGORY_ICONS = {
  hand: Wrench, power: Zap, measure: Ruler, storage: PackageOpen,
  industrial: Factory, safety: HardHat, paint: PaintBucket, fasteners: Anchor,
} as const;

export default function HomePage() {
  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative isolate overflow-hidden banner-dark">
        <div className="container-page relative grid items-center gap-10 py-14 md:grid-cols-2 md:py-20 lg:py-24">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={staggerItem} className="inline-flex items-center gap-2 rounded-sm border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
              Welcome to Masoom Hardware
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="mt-6 font-display text-5xl leading-[0.92] tracking-tight text-white md:text-7xl lg:text-[5.5rem]"
            >
              PROFESSIONAL <br />
              <span className="text-brand-500 text-yellow-glow">HARDWARE SOLUTIONS</span>
            </motion.h1>

            <motion.p variants={staggerItem} className="mt-6 max-w-xl text-base leading-relaxed text-ink-300 md:text-lg">
              Your trusted partner for premium quality hardware, industrial tools and building
              materials across the UAE. Authorised dealer for Stanley, Bosch, Makita, DeWalt,
              Victor, Rasta and Success Tapes.
            </motion.p>

            <motion.div variants={staggerItem} className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="btn-shimmer group inline-flex items-center gap-2 rounded-sm bg-brand-500 px-7 py-4 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow transition hover:translate-y-[-2px] hover:bg-brand-400"
              >
                Explore Products <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/rfq"
                className="inline-flex items-center gap-2 rounded-sm border border-white/30 bg-white/5 px-7 py-4 text-sm font-bold uppercase tracking-widest text-white transition hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-500"
              >
                Request Quotation
              </Link>
            </motion.div>

            {/* Carousel indicator */}
            <motion.div variants={staggerItem} className="mt-12 flex items-center justify-between border-t border-white/10 pt-6">
              <div className="flex items-baseline gap-2 font-display text-2xl tracking-tight text-white">
                <span className="text-brand-500">01</span>
                <span className="text-ink-500">/ 03</span>
              </div>
              <div className="flex items-center gap-2">
                <button aria-label="Previous slide" className="grid h-10 w-10 place-items-center rounded-sm border border-white/20 text-white transition hover:border-brand-500 hover:text-brand-500">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button aria-label="Next slide" className="grid h-10 w-10 place-items-center rounded-sm border border-white/20 text-white transition hover:border-brand-500 hover:text-brand-500">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>

          <div className="relative h-[420px] md:h-[480px] lg:h-[540px]">
            <HeroDrill />
          </div>
        </div>

        {/* 4-up feature strip */}
        <div className="border-t border-white/10 bg-black/40 backdrop-blur">
          <div className="container-page grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
            {[
              { i: Boxes,       t: 'Wide Range',     d: '10,000+ Premium Products' },
              { i: Truck,       t: 'Fast Delivery',  d: 'Across UAE' },
              { i: ShieldCheck, t: 'Best Quality',   d: '100% Genuine Products' },
              { i: Headphones,  t: 'Expert Support', d: '24/7 Customer Service' },
            ].map((f, i) => (
              <motion.div
                key={f.t}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-sm bg-brand-500/15 text-brand-500">
                  <f.i className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold uppercase tracking-wider text-white">{f.t}</div>
                  <div className="text-xs text-ink-400">{f.d}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <BrandsMarquee />

      {/* CATEGORIES */}
      <section className="container-page py-20">
        <Reveal>
          <SectionHeading kicker="Shop by category" title="What we supply" />
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.icon];
            return (
              <motion.div key={c.slug} variants={staggerItem}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className="group relative block h-full overflow-hidden rounded-sm border border-ink-100 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-500 hover:shadow-yellow"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-sm bg-brand-500/10 text-brand-600 transition-all duration-300 group-hover:rotate-6 group-hover:bg-brand-500 group-hover:text-ink-950">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-2xl tracking-wide text-ink-900">{c.name}</h3>
                  <p className="mt-2 text-sm text-ink-600">{c.description}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 text-xs">
                    <span className="text-ink-400">~{c.itemsApprox.toLocaleString()} SKUs</span>
                    <span className="inline-flex items-center gap-1 font-bold uppercase tracking-widest text-brand-600">
                      Browse <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="border-y border-ink-100 bg-ink-50">
        <div className="container-page py-20">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <SectionHeading kicker="In demand this week" title="Featured products" />
              <Link
                href="/products"
                className="link-underline inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-brand-600"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {FEATURED_PRODUCTS.slice(0, 8).map((p) => (
              <motion.div key={p.sku} variants={staggerItem}>
                <ProductCard p={p} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* WHY US */}
      <section className="container-page py-20">
        <Reveal>
          <SectionHeading kicker="Why Masoom" title="The contractor's first call" />
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { i: Truck,        t: 'Same-day UAE delivery', d: 'Order before 1 pm and we dispatch the same day across all seven emirates.' },
            { i: Boxes,        t: 'Bulk orders',           d: 'Project pricing, staged dispatch and dedicated account support for large orders.' },
            { i: ShieldCheck,  t: 'Genuine products',      d: 'Authorised channel for Stanley, Bosch, Makita, DeWalt — full manufacturer warranty.' },
            { i: Headphones,   t: 'Professional support',  d: 'Technical advisors who know the difference between SDS-Plus and SDS-Max.' },
          ].map((b) => (
            <motion.div
              key={b.t}
              variants={staggerItem}
              className="group relative overflow-hidden rounded-sm border border-ink-100 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-500 hover:shadow-yellow"
            >
              <div className="caution-stripe absolute inset-x-0 top-0 opacity-0 transition group-hover:opacity-100" />
              <b.i className="mt-3 h-8 w-8 text-brand-600 transition group-hover:scale-110" />
              <h3 className="mt-4 font-display text-xl tracking-wide text-ink-900">{b.t}</h3>
              <p className="mt-2 text-sm text-ink-600">{b.d}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ERP CTA */}
      <section className="container-page pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-sm bg-ink-950 p-10 md:p-14">
            <div className="caution-stripe absolute inset-x-0 top-0" />
            <motion.div
              aria-hidden
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-brand-500/15 blur-3xl"
            />
            <div className="relative grid items-center gap-8 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Client portal</p>
                <h2 className="mt-3 font-display text-4xl tracking-tight text-white md:text-6xl">
                  YOUR INVOICES, <br /> ORDERS &amp; QUOTATIONS <br />
                  <span className="text-brand-500">ONE LOGIN.</span>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-300">
                  Approved trade customers log in to view live invoices, download FTA-compliant
                  tax PDFs, track deliveries and reorder past purchases in a click.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <Link
                  href="/erp/login"
                  className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-7 py-4 text-sm font-bold uppercase tracking-widest text-ink-950 shadow-yellow transition hover:translate-y-[-2px] hover:bg-brand-400"
                >
                  ERP Login <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/rfq" className="link-underline text-xs font-bold uppercase tracking-widest text-ink-300">
                  Open a trade account →
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </SiteShell>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <div className="inline-flex items-center gap-3">
        <span className="h-px w-10 bg-brand-500" />
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{kicker}</p>
      </div>
      <h2 className="mt-3 font-display text-4xl tracking-tight text-ink-900 md:text-5xl">{title}</h2>
    </div>
  );
}
