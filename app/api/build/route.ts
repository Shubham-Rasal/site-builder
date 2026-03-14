import { NextRequest, NextResponse } from 'next/server';
import { copyFile, mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
import { COST_CONFIG } from '@/lib/config';
import { createPaymentRequirements, verifyPayment, settlePayment, create402Response } from '@/lib/payment-verification';
import { storeSiteHtml } from '@/lib/foc-storage';
import { runOpenCode } from '@/lib/opencode-runner';

export const maxDuration = 300;

const TEMPLATE_MAP: Record<string, string> = {
  resume: 'professional_resume_site.html',
  plumbing: 'plumbing.html',
  furniture: 'high_end_furniture.html',
  wealth: 'weath_advisory.html',
};

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

function randomId(len = 7): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function injectDownloadButton(html: string, cdnUrl: string, cid: string): string {
  const button = `
<div style="position:fixed;bottom:20px;right:20px;z-index:9999;font-family:system-ui,sans-serif">
  <a href="${cdnUrl}" download="my-site.html" target="_blank"
     style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;
            background:#0052FF;color:#fff;border-radius:8px;text-decoration:none;
            font-size:14px;font-weight:600;box-shadow:0 2px 12px rgba(0,0,0,.2)">
    &#x2B07; Download from Filecoin
    <span style="font-size:11px;opacity:.8">(CID: ${cid.slice(0, 8)}&#x2026;)</span>
  </a>
</div>`;
  return html.replace(/<\/body>/i, `${button}\n</body>`);
}

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:5000';

  // ── 1. x402 payment verification ──
  const paymentRequirements = createPaymentRequirements(
    COST_CONFIG.siteBuild.toString(),
    'base-sepolia',
    `${baseUrl}/api/build`,
    'Build and host a personalised website on Filecoin',
  );

  const paymentHeader = req.headers.get('X-PAYMENT') ?? req.headers.get('x-payment');
  if (!paymentHeader) {
    return NextResponse.json(create402Response(paymentRequirements), { status: 402 });
  }

  const verifyResult = await verifyPayment(paymentHeader, paymentRequirements);
  if (!verifyResult.isValid) {
    return NextResponse.json(create402Response(paymentRequirements), { status: 402 });
  }

  // ── 2. Parse & validate body ──
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, tagline, siteType, description, services, contact, social, userId } = body as {
    name?: string; tagline?: string; siteType?: string; description?: string;
    services?: string[]; contact?: Record<string, string>; social?: Record<string, string>; userId?: string;
  };

  if (!name || !tagline || !siteType) {
    return NextResponse.json({ error: 'name, tagline, and siteType are required' }, { status: 400 });
  }
  if (!TEMPLATE_MAP[siteType]) {
    return NextResponse.json(
      { error: `Invalid siteType. Must be one of: ${Object.keys(TEMPLATE_MAP).join(', ')}` },
      { status: 400 },
    );
  }

  // ── 3. Setup working directory ──
  const runId = `site_${Date.now()}_${randomId()}`;
  const workDir = `/tmp/site-${runId}`;
  await mkdir(workDir, { recursive: true });

  // ── 4. Copy template ──
  await copyFile(path.join(TEMPLATES_DIR, TEMPLATE_MAP[siteType]), path.join(workDir, 'index.html'));

  // ── 5. Write user details ──
  await writeFile(
    path.join(workDir, 'user-details.json'),
    JSON.stringify({ name, tagline, siteType, description, services, contact, social, userId }, null, 2),
    'utf-8',
  );

  // ── 6. Run OpenCode ──
  try {
    const { stdout, stderr } = await runOpenCode(runId);
    console.log('[site-builder] OpenCode stdout:', stdout.slice(0, 500));
    if (stderr) console.warn('[site-builder] OpenCode stderr:', stderr.slice(0, 300));
  } catch (err) {
    console.error('[site-builder] OpenCode failed:', err);
    return NextResponse.json({ error: 'Site generation failed', detail: String(err) }, { status: 500 });
  }

  // ── 7. Read customised HTML ──
  const customisedHtml = await readFile(path.join(workDir, 'index.html'), 'utf-8');

  // ── 8. Pass 1: store plain HTML → CID for download button ──
  const pass1 = await storeSiteHtml(Buffer.from(customisedHtml, 'utf-8'));

  // ── 9. Inject download button ──
  const htmlWithButton = injectDownloadButton(customisedHtml, pass1.cdnUrl, pass1.cid);

  // ── 10. Pass 2: store final HTML ──
  const pass2 = await storeSiteHtml(Buffer.from(htmlWithButton, 'utf-8'));

  // ── 11. Settle payment (fire-and-forget) ──
  settlePayment(paymentHeader, paymentRequirements).catch((e) =>
    console.error('[site-builder] settlePayment error:', e),
  );

  return NextResponse.json({
    success: true,
    runId,
    cid: pass2.cid,
    cdnUrl: pass2.cdnUrl,
    siteUrl: pass2.cdnUrl,
    dryRun: pass2.dryRun,
  });
}
