#!/usr/bin/env node
'use strict';

const readline = require('readline');
const {
  loadRootEnv,
  assertShellSafe,
  normalizeSiteUrl,
  resolveSupabaseAccessToken,
  upsertRootEnvKey,
} = require('./lib/env-utils');
const { readProjectRef } = require('./lib/derive-app-env');

// ============================================================
// Configure Google OAuth on a Supabase project via Management API.
//
// Usage:
//   node scripts/setup-google-auth.js <app-name> [supabase-project-ref]
//
// Flags:
//   --yes          skip prompts if GOOGLE_CLIENT_ID/SECRET in root .env
//   --dry-run      print what would be sent, don't PATCH
//   --site-url=    override site URL (default: NEXT_PUBLIC_SITE_URL or localhost)
// ============================================================

const args = process.argv.slice(2);
const appName = args.find((a) => !a.startsWith('--'));
const projectRefArg = args.filter((a) => !a.startsWith('--'))[1];
const autoYes = args.includes('--yes');
const dryRun = args.includes('--dry-run');
const siteUrlArg = args.find((a) => a.startsWith('--site-url='));
const siteUrlOverride = siteUrlArg ? siteUrlArg.split('=').slice(1).join('=') : '';

if (!appName) {
  console.error('Usage: node scripts/setup-google-auth.js <app-name> [supabase-project-ref] [--yes] [--dry-run] [--site-url=...]');
  process.exit(1);
}

try {
  assertShellSafe('app name', appName);
  loadRootEnv({ appName });
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const projectRef = projectRefArg || readProjectRef(appName);
if (!projectRef) {
  console.error('Could not determine Supabase project ref. Pass it as the second argument.');
  process.exit(1);
}
try {
  assertShellSafe('supabase project ref', projectRef);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function buildRedirectUrls(siteUrl) {
  const local = 'http://localhost:3000';
  const urls = new Set([
    `${siteUrl}/auth/callback`,
    `${siteUrl}/login`,
    `${siteUrl}/`,
    `${local}/auth/callback`,
    `${local}/login`,
  ]);
  return [...urls];
}

function mergeAllowList(existing, additions) {
  const current = (existing || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  return [...new Set([...current, ...additions])].join(',');
}

async function fetchAuthConfig(token, ref) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read auth config (${response.status}): ${text}`);
  }
  return response.json();
}

async function patchAuthConfig(token, ref, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update auth config (${response.status}): ${text}`);
  }
  return response.json();
}

(async () => {
  const { token, source: tokenSource } = await resolveSupabaseAccessToken({
    prompt,
    interactive: !autoYes,
  });
  let siteUrl = siteUrlOverride;
  if (!siteUrl) {
    siteUrl =
      normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
      (appName === 'ceevie' ? 'https://ceevie.co.uk' : 'http://localhost:3000');
  } else {
    siteUrl = normalizeSiteUrl(siteUrl);
  }

  let clientId = process.env.GOOGLE_CLIENT_ID || '';
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  console.log(`\n==> Google auth setup for ${appName}`);
  console.log(`    Supabase project: ${projectRef}`);
  console.log(`    Site URL:         ${siteUrl}`);
  console.log(`    Callback URL:     ${siteUrl}/auth/callback`);
  console.log('');
  console.log('    In Google Cloud Console, add this Authorized redirect URI:');
  console.log(`      https://${projectRef}.supabase.co/auth/v1/callback`);
  console.log('');

  if (!clientId || !clientSecret) {
    if (autoYes) {
      console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in root .env');
      console.error('Add them to .env or run without --yes to enter interactively.');
      process.exit(1);
    }

    const enable = await prompt('Enable Google sign-in for this project? [Y/n] ');
    if (enable && /^n/i.test(enable)) {
      console.log('Skipped.');
      process.exit(0);
    }

    if (!clientId) {
      clientId = await prompt('Google OAuth Client ID: ');
    }
    if (!clientSecret) {
      clientSecret = await prompt('Google OAuth Client Secret: ');
    }
  }

  if (!clientId || !clientSecret) {
    console.error('Client ID and secret are required.');
    process.exit(1);
  }

  if (tokenSource !== 'root-env' && !autoYes) {
    const save = await prompt('Save Supabase token to root .env for next time? [y/N] ');
    if (save && /^y/i.test(save)) {
      upsertRootEnvKey('SUPABASE_ACCESS_TOKEN', token);
      console.log('Saved SUPABASE_ACCESS_TOKEN to root .env');
    }
  }

  const redirectUrls = buildRedirectUrls(siteUrl);
  const current = await fetchAuthConfig(token, projectRef);
  const uriAllowList = mergeAllowList(current.uri_allow_list, redirectUrls);

  const patchBody = {
    external_google_enabled: true,
    external_google_client_id: clientId,
    external_google_secret: clientSecret,
    site_url: siteUrl,
    uri_allow_list: uriAllowList,
  };

  if (dryRun) {
    console.log('\nDry run — would PATCH auth config with:');
    console.log(JSON.stringify({ ...patchBody, external_google_secret: '(redacted)' }, null, 2));
    process.exit(0);
  }

  await patchAuthConfig(token, projectRef, patchBody);

  console.log('\n==> Google auth configured on Supabase');
  console.log('    Provider enabled, redirect URLs merged, site URL set.');
  console.log('');
  console.log('    Optional: save credentials in root .env for next time:');
  console.log('      GOOGLE_CLIENT_ID=...');
  console.log('      GOOGLE_CLIENT_SECRET=...');
  console.log('');
  console.log('    Test locally: cd apps/' + appName + ' && npm run dev → /login → Continue with Google');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
