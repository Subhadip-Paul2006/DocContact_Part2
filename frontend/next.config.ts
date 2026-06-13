import type { NextConfig } from 'next';

const cspDirectives = [
    "default-src 'self'",
    // Next.js inline styles for SSR'd style attributes + the SVG
    // gradients used on auth pages.
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
    "img-src 'self' data: https:",
    // The SSE /api/queue/stream endpoint and any other same-origin
    // API calls; allow wss for stream upgrades if proxied.
    "connect-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
].join('; ');

const securityHeaders = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'Content-Security-Policy', value: cspDirectives },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma + bcryptjs are native modules that must stay on the Node server,
  // never bundled into the edge runtime.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'bcryptjs'],
  // The repo has lockfiles at the root and in `frontend/`. Tell Turbopack
  // explicitly that the frontend subtree is the workspace root.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
