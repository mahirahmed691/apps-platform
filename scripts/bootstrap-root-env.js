#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { REPO_ROOT, parseEnv, serializeEnv } = require('./lib/env-utils');

// Pull account-level secrets from an app's .env.local into root .env
// so you don't re-enter values you already filled once.
//
// Usage: node scripts/bootstrap-root-env.js [app-name]

const appName = process.argv[2] || 'ceevie';
const appEnvPath = path.join(REPO_ROOT, 'apps', appName, '.env.local');
const rootEnvPath = path.join(REPO_ROOT, '.env');
const rootExamplePath = path.join(REPO_ROOT, '.env.example');

const KEYS_FROM_APP = ['STRIPE_SECRET_KEY', 'ANTHROPIC_API_KEY'];

if (!fs.existsSync(appEnvPath)) {
  console.error(`No ${appEnvPath} — nothing to bootstrap from.`);
  process.exit(1);
}

const appEnv = parseEnv(fs.readFileSync(appEnvPath, 'utf-8'));

let rootEnv = {};
if (fs.existsSync(rootEnvPath)) {
  rootEnv = parseEnv(fs.readFileSync(rootEnvPath, 'utf-8'));
} else if (fs.existsSync(rootExamplePath)) {
  rootEnv = parseEnv(fs.readFileSync(rootExamplePath, 'utf-8'));
}

let copied = 0;
for (const key of KEYS_FROM_APP) {
  if (!rootEnv[key] && appEnv[key]) {
    rootEnv[key] = appEnv[key];
    copied++;
    console.log(`  copied ${key} from apps/${appName}/.env.local`);
  }
}

if (copied === 0) {
  console.log('Root .env already has account secrets — nothing to copy.');
} else {
  fs.writeFileSync(
    rootEnvPath,
    serializeEnv(rootEnv, 'Root secrets — single source of truth (bootstrapped from app .env.local)')
  );
  console.log(`\nWrote ${rootEnvPath}`);
}

const stillMissing = ['STRIPE_SECRET_KEY', 'ANTHROPIC_API_KEY', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_ORG_ID']
  .filter((k) => !rootEnv[k]);

if (stillMissing.length) {
  console.log('\nStill missing in root .env (needed for provisioning new apps, not local dev):');
  stillMissing.forEach((k) => console.log(`  - ${k}`));
} else {
  console.log('\nRoot .env is complete.');
}

if (appEnv.NEXT_PUBLIC_SUPABASE_URL) {
  console.log(`\nLocal dev is ready: cd apps/${appName} && npm run dev`);
  console.log('(apps/' + appName + '/.env.local already has all runtime vars)');
}
