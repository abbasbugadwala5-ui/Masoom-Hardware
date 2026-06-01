'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, Phone, Search, ShoppingBag, User, X } from 'lucide-react';
import { Logo } from './Logo';
import { CATEGORIES } from '@/lib/catalog-data';
import { COMPANY } from '@/lib/company';

const NAV = [
  { href: '/',           label: 'Home' },
  { href: '/about',      label: 'About Us' },
  { href: '/products',   label: 'Products', hasDropdown: true },
  { href: '/brands',     label: 'Brands' },
  { href: '/categories', label: 'Catalogue' },
  { href: '/rfq',        label: 'RFQ' },
  { href: '/contact',    label: 'Contact Us' },
];

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (cat) params.set('category', cat);
    router.push(`/products${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <motion.header
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 0.7, 0.2, 1] }}
      className={`sticky top-0 z-50 bg-white transition-shadow ${scrolled ? 'shadow-soft' : ''}`}
    >
      {/* TOP BAR — logo / search / branches / icons */}
      <div className="border-b border-ink-100">
        <div className="container-page flex items-center justify-between gap-6 py-3 md:py-4">
          <Logo />

          {/* Search */}
          <form
            onSubmit={onSearch}
            className="hidden flex-1 max-w-xl items-center rounded-sm border border-ink-200 bg-white transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30 md:flex"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for products, brands…"
              className="flex-1 bg-transparent px-4 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-400"
            />
            <div className="hidden h-7 w-px bg-ink-200 lg:block" />
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="hidden bg-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-600 outline-none lg:block"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <button
              type="submit"
              aria-label="Search"
              className="grid h-10 w-12 place-items-center bg-brand-500 text-ink-950 transition hover:bg-brand-400"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* Branches + icons */}
          <div className="hidden items-center gap-6 lg:flex">
            <BranchInfo title={COMPANY.branches.dubai.label}   phone={COMPANY.branches.dubai.tel} />
            <BranchInfo title={COMPANY.branches.sharjah.label} phone={COMPANY.branches.sharjah.tel} />
            <div className="flex items-center gap-1.5">
              <IconBtn ariaLabel="Cart"><ShoppingBag className="h-4 w-4" /></IconBtn>
              <Link href="/erp/login" aria-label="Account" className="grid h-9 w-9 place-items-center rounded-sm border border-ink-200 text-ink-700 transition hover:border-brand-500 hover:text-brand-600">
                <User className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Mobile menu */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="grid h-10 w-10 place-items-center rounded-sm border border-ink-200 text-ink-900 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* BOTTOM BAR — nav + ERP CTA */}
      <div className="border-b border-ink-100">
        <div className="container-page flex items-center justify-between">
          <nav className="hidden gap-1 lg:flex">
            {NAV.map((n) => {
              const active = pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`relative px-4 py-4 text-[12.5px] font-bold uppercase tracking-wider transition-colors ${
                    active ? 'text-ink-950' : 'text-ink-600 hover:text-ink-950'
                  }`}
                >
                  {n.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-px h-[3px] bg-brand-500"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/erp/login"
            className="btn-shimmer inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-950 shadow-yellow transition hover:bg-brand-400"
          >
            ERP Login <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-ink-100 bg-white lg:hidden"
          >
            <div className="container-page py-4">
              <form onSubmit={onSearch} className="flex items-center rounded-sm border border-ink-200">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products…"
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                />
                <button className="grid h-10 w-11 place-items-center bg-brand-500 text-ink-950">
                  <Search className="h-4 w-4" />
                </button>
              </form>

              <nav className="mt-2 flex flex-col">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-ink-100 py-3 text-sm font-bold uppercase tracking-wider text-ink-800"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <BranchInfo title="Dubai"   phone={COMPANY.branches.dubai.tel} />
                <BranchInfo title="Sharjah" phone={COMPANY.branches.sharjah.tel} />
              </div>

              <Link
                href="/erp/login"
                onClick={() => setOpen(false)}
                className="mt-4 block rounded-sm bg-brand-500 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-ink-950"
              >
                ERP Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function BranchInfo({ title, phone }: { title: string; phone: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-sm bg-brand-500/15 text-brand-600">
        <Phone className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{title}</div>
        <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-sm font-bold text-ink-900 hover:text-brand-600">
          {phone}
        </a>
      </div>
    </div>
  );
}

function IconBtn({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
  return (
    <button
      aria-label={ariaLabel}
      className="grid h-9 w-9 place-items-center rounded-sm border border-ink-200 text-ink-700 transition hover:border-brand-500 hover:text-brand-600"
    >
      {children}
    </button>
  );
}
