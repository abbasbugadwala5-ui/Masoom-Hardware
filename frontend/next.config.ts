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
  // /api/* is proxied to the backend at runtime by src/app/api/[...path]/route.ts
  // (next.config rewrites are build-time only, which breaks split-domain hosts).
};

export default config;
