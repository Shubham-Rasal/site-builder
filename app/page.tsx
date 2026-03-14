export default function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:5000';
  return (
    <main style={{ fontFamily: 'monospace', maxWidth: 800, margin: '60px auto', padding: '0 24px', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Site Builder Agent</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>ERC-8004 · 0.1 USDC · Base Sepolia · Filecoin hosted</p>
      <h2>POST /api/build</h2>
      <p>Pay 0.1 USDC via x402, provide your details, receive a personalised website hosted on Filecoin.</p>
      <h3 style={{ marginTop: 24 }}>Site Types</h3>
      <ul>
        <li><code>resume</code> — Professional resume / portfolio</li>
        <li><code>plumbing</code> — Plumbing / trade services</li>
        <li><code>furniture</code> — High-end furniture / luxury brand</li>
        <li><code>wealth</code> — Wealth advisory / financial services</li>
      </ul>
      <p style={{ marginTop: 32, color: '#999', fontSize: '0.85rem' }}>
        <a href="/.well-known/agent-card.json" style={{ color: '#0052FF' }}>Agent Card</a>
        {' · '}
        <a href="/api/health" style={{ color: '#0052FF' }}>Health</a>
      </p>
    </main>
  );
}
