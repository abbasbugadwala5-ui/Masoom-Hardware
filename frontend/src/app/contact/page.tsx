'use client';

import { useState } from 'react';
import { Clock, Instagram, Mail, MapPin, MessageCircle, Phone, Send, CheckCircle2 } from 'lucide-react';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHero } from '@/components/site/PageHero';
import { Reveal } from '@/components/site/Reveal';
import { COMPANY, WHATSAPP_INTL } from '@/lib/company';

const WHATSAPP = `https://wa.me/${WHATSAPP_INTL}`;
const MAP_QUERY = 'Masoom%20Hardware%20Deira%20Dubai';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <SiteShell>
      <PageHero
        kicker="Get in touch"
        title="CONTACT US"
        description="Drop into our Deira showroom, WhatsApp the sales desk, or send a note — we'll get back fast."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Contact Us' }]}
      />

      <section className="container-page py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* GET IN TOUCH */}
          <Reveal>
            <div>
              <h2 className="font-display text-3xl tracking-tight text-ink-900 md:text-4xl">GET IN TOUCH</h2>
              <p className="mt-2 text-sm text-ink-600">Two branches, one team — we&apos;re a call or message away.</p>

              <div className="mt-6 grid gap-4">
                <BranchCard
                  title={COMPANY.branches.dubai.label}
                  address={`${COMPANY.branches.dubai.address}, ${COMPANY.branches.dubai.city} · ${COMPANY.branches.dubai.poBox}`}
                  phone={COMPANY.branches.dubai.tel}
                  mob={COMPANY.branches.dubai.mob}
                  email={COMPANY.email}
                />
                <BranchCard
                  title={COMPANY.branches.sharjah.label}
                  address={`${COMPANY.branches.sharjah.address}, ${COMPANY.branches.sharjah.city} · ${COMPANY.branches.sharjah.poBox}`}
                  phone={COMPANY.branches.sharjah.tel}
                  mob={COMPANY.branches.sharjah.mob}
                  email={COMPANY.email}
                />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-brand-500 px-5 py-3 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp us
                </a>
                <a
                  href="https://instagram.com/masoomhardware"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-ink-200 px-5 py-3 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500 hover:text-brand-600"
                >
                  <Instagram className="h-4 w-4" /> @masoomhardware
                </a>
              </div>

              <div className="mt-6 overflow-hidden rounded-sm border border-ink-100 shadow-sm">
                <iframe
                  title="Map — Deira, Dubai"
                  src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`}
                  className="h-72 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-sm border border-ink-100 bg-white px-3 py-2 text-xs text-ink-600">
                <Clock className="h-3.5 w-3.5 text-brand-600" />
                Sat – Thu, 8:00 – 19:00 · Friday closed
              </div>
            </div>
          </Reveal>

          {/* SEND A MESSAGE */}
          <Reveal delay={0.1}>
            <div className="rounded-sm border border-ink-100 bg-white p-6 shadow-sm md:p-8">
              {submitted ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <CheckCircle2 className="mx-auto h-10 w-10 text-brand-500" />
                    <h3 className="mt-3 font-display text-3xl tracking-tight text-ink-900">MESSAGE SENT</h3>
                    <p className="mt-2 text-sm text-ink-600">We&apos;ll be in touch shortly.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <h2 className="font-display text-3xl tracking-tight text-ink-900">SEND US A MESSAGE</h2>
                    <p className="mt-1 text-sm text-ink-600">We&apos;ll reply within 1 business day.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Your Name *">
                      <input required value={form.name}    onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Your Email *">
                      <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Subject">
                    <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Your Message *">
                    <textarea required rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls} />
                  </Field>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-shimmer inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400 disabled:opacity-60"
                  >
                    {submitting ? 'Sending…' : (<>Send Message <Send className="h-4 w-4" /></>)}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

const inputCls =
  'w-full rounded-sm border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-700">{label}</span>
      {children}
    </label>
  );
}

function BranchCard({ title, address, phone, mob, email }: { title: string; address: string; phone: string; mob?: string; email: string }) {
  return (
    <div className="rounded-sm border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl tracking-tight text-ink-900">{title}</h3>
        <span className="chip">UAE</span>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-start gap-2 text-ink-700">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {address}
        </li>
        <li>
          <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-ink-700 hover:text-brand-600">
            <Phone className="h-4 w-4 text-brand-600" /> {phone}
          </a>
        </li>
        {mob && (
          <li>
            <a href={`tel:${mob.replace(/\s/g, '')}`} className="flex items-center gap-2 text-ink-700 hover:text-brand-600">
              <Phone className="h-4 w-4 text-brand-600" /> {mob} (Mobile)
            </a>
          </li>
        )}
        <li>
          <a href={`mailto:${email}`} className="flex items-center gap-2 text-ink-700 hover:text-brand-600">
            <Mail className="h-4 w-4 text-brand-600" /> {email}
          </a>
        </li>
      </ul>
    </div>
  );
}
