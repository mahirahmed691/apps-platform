'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { REPO_ROOT, normalizeSiteUrl } = require('./env-utils');

const SENSITIVE_KEYS = new Set([
  'STRIPE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
]);

/** Keys every app needs locally and on Vercel. */
const APP_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SITE_URL',
];

function log(step, message) {
  if (step) console.log(`==> ${step}`);
  if (message) console.log(message);
}

function readStripeProvisioning(appDir) {
  const stripeOutputPath = path.join(appDir, '.provisioning-stripe.json');
  if (!fs.existsSync(stripeOutputPath)) {
    return { priceId: '', webhookSecretProd: '', webhookEndpointId: '' };
  }
  const stripeOutput = JSON.parse(fs.readFileSync(stripeOutputPath, 'utf-8'));
  return {
    priceId: stripeOutput.priceId || '',
    webhookSecretProd: stripeOutput.webhookSecretProd || '',
    webhookEndpointId: stripeOutput.webhookEndpointId || '',
  };
}

function fetchSupabaseKeys(projectRef) {
  const raw = execSync(`supabase projects api-keys --project-ref ${projectRef} -o json`, {
    encoding: 'utf-8',
    env: process.env,
  });
  const keys = JSON.parse(raw);
  const anonKey = keys.find((k) => k.name === 'anon')?.api_key;
  const serviceRoleKey = keys.find((k) => k.name === 'service_role')?.api_key;
  if (!anonKey || !serviceRoleKey) {
    throw new Error('anon or service_role key missing from Supabase CLI output');
  }
  return { anonKey, serviceRoleKey };
}

function fetchLocalWebhookSecret() {
  return execSync('stripe listen --print-secret', {
    encoding: 'utf-8',
    env: process.env,
  }).trim();
}

/**
 * Derive the full set of app env vars from root .env + CLIs + provisioning output.
 * Caller must loadRootEnv() and requireEnv() first.
 */
function deriveAppEnv(appName, projectRef, options = {}) {
  const { useLocalWebhook = false, quiet = false } = options;
  const appDir = path.join(REPO_ROOT, 'apps', appName);
  if (!fs.existsSync(appDir)) {
    throw new Error(`No such app directory: ${appDir}`);
  }

  if (!quiet) log('Fetching Supabase API keys via CLI');
  let anonKey;
  let serviceRoleKey;
  try {
    ({ anonKey, serviceRoleKey } = fetchSupabaseKeys(projectRef));
  } catch (err) {
    throw new Error(
      `Failed to fetch Supabase API keys: ${err.message}\n` +
        'Check SUPABASE_ACCESS_TOKEN in root .env, or that the project ref is correct.'
    );
  }

  if (!quiet) log('Reading Stripe provisioning output');
  const { priceId, webhookSecretProd } = readStripeProvisioning(appDir);
  if (!priceId && !quiet) {
    console.warn(
      `No price ID in ${path.join(appDir, '.provisioning-stripe.json')} — run provision-stripe.js first.`
    );
  }

  let webhookSecret = webhookSecretProd;
  if (useLocalWebhook) {
    if (!quiet) log('Fetching Stripe local webhook signing secret');
    try {
      const localSecret = fetchLocalWebhookSecret();
      if (localSecret) webhookSecret = localSecret;
    } catch (err) {
      if (!quiet) {
        console.warn('Could not fetch local webhook secret automatically:', err.message);
        if (!webhookSecret) {
          console.warn('STRIPE_WEBHOOK_SECRET will be empty — run `stripe login` then re-run.');
        }
      }
    }
  } else if (!webhookSecret && !quiet) {
    console.warn(
      'No prod webhook secret in provisioning output. Run provision-stripe.js with --webhook-url=... first.'
    );
  }

  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const siteUrl =
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    (appName === 'ceevie' ? 'https://ceevie.co.uk' : '');

  const envVars = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    STRIPE_PRICE_ID: priceId,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
    NEXT_PUBLIC_SITE_URL: siteUrl,
  };

  writeProvisioningMeta(appDir, projectRef);

  return { appDir, envVars };
}

/** Persist project ref so later scripts can auto-detect it. Gitignored. */
function writeProvisioningMeta(appDir, projectRef) {
  const metaPath = path.join(appDir, '.provisioning.json');
  fs.writeFileSync(
    metaPath,
    JSON.stringify({ supabaseProjectRef: projectRef, updatedAt: new Date().toISOString() }, null, 2) + '\n'
  );
}

function readProjectRef(appName) {
  const appDir = path.join(REPO_ROOT, 'apps', appName);

  const metaPath = path.join(appDir, '.provisioning.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    if (meta.supabaseProjectRef) return meta.supabaseProjectRef;
  }

  const envLocalPath = path.join(appDir, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const match = fs.readFileSync(envLocalPath, 'utf-8').match(/SUPABASE_URL=https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (match) return match[1];
  }

  return null;
}

function listEmptyKeys(envVars) {
  return Object.entries(envVars)
    .filter(([, v]) => !v)
    .map(([k]) => k);
}

module.exports = {
  APP_ENV_KEYS,
  SENSITIVE_KEYS,
  deriveAppEnv,
  readProjectRef,
  readStripeProvisioning,
  writeProvisioningMeta,
  listEmptyKeys,
};
