import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    // Proxy /api/* to the backend. NEXT_PUBLIC_API_URL may be a bare host
    // (e.g. Render's fromService value) — normalise to an https URL.
    const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const api = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
    ];
  },
};

export default config;
