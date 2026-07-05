#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadRootEnv,
  requireEnv,
  serializeEnv,
  assertShellSafe,
} = require('./lib/env-utils');
const { deriveAppEnv, listEmptyKeys } = require('./lib/derive-app-env');

// ============================================================
// Derives an app's .env.local FULLY AUTOMATICALLY from:
//   - root .env             (account secrets, single source of truth)
//   - supabase CLI          (per-project anon + service_role keys)
//   - .provisioning-stripe.json (price id, prod webhook secret)
//   - stripe CLI            (local webhook secret, unless --no-local-webhook)
//
// Usage:
//   node scripts/fill-env.js <app-name> <supabase-project-ref>
// Flags:
//   --no-local-webhook   use prod webhook secret instead of stripe listen
// ============================================================

const appName = process.argv[2];
const projectRef = process.argv[3];
const skipLocalWebhook = process.argv.includes('--no-local-webhook');

if (!appName || !projectRef) {
  console.error('Usage: node scripts/fill-env.js <app-name> <supabase-project-ref> [--no-local-webhook]');
  process.exit(1);
}

try {
  assertShellSafe('app name', appName);
  assertShellSafe('supabase project ref', projectRef);
  loadRootEnv({ appName });
  requireEnv(['STRIPE_SECRET_KEY', 'ANTHROPIC_API_KEY']);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

let appDir;
let envVars;
try {
  ({ appDir, envVars } = deriveAppEnv(appName, projectRef, {
    useLocalWebhook: !skipLocalWebhook,
  }));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const envPath = path.join(appDir, '.env.local');
fs.writeFileSync(
  envPath,
  serializeEnv(envVars, `Auto-derived by fill-env.js on ${new Date().toISOString()} — do not hand-edit.`)
);
console.log(`\n==> Wrote ${envPath}`);

const stillEmpty = listEmptyKeys(envVars);
if (stillEmpty.length) {
  console.log(`\n    Note: these are empty and may need provisioning: ${stillEmpty.join(', ')}`);
} else {
  console.log('    All values populated. Ready to run: npm run dev.');
}
