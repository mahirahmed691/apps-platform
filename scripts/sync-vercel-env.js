#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const {
  loadRootEnv,
  requireEnv,
  assertShellSafe,
} = require('./lib/env-utils');
const {
  deriveAppEnv,
  readProjectRef,
  listEmptyKeys,
  readStripeProvisioning,
  APP_ENV_KEYS,
  SENSITIVE_KEYS,
} = require('./lib/derive-app-env');

// ============================================================
// Sync derived app env vars to Vercel (production + preview).
// Source of truth: root .env + Supabase CLI + provisioning output.
//
// Usage:
//   node scripts/sync-vercel-env.js <app-name> [supabase-project-ref]
//
// Flags:
//   --link                 run `vercel link --project <app> --yes` first
//   --env production       sync only production (default: production,preview)
//   --env preview
//   --webhook-url=<url>    provision prod Stripe webhook before sync
//   --dry-run              print what would be synced, don't write
// ============================================================

const args = process.argv.slice(2);
const appName = args.find((a) => !a.startsWith('--'));
const projectRefArg = args.filter((a) => !a.startsWith('--'))[1];
const shouldLink = args.includes('--link');
const dryRun = args.includes('--dry-run');
const webhookUrlArg = args.find((a) => a.startsWith('--webhook-url='));
const webhookUrl = webhookUrlArg ? webhookUrlArg.split('=').slice(1).join('=') : '';

const envTargets = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--env' && args[i + 1]) envTargets.push(args[i + 1]);
}
const targets = envTargets.length ? envTargets : ['production', 'preview'];

if (!appName) {
  console.error('Usage: node scripts/sync-vercel-env.js <app-name> [supabase-project-ref] [--link] [--env production] [--webhook-url=...] [--dry-run]');
  process.exit(1);
}

try {
  assertShellSafe('app name', appName);
  loadRootEnv({ appName });
  requireEnv(['STRIPE_SECRET_KEY', 'ANTHROPIC_API_KEY']);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const projectRef = projectRefArg || readProjectRef(appName);
if (!projectRef) {
  console.error(
    'Could not determine Supabase project ref. Pass it as the second argument,\n' +
      'or run fill-env.js first (writes apps/<app>/.provisioning.json).'
  );
  process.exit(1);
}
try {
  assertShellSafe('supabase project ref', projectRef);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

if (webhookUrl) {
  const appDir = path.join(require('./lib/env-utils').REPO_ROOT, 'apps', appName);
  const { webhookSecretProd } = readStripeProvisioning(appDir);
  if (webhookSecretProd) {
    console.log('==> Prod Stripe webhook secret already in provisioning output — skipping re-provision');
  } else {
    console.log('==> Provisioning prod Stripe webhook endpoint');
    const provisionArgs = ['scripts/provision-stripe.js', appName, '1900', `--webhook-url=${webhookUrl}`];
    execFileSync(process.execPath, provisionArgs, { stdio: 'inherit', cwd: require('./lib/env-utils').REPO_ROOT });
  }
}

let appDir;
let envVars;
try {
  ({ appDir, envVars } = deriveAppEnv(appName, projectRef, {
    useLocalWebhook: false,
    quiet: true,
  }));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const stillEmpty = listEmptyKeys(envVars);
if (stillEmpty.length) {
  console.error(`Cannot sync — these values are empty: ${stillEmpty.join(', ')}`);
  if (stillEmpty.includes('STRIPE_WEBHOOK_SECRET')) {
    console.error('Provision a prod webhook first:');
    console.error(`  node scripts/provision-stripe.js ${appName} 1900 --webhook-url=https://<app>.vercel.app`);
  }
  process.exit(1);
}

if (shouldLink && !dryRun) {
  console.log(`==> Linking Vercel project "${appName}" in ${appDir}`);
  execFileSync('vercel', ['link', '--project', appName, '--yes'], {
    cwd: appDir,
    stdio: 'inherit',
    env: process.env,
  });
}

console.log(`==> Syncing ${APP_ENV_KEYS.length} env vars to Vercel (${targets.join(', ')})`);

for (const target of targets) {
  if (!['production', 'preview', 'development'].includes(target)) {
    console.error(`Invalid --env target: ${target}`);
    process.exit(1);
  }

  console.log(`\n--- ${target} ---`);
  for (const key of APP_ENV_KEYS) {
    const value = envVars[key];
    const sensitive = SENSITIVE_KEYS.has(key);
    console.log(`  ${key}${sensitive ? ' (sensitive)' : ''}`);

    if (dryRun) continue;

    const vercelArgs = ['env', 'add', key, target, '--value', value, '--yes', '--force'];
    if (sensitive) vercelArgs.push('--sensitive');

    execFileSync('vercel', vercelArgs, {
      cwd: appDir,
      stdio: 'pipe',
      env: process.env,
    });
  }
}

if (dryRun) {
  console.log('\nDry run complete — no changes written.');
} else {
  console.log('\n==> Vercel env sync complete.');
  console.log('    Redeploy (or push) for running deployments to pick up new values.');
}
