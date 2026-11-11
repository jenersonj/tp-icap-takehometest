import path from 'node:path';

import type { NextConfig } from 'next';

// Next.js is the web shell only (decision 13): it never calls the service or RabbitMQ.
// These rewrites give the browser one origin, so the httpOnly auth cookies reach the API
// and the socket connects through the same host. Rewrites are resolved at build time, so
// the Docker build passes API_INTERNAL_URL / REALTIME_INTERNAL_URL as build args.
const API_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:3000';
const REALTIME_URL = process.env.REALTIME_INTERNAL_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Trace workspace packages from the monorepo root into the standalone build.
  outputFileTracingRoot: path.join(__dirname, '..'),
  reactStrictMode: true,
  transpilePackages: ['@blotter/contracts'],
  poweredByHeader: false,
  // Socket.IO requests /socket.io/?EIO=4...; the default trailing-slash redirect would break it.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      // Socket.IO's endpoint is /socket.io/ with the trailing slash, which :path* would drop.
      { source: '/socket.io/', destination: `${REALTIME_URL}/socket.io/` },
      { source: '/socket.io/:path+', destination: `${REALTIME_URL}/socket.io/:path+` },
    ];
  },
};

export default nextConfig;
