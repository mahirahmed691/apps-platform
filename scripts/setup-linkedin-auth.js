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
// Configure LinkedIn (OIDC) OAuth on a Supabase project via Management API.
//
// Usage:
//   node scripts/setup-linkedin-auth.js <app-name> [supabase-project-ref]
//
// Flags:
//   --yes          skip prompts if LINKEDIN_CLIENT_ID/SECRET in root .env
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
  console.error(
    'Usage: node scripts/setup-linkedin-auth.js <app-name> [supabase-project-ref] [--yes] [--dry-run] [--site-url=...]'
  );
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

// Single shared readline interface. Creating a new one per prompt drops
// buffered input when stdin is a pipe (non-TTY), which breaks scripted runs.
let sharedRl = null;
function getReadline() {
  if (!sharedRl) {
    sharedRl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  return sharedRl;
}

function prompt(question) {
  const rl = getReadline();
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function closePrompt() {
  if (sharedRl) {
    sharedRl.close();
    sharedRl = null;
  }
}

function siteUrlVariants(siteUrl) {
  const normalized = normalizeSiteUrl(siteUrl);
  const variants = new Set([normalized]);

  try {
    const parsed = new URL(normalized);
    if (parsed.hostname.startsWith('www.')) {
      variants.add(`${parsed.protocol}//${parsed.hostname.slice(4)}`);
    } else if (!parsed.hostname.includes('localhost')) {
      variants.add(`${parsed.protocol}//www.${parsed.hostname}`);
    }
  } catch {
    // Keep the single normalized URL.
  }

  return [...variants];
}

function buildRedirectUrls(siteUrl) {
  const local = 'http://localhost:3000';
  const paths = ['/auth/callback', '/login', '/'];
  const urls = new Set([
    `${local}/auth/callback`,
    `${local}/login`,
    `${local}/`,
  ]);

  for (const base of siteUrlVariants(siteUrl)) {
    for (const path of paths) {
      urls.add(`${base}${path}`);
    }
  }

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
  let token;
  try {
    ({ token } = await resolveSupabaseAccessToken({ interactive: false }));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  let siteUrl = siteUrlOverride;
  if (!siteUrl) {
    siteUrl =
      normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
      (appName === 'ceevie' ? 'https://www.ceevie.co.uk' : 'http://localhost:3000');
  } else {
    siteUrl = normalizeSiteUrl(siteUrl);
  }

  let clientId = process.env.LINKEDIN_CLIENT_ID || '';
  let clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
  let clientIdFromPrompt = false;
  let clientSecretFromPrompt = false;

  console.log(`\n==> LinkedIn (OIDC) auth setup for ${appName}`);
  console.log(`    Supabase project: ${projectRef}`);
  console.log(`    Site URL:         ${siteUrl}`);
  console.log(`    Callback URL:     ${siteUrl}/auth/callback`);
  console.log('');
  console.log('    In the LinkedIn Developer Portal (developer.linkedin.com):');
  console.log('      1. Create an app and link it to your company page');
  console.log('      2. Products tab → add "Sign In with LinkedIn using OpenID Connect"');
  console.log('      3. Products tab → add "Verified on LinkedIn" (for profile URL + headline via /identityMe)');
  console.log('      4. Auth tab → add this Authorized redirect URL:');
  console.log(`         https://${projectRef}.supabase.co/auth/v1/callback`);
  console.log('      5. OAuth scopes used by Ceevie: openid profile email r_profile_basicinfo r_verify');
  console.log('      6. Copy the Client ID and Client Secret');
  console.log('');

  if (!autoYes) {
    const enable = await prompt('Ready to configure LinkedIn sign-in now? [Y/n] ');
    if (enable && /^n/i.test(enable)) {
      console.log('Skipped. Re-run this script when you have your credentials.');
      closePrompt();
      process.exit(0);
    }
  }

  if (!clientId || !clientSecret) {
    if (autoYes) {
      console.error('Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET in root .env');
      console.error('Add them to .env or run without --yes to enter interactively.');
      process.exit(1);
    }

    if (!clientId) {
      clientId = await prompt('LinkedIn OAuth Client ID: ');
      clientIdFromPrompt = true;
    }
    if (!clientSecret) {
      clientSecret = await prompt('LinkedIn OAuth Client Secret: ');
      clientSecretFromPrompt = true;
    }
  } else {
    console.log('    Using LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET from root .env');
  }

  if (!clientId || !clientSecret) {
    console.error('Client ID and secret are required.');
    closePrompt();
    process.exit(1);
  }

  // Let the user confirm or override the site URL from the terminal.
  if (!autoYes && !siteUrlOverride) {
    const siteAnswer = await prompt(`Site URL for redirects [${siteUrl}]: `);
    if (siteAnswer) {
      try {
        siteUrl = normalizeSiteUrl(siteAnswer);
      } catch (err) {
        console.error(err.message);
        closePrompt();
        process.exit(1);
      }
    }
  }

  // Offer to persist prompted credentials to root .env for next time.
  if (!autoYes && (clientIdFromPrompt || clientSecretFromPrompt)) {
    const saveCreds = await prompt('Save these LinkedIn credentials to root .env for next time? [Y/n] ');
    if (!saveCreds || !/^n/i.test(saveCreds)) {
      upsertRootEnvKey('LINKEDIN_CLIENT_ID', clientId);
      upsertRootEnvKey('LINKEDIN_CLIENT_SECRET', clientSecret);
      console.log('Saved LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to root .env');
    }
  }

  const redirectUrls = buildRedirectUrls(siteUrl);

  const patchBody = {
    external_linkedin_oidc_enabled: true,
    external_linkedin_oidc_client_id: clientId,
    external_linkedin_oidc_secret: clientSecret,
    site_url: siteUrl,
    security_manual_linking_enabled: true,
  };

  if (dryRun) {
    console.log('\nDry run — would PATCH auth config with:');
    console.log(
      JSON.stringify(
        { ...patchBody, external_linkedin_oidc_secret: '(redacted)', uri_allow_list: '(merged from existing)' },
        null,
        2
      )
    );
    closePrompt();
    process.exit(0);
  }

  if (!autoYes) {
    console.log('');
    console.log('    Will enable LinkedIn (OIDC) on Supabase with:');
    console.log(`      Project:   ${projectRef}`);
    console.log(`      Site URL:  ${siteUrl}`);
    console.log(`      Client ID: ${clientId}`);
    console.log('      Secret:    (hidden)');
    const confirm = await prompt('Apply this to Supabase now? [Y/n] ');
    if (confirm && /^n/i.test(confirm)) {
      console.log('Aborted. Nothing was changed.');
      closePrompt();
      process.exit(0);
    }
  }

  closePrompt();

  const current = await fetchAuthConfig(token, projectRef);
  const uriAllowList = mergeAllowList(current.uri_allow_list, redirectUrls);
  await patchAuthConfig(token, projectRef, { ...patchBody, uri_allow_list: uriAllowList });

  console.log('\n==> LinkedIn (OIDC) auth configured on Supabase');
  console.log('    Provider enabled, redirect URLs merged, site URL set.');
  console.log('    Manual identity linking enabled (required for Profile → Connect LinkedIn).');
  console.log('');
  console.log('    Optional: save credentials in root .env for next time:');
  console.log('      LINKEDIN_CLIENT_ID=...');
  console.log('      LINKEDIN_CLIENT_SECRET=...');
  console.log('');
  console.log('    Test locally: cd apps/' + appName + ' && npm run dev → /login → Continue with LinkedIn');
})().catch((err) => {
  closePrompt();
  console.error(err.message);
  process.exit(1);
});
