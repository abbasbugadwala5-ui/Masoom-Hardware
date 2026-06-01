'use client';

import { useState } from 'react';
import Link from 'next/link';
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace('/erp');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Login failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
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
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-500 hover:text-brand-600 lg:hidden">
            ← Back to site
          </Link>

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

            <button
              type="submit"
              disabled={submitting}
              className="btn-shimmer inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand-500 px-4 py-3 text-sm font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-500">
            Not a trade customer yet? <Link href="/rfq" className="font-bold text-brand-600 hover:text-brand-500">Open an account →</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
