import type { Metadata } from 'next';
import { Inter, Archivo, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import '../styles/globals.css';

/**
 * Professional pairing — Inter (body) + Archivo (display) + JetBrains Mono (code).
 *  - Inter is the SaaS standard (Linear, Vercel, Stripe, Notion).
 *  - Archivo gives strong industrial display weight without Anton's brutalism.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800', '900'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Masoom Hardware — Industrial Tools & Building Materials Supplier in UAE',
    template: '%s · Masoom Hardware',
  },
  description:
    'Masoom Hardware — Deira, Dubai. Authorised supplier of Stanley, Bosch, Makita, DeWalt, Victor, Rasta and Success Tapes. Industrial tools, building materials and hardware across the UAE since 2003.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-white font-sans text-ink-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
