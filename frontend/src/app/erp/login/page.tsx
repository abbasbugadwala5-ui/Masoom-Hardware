'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Logo } from '@/components/site/Logo';

export default function ErpLoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);

  const [email, setEmail] = useState('admin@masoom.ae');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setStatus(null);

    // On Render's free tier the API sleeps after ~15 min idle and the first
    // request after that takes ~40s while it wakes. A cold start surfaces as a
    // timeout or a 502/503/504 from the proxy — NOT a real credential error — so
    // we retry a few times and only stop early on a genuine auth/rate-limit reply.
    const MAX_TRIES = 3;
    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      if (attempt > 1) setStatus('Server is waking up (~40s on first try)… retrying.');
      try {
        await login(email, password);
        router.replace('/erp');
        return;
      } catch (err: unknown) {
        const e = err as {
          response?: { status?: number; data?: { error?: { message?: string } } };
        };
        const httpStatus = e.response?.status;

        // Real auth failure or rate limit — no point retrying.
        if (httpStatus === 401 || httpStatus === 429) {
          setError(e.response?.data?.error?.message ?? 'Login failed');
          break;
        }
        // Cold start / network blip (timeout, 502/503/504) — retry until tries run out.
        if (attempt === MAX_TRIES) {
          setError('Server is not responding yet. Please wait a moment and try again.');
        }
      }
    }
    setStatus(null);
    setSubmitting(false);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left — dark brand panel */}
      <aside className="relative hidden overflow-hidden banner-dark lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo variant="light" />

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Client Portal</p>
          <h1 className="mt-3 font-display text-6xl leading-[0.95] tracking-tight text-white">
            INVOICES, <br /> ORDERS &amp; <br /> QUOTATIONS — <br /> <span className="text-brand-500">ONE LOGIN.</span>
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-300">
            FTA-compliant tax invoices with QR. Real-time stock visibility. Reorder past purchases
            in a single click.
          </p>
        </div>

        <div className="caution-stripe" />
      </aside>

      {/* Right — form */}
      <section className="flex flex-col justify-center bg-white px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">ERP Login</p>
          <h2 className="mt-2 font-display text-4xl tracking-tight text-ink-900">SIGN IN</h2>
          <p className="mt-1 text-sm text-ink-500">Enter your credentials to access the portal.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-sm border border-ink-100 bg-white p-6 shadow-soft">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-700">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-sm border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-700">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </label>

            {error && (
              <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {status && !error && (
              <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {status}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-shimmer inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand-500 px-4 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400 disabled:opacity-60"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {status ? 'Waking server…' : 'Signing in…'}</>
              ) : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
