'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, MessageCircle, Send } from 'lucide-react';

const WHATSAPP = 'https://wa.me/971500000000';

export function RfqClient() {
  const params = useSearchParams();
  const prefSku   = params.get('sku')   ?? '';
  const prefBrand = params.get('brand') ?? '';

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '', company: '', trn: '', email: '', phone: '',
    items: prefSku ? `${prefSku} — qty: ` : prefBrand ? `Looking for ${prefBrand} products — ` : '',
    notes: '',
  });

  useEffect(() => {
    if (prefSku && !form.items.includes(prefSku)) {
      setForm((f) => ({ ...f, items: `${prefSku} — qty: \n${f.items}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefSku]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="container-page grid min-h-[60vh] place-items-center py-20">
        <div className="max-w-md rounded-sm border border-ink-100 bg-white p-10 text-center shadow-soft">
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand-500" />
          <h1 className="mt-5 font-display text-4xl tracking-tight text-ink-900">REQUEST RECEIVED</h1>
          <p className="mt-3 text-ink-600">
            Thanks {form.name.split(' ')[0]}. A sales rep will get back to you within one business day
            with pricing and stock availability.
          </p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-sm border border-ink-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-700 hover:border-brand-500 hover:text-brand-600"
          >
            <MessageCircle className="h-4 w-4" /> Reach us on WhatsApp
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page py-14">
      <form
        onSubmit={onSubmit}
        className="grid gap-6 rounded-sm border border-ink-100 bg-white p-6 shadow-soft md:p-10 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name *">
              <input required value={form.name}    onChange={(e) => setForm({ ...form, name: e.target.value })}    className={inputCls} />
            </Field>
            <Field label="Company">
              <input value={form.company}          onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Email *">
              <input required type="email" value={form.email}   onChange={(e) => setForm({ ...form, email: e.target.value })}   className={inputCls} />
            </Field>
            <Field label="Phone / WhatsApp *">
              <input required value={form.phone}   onChange={(e) => setForm({ ...form, phone: e.target.value })}   className={inputCls} placeholder="+971…" />
            </Field>
            <Field label="TRN (if any)">
              <input value={form.trn}              onChange={(e) => setForm({ ...form, trn: e.target.value })}     className={inputCls} placeholder="15-digit TRN" />
            </Field>
          </div>

          <Field label="What do you need? *">
            <textarea
              required
              rows={6}
              value={form.items}
              onChange={(e) => setForm({ ...form, items: e.target.value })}
              className={`${inputCls} font-mono text-sm`}
              placeholder={'SKU or product name — qty\nSKU or product name — qty\n…'}
            />
          </Field>

          <Field label="Notes / delivery requirements">
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="btn-shimmer inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand-500 px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400 disabled:opacity-60 sm:w-auto"
          >
            {submitting ? 'Submitting…' : (<>Submit RFQ <Send className="h-4 w-4" /></>)}
          </button>
        </div>

        <aside className="rounded-sm bg-ink-950 p-6 text-ink-200">
          <div className="caution-stripe mb-5" />
          <h3 className="font-display text-xl tracking-widest text-brand-500">PREFER TO CHAT?</h3>
          <p className="mt-3 text-sm text-ink-300">
            For urgent enquiries, message us directly on WhatsApp — typical first response under 15 minutes during business hours.
          </p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand-500 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp us
          </a>
          <div className="mt-6 border-t border-white/10 pt-5 text-xs text-ink-400">
            <p>Hours: Sat–Thu, 8:00 – 19:00</p>
            <p className="mt-1">Friday: closed</p>
            <p className="mt-3 text-ink-300">Showroom &amp; counter sales:</p>
            <p className="mt-0.5 text-white">Deira, Dubai, UAE</p>
          </div>
        </aside>
      </form>
    </section>
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
