import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next dev` otherwise writes AGENTS.md and CLAUDE.md to the project root.
  agentRules: false,
  // Do not send the X-Powered-By: Next.js response header.
  poweredByHeader: false,
};

export default nextConfig;
