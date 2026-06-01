import Link from 'next/link';
import { Instagram, Mail, MapPin, Phone, Send } from 'lucide-react';
import { Logo } from './Logo';
import { COMPANY } from '@/lib/company';

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink-950 text-ink-200">
      <div className="caution-stripe" />

      {/* Newsletter / contact strip */}
      <div className="border-b border-ink-800">
        <div className="container-page grid gap-6 py-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Stay stocked</p>
            <h3 className="mt-2 font-display text-3xl tracking-tight text-white md:text-4xl">
              JOBSITE UPDATES, NEW PRODUCT DROPS, TRADE OFFERS.
            </h3>
          </div>
          <form className="flex w-full max-w-md items-center rounded-sm border border-ink-700 bg-ink-900">
            <input
              type="email"
              placeholder="you@example.com"
              className="flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-ink-500"
            />
            <button className="inline-flex items-center gap-1.5 bg-brand-500 px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400">
              Subscribe <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo variant="light" />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-300">
            Industrial hardware, power tools and building materials supplier based in Deira, Dubai.
            Trusted by UAE contractors since 2003. Authorised dealer for Stanley, Bosch, Makita, DeWalt and more.
          </p>
          <a
            href="https://instagram.com/masoomhardware"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-sm border border-ink-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-200 hover:border-brand-500 hover:text-brand-500"
          >
            <Instagram className="h-4 w-4" /> @masoomhardware
          </a>
        </div>

        <div>
          <h4 className="font-display text-lg tracking-widest text-brand-500">EXPLORE</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-300">
            <li><Link href="/about"      className="hover:text-brand-500">About</Link></li>
            <li><Link href="/products"   className="hover:text-brand-500">Products</Link></li>
            <li><Link href="/categories" className="hover:text-brand-500">Catalogue</Link></li>
            <li><Link href="/brands"     className="hover:text-brand-500">Brands</Link></li>
            <li><Link href="/rfq"        className="hover:text-brand-500">Request a quote</Link></li>
            <li><Link href="/contact"    className="hover:text-brand-500">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg tracking-widest text-brand-500">BRANCHES</h4>
          <ul className="mt-4 space-y-3 text-sm text-ink-300">
            <li>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">{COMPANY.branches.dubai.label}</div>
              <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> {COMPANY.branches.dubai.address}, {COMPANY.branches.dubai.city}</div>
              <a href={`tel:${COMPANY.branches.dubai.tel.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-brand-500">
                <Phone className="h-3.5 w-3.5 text-brand-500" /> {COMPANY.branches.dubai.tel}
              </a>
            </li>
            <li>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">{COMPANY.branches.sharjah.label}</div>
              <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> {COMPANY.branches.sharjah.address}, {COMPANY.branches.sharjah.city}</div>
              <a href={`tel:${COMPANY.branches.sharjah.tel.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-brand-500">
                <Phone className="h-3.5 w-3.5 text-brand-500" /> {COMPANY.branches.sharjah.tel}
              </a>
            </li>
            <li>
              <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-1.5 hover:text-brand-500">
                <Mail className="h-3.5 w-3.5 text-brand-500" /> {COMPANY.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="container-page flex flex-col items-start justify-between gap-2 py-5 text-xs text-ink-400 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} {COMPANY.legalName} · TRN {COMPANY.trn} · Since 2003</div>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-brand-500">Privacy</Link>
            <Link href="/terms"   className="hover:text-brand-500">Terms</Link>
            <Link href="/erp/login" className="hover:text-brand-500">ERP Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
