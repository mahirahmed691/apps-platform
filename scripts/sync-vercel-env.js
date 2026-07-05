#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');
const {
  loadRootEnv,
  requireEnv,
  assertShellSafe,
  REPO_ROOT,
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
//   --preview-branch=<br>  git branch for preview env vars (default: current branch)
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
const previewBranchArg = args.find((a) => a.startsWith('--preview-branch='));
const previewBranchOverride = previewBranchArg
  ? previewBranchArg.split('=').slice(1).join('=')
  : '';

const envTargets = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--env' && args[i + 1]) envTargets.push(args[i + 1]);
}
const targets = envTargets.length ? envTargets : ['production', 'preview'];

if (!appName) {
  console.error('Usage: node scripts/sync-vercel-env.js <app-name> [supabase-project-ref] [--link] [--env production] [--preview-branch=master] [--webhook-url=...] [--dry-run]');
  process.exit(1);
}

function resolvePreviewGitBranch() {
  if (previewBranchOverride) {
    assertShellSafe('preview git branch', previewBranchOverride);
    return previewBranchOverride;
  }

  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    if (branch && branch !== 'HEAD') {
      assertShellSafe('preview git branch', branch);
      return branch;
    }
  } catch {
    // fall through to master
  }

  return 'master';
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
  const appDirForWebhook = path.join(REPO_ROOT, 'apps', appName);
  const { webhookSecretProd } = readStripeProvisioning(appDirForWebhook);
  if (webhookSecretProd) {
    console.log('==> Prod Stripe webhook secret already in provisioning output — skipping re-provision');
  } else {
    console.log('==> Provisioning prod Stripe webhook endpoint');
    const provisionArgs = ['scripts/provision-stripe.js', appName, '1900', `--webhook-url=${webhookUrl}`];
    execFileSync(process.execPath, provisionArgs, { stdio: 'inherit', cwd: REPO_ROOT });
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

const previewGitBranch = targets.includes('preview') ? resolvePreviewGitBranch() : null;
if (previewGitBranch) {
  console.log(`    Preview branch: ${previewGitBranch}`);
}

function vercelEnvErrorMessage(err) {
  const stdout = err.stdout?.toString?.() ?? '';
  const stderr = err.stderr?.toString?.() ?? '';
  const combined = `${stdout}\n${stderr}`.trim();

  try {
    const parsed = JSON.parse(stdout);
    if (parsed.message) return parsed.message;
  } catch {
    // not JSON
  }

  return combined || err.message;
}

function syncTarget(target) {
  console.log(`\n--- ${target} ---`);
  let previewSkipped = false;

  for (const key of APP_ENV_KEYS) {
    const value = envVars[key];
    const sensitive = SENSITIVE_KEYS.has(key);
    console.log(`  ${key}${sensitive ? ' (sensitive)' : ''}`);

    if (dryRun) continue;
    if (previewSkipped) continue;

    const vercelArgs = ['env', 'add', key, target];
    if (target === 'preview') {
      vercelArgs.push(previewGitBranch);
    }
    vercelArgs.push('--value', value, '--yes', '--force');
    if (sensitive) vercelArgs.push('--sensitive');

    try {
      execFileSync('vercel', vercelArgs, {
        cwd: appDir,
        stdio: 'pipe',
        env: process.env,
      });
    } catch (err) {
      const message = vercelEnvErrorMessage(err);
      if (
        target === 'preview' &&
        message.includes('does not have a connected Git repository')
      ) {
        previewSkipped = true;
        console.warn('\n    Preview sync skipped: Vercel project is not linked to Git.');
        console.warn('    Connect the repo in Vercel project settings, then re-run:');
        console.warn(`      node scripts/sync-vercel-env.js ${appName} ${projectRef} --env preview`);
        console.warn('    Production env vars were still synced.');
        break;
      }

      throw new Error(message || `Failed to sync ${key} to ${target}`);
    }
  }

  return !previewSkipped || dryRun;
}

let hadFailure = false;
for (const target of targets) {
  if (!['production', 'preview', 'development'].includes(target)) {
    console.error(`Invalid --env target: ${target}`);
    process.exit(1);
  }

  try {
    const ok = syncTarget(target);
    if (!ok && target === 'preview') hadFailure = true;
  } catch (err) {
    console.error(`\nFailed to sync ${target}: ${err.message}`);
    process.exit(1);
  }
}

if (dryRun) {
  console.log('\nDry run complete — no changes written.');
} else {
  console.log('\n==> Vercel env sync complete.');
  if (hadFailure) {
    console.log('    Preview env vars were not synced — see warning above.');
  }
  console.log('    Redeploy (or push) for running deployments to pick up new values.');
}
