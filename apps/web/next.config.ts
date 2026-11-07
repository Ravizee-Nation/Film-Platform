import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@film/contracts', '@film/ui'],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default config;
