import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@filoz/synapse-sdk', '@filoz/synapse-core'],
  async rewrites() {
    return [
      { source: '/.well-known/agent-card.json', destination: '/api/agent-card' },
    ];
  },
};

export default nextConfig;
