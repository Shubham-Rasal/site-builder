import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runOpenCode(runId: string): Promise<{ stdout: string; stderr: string }> {
  const workDir = `/tmp/site-${runId}`;
  const prompt =
    'You are customising a website template. Read user-details.json to get the user information. ' +
    'Edit index.html: replace all business-specific text with the user actual details. ' +
    'Keep all CSS, layout, fonts, colours, animations, and HTML structure exactly as-is. ' +
    'Only modify visible text content. Only modify index.html.';
  const cmd = `cd "${workDir}" && "/usr/local/bin/opencode" run "${prompt}"`;
  return execAsync(cmd, {
    timeout: 120_000,
    env: { ...process.env, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '', HOME: '/root' },
  });
}
