#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appName = process.argv[2];
const projectRef = process.argv[3];

if (!appName || !projectRef) {
  console.error('Usage: node scripts/fill-env.js <app-name> <supabase-project-ref>');
  process.exit(1);
}

const appDir = path.join(__dirname, '..', 'apps', appName);
if (!fs.existsSync(appDir)) {
  console.error(`No such app directory: ${appDir}`);
  process.exit(1);
}

const requiredFromEnv = ['STRIPE_SECRET_KEY', 'ANTHROPIC_API_KEY'];
const missing = requiredFromEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  console.error('Export these yourself before running this script — not auto-generated on purpose.');
  process.exit(1);
}

console.log('==> Fetching Supabase API keys via CLI');
let anonKey, serviceRoleKey;
try {
  const raw = execSync(`supabase projects api-keys --project-ref ${projectRef} -o json`, {
    encoding: 'utf-8',
  });
  const keys = JSON.parse(raw);
  anonKey = keys.find((k) => k.name === 'anon')?.api_key;
  serviceRoleKey = keys.find((k) => k.name === 'service_role')?.api_key;
  if (!anonKey || !serviceRoleKey) throw new Error('anon or service_role key missing from CLI output');
} catch (err) {
  console.error('Failed to fetch Supabase API keys:', err.message);
  console.error('Fallback: get them manually from Settings > API in the Supabase dashboard.');
  process.exit(1);
}

console.log('==> Reading Stripe price ID from provisioning output');
let priceId = '';
const stripeOutputPath = path.join(appDir, '.provisioning-stripe.json');
if (fs.existsSync(stripeOutputPath)) {
  const stripeOutput = JSON.parse(fs.readFileSync(stripeOutputPath, 'utf-8'));
  priceId = stripeOutput.priceId || '';
} else {
  console.warn(`No ${stripeOutputPath} found — run provision-stripe.js first, or fill STRIPE_PRICE_ID manually.`);
}

console.log('==> Fetching Stripe webhook signing secret (local dev)');
let webhookSecret = '';
try {
  webhookSecret = execSync('stripe listen --print-secret', { encoding: 'utf-8' }).trim();
} catch (err) {
  console.warn('Could not fetch webhook secret automatically — run `stripe listen` manually and copy it.');
}

const envContent = `# Auto-filled by fill-env.js on ${new Date().toISOString()}
SUPABASE_URL=https://${projectRef}.supabase.co
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}
NEXT_PUBLIC_SUPABASE_URL=https://${projectRef}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${webhookSecret}
STRIPE_PRICE_ID=${priceId}
ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}
`;

fs.writeFileSync(path.join(appDir, '.env.local'), envContent);
console.log(`\n==> Wrote ${appDir}/.env.local`);
console.log('    Verify it before running npm run dev — auto-filled, not auto-verified.');

if (!webhookSecret) {
  console.log('\n    STRIPE_WEBHOOK_SECRET is empty — run this in a separate terminal,');
  console.log('    then paste the printed secret into .env.local manually:');
  console.log('      stripe listen --forward-to localhost:3000/api/stripe/webhook');
}
