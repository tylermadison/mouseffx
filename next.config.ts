import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next dev` otherwise writes AGENTS.md and CLAUDE.md to the project root.
  agentRules: false,
  // Do not send the X-Powered-By: Next.js response header.
  poweredByHeader: false,
  // The docs content is MDX.
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
};

// No remark or rehype plugins: the docs components do those jobs.
const withMDX = createMDX({});

export default withMDX(nextConfig);
