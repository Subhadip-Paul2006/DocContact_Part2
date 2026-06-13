import type { NextConfig } from 'next';

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
};

export default nextConfig;
