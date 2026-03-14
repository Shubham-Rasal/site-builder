export async function GET() {
  return Response.json({
    status: 'ok',
    agent: process.env.AGENT_NAME ?? 'Site Builder Agent',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
