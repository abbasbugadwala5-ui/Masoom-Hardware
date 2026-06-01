'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Crumb { label: string; href?: string }

export function PageHero({
  title,
  kicker,
  crumbs,
  description,
}: {
  title: string;
  kicker?: string;
  crumbs?: Crumb[];
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden banner-dark">
      {/* Subtle radial yellow shapes */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute -right-32 -top-24 h-[460px] w-[460px] rounded-full bg-brand-500/15 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-20 bottom-0 h-[320px] w-[320px] rounded-full bg-brand-500/10 blur-3xl"
      />

      <div className="container-page relative grid items-center gap-6 py-16 md:grid-cols-2 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {kicker && (
            <div className="inline-flex items-center gap-2 rounded-sm border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-brand-500">
              <span className="h-1 w-1 rounded-full bg-brand-500" /> {kicker}
            </div>
          )}
          <h1 className="mt-4 font-display text-5xl tracking-tight text-white md:text-7xl">
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300">{description}</p>
          )}
        </motion.div>

        {crumbs && crumbs.length > 0 && (
          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            aria-label="Breadcrumb"
            className="md:justify-self-end"
          >
            <ol className="inline-flex items-center gap-1 rounded-sm border border-white/10 bg-white/5 px-4 py-2 text-xs text-ink-300 backdrop-blur">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={i} className="flex items-center gap-1">
                    {c.href && !last ? (
                      <Link href={c.href} className="hover:text-brand-500">{c.label}</Link>
                    ) : (
                      <span className={last ? 'text-brand-500' : ''}>{c.label}</span>
                    )}
                    {!last && <ChevronRight className="h-3 w-3 text-ink-500" />}
                  </li>
                );
              })}
            </ol>
          </motion.nav>
        )}
      </div>

      <div className="caution-stripe" />
    </section>
  );
}
