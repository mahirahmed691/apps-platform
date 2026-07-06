import type { NextRequest } from 'next/server';

const DEV_EMAILS_ENV = 'CEEVIE_DEV_EMAILS';

export function isDevToolsEnabledForEmail(email: string | null | undefined): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const allowlist = (process.env[DEV_EMAILS_ENV] ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return false;
  return Boolean(email?.trim() && allowlist.includes(email.trim().toLowerCase()));
}

export function isDevToolsRequest(req: NextRequest, email: string | null | undefined): boolean {
  if (isDevToolsEnabledForEmail(email)) return true;
  const header = req.headers.get('x-ceevie-dev-tools');
  return process.env.NODE_ENV !== 'production' && header === '1';
}
