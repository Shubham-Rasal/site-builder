import { NextResponse } from 'next/server';
import { COST_CONFIG } from '@/lib/config';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:5000';
  const receivingWallet = process.env.USDC_RECEIVING_WALLET_ADDRESS;
  const agentId = process.env.ERC8004_AGENT_ID;
  const agentRegistry = process.env.ERC8004_AGENT_REGISTRY;

  const agentCard = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: process.env.AGENT_NAME ?? 'Site Builder Agent',
    description:
      'AI-powered personal website builder. Provide your name, tagline, and site type; pay 0.1 USDC via x402 on Base Sepolia. OpenCode customises a production-quality HTML template with your details and hosts the result on Filecoin. Returns a public CDN URL.',
    active: true,
    x402Support: true,
    healthUrl: `${baseUrl}/api/health`,
    services: [
      {
        name: 'build',
        version: '1.0.0',
        endpoint: `${baseUrl}/api/build`,
        description: 'Build and host a personalised website. POST with { name, tagline, siteType, ...optional }. Returns { runId, cid, cdnUrl, siteUrl }.',
        protocol: 'http',
        type: 'x402',
        cost: COST_CONFIG.siteBuild.toString(),
        currency: 'USDC',
        network: 'eip155:84532',
        payment: {
          required: true,
          protocol: 'x402',
          network: 'eip155:84532',
          asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          amount: COST_CONFIG.siteBuild.toString(),
          currency: 'USDC',
        },
        inputSchema: {
          type: 'object',
          required: ['name', 'tagline', 'siteType'],
          properties: {
            name: { type: 'string', description: 'Person or business name' },
            tagline: { type: 'string', description: 'Short tagline or bio' },
            siteType: { type: 'string', enum: ['resume', 'plumbing', 'furniture', 'wealth'] },
            description: { type: 'string' },
            services: { type: 'array', items: { type: 'string' } },
            contact: { type: 'object', properties: { email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' } } },
            social: { type: 'object', properties: { twitter: { type: 'string' }, github: { type: 'string' }, linkedin: { type: 'string' } } },
            userId: { type: 'string' },
          },
        },
        responseSchema: {
          success: 'boolean',
          runId: 'string',
          cid: 'string',
          cdnUrl: 'string — public CDN URL for the hosted site',
          siteUrl: 'string — alias for cdnUrl',
        },
      },
      ...(receivingWallet ? [{ name: 'agentWallet', endpoint: `eip155:84532:${receivingWallet}` }] : []),
    ],
    ...(agentId && agentRegistry
      ? { registrations: [{ agentId: parseInt(agentId, 10), agentRegistry }] }
      : {}),
    supportedTrust: ['reputation', 'crypto-economic'],
  };

  return NextResponse.json(agentCard, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}
