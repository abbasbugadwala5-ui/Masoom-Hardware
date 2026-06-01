'use client';

import { motion } from 'framer-motion';
import { BRANDS } from '@/lib/catalog-data';

export function BrandsMarquee() {
  const row = [...BRANDS, ...BRANDS, ...BRANDS];

  return (
    <section className="relative border-y border-ink-100 bg-white">
      <div className="container-page py-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-ink-500"
        >
          <span className="text-brand-500">★</span> Authorised dealer for the brands UAE professionals trust <span className="text-brand-500">★</span>
        </motion.p>

        <div className="relative overflow-hidden">
          <div className="flex w-max animate-marquee gap-16">
            {row.map((b, i) => (
              <div key={i} className="flex shrink-0 items-center justify-center px-2">
                <span className="font-display text-4xl tracking-widest text-ink-400 transition-colors duration-300 hover:text-brand-600 md:text-5xl">
                  {b.name.toUpperCase()}
                </span>
                <span className="ml-16 h-2 w-2 rotate-45 bg-brand-500" />
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>
    </section>
  );
}
