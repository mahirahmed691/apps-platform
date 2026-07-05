'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');

const ACCOUNT_KEYS = [
  'STRIPE_SECRET_KEY',
  'ANTHROPIC_API_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_ORG_ID',
  'VERCEL_TOKEN',
];

/**
 * Parse a dotenv-style string into a plain object.
 * Supports: KEY=VALUE, blank lines, # comments, optional surrounding quotes.
 * Deliberately dependency-free so provisioning has no install step.
 */
function parseEnv(contents) {
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!key) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseEnv(fs.readFileSync(filePath, 'utf-8'));
}

/** Paths to check for an app's .env.local (current repo + parent repo). */
function appEnvLocalPaths(appName) {
  return [
    path.join(REPO_ROOT, 'apps', appName, '.env.local'),
    path.join(REPO_ROOT, '..', 'apps', appName, '.env.local'),
  ];
}

/**
 * Load repo-root .env into process.env. Falls back to:
 *   1. parent directory .env (nested clone: ~/apps-platform/.env)
 *   2. apps/<app>/.env.local for account secrets already filled once
 *
 * Creates root .env automatically when bootstrapped from an app env file.
 */
function loadRootEnv(options = {}) {
  const { appName } = options;
  const rootEnvPath = path.join(REPO_ROOT, '.env');
  const parentEnvPath = path.join(REPO_ROOT, '..', '.env');

  let parsed = {};
  parsed = { ...parsed, ...readEnvFile(parentEnvPath) };
  parsed = { ...parsed, ...readEnvFile(rootEnvPath) };

  if (appName) {
    for (const envLocalPath of appEnvLocalPaths(appName)) {
      const appEnv = readEnvFile(envLocalPath);
      for (const key of ACCOUNT_KEYS) {
        if (!parsed[key] && appEnv[key]) parsed[key] = appEnv[key];
      }
      // Also allow pulling Stripe/Anthropic from app env if user only filled .env.local
      if (!parsed.STRIPE_SECRET_KEY && appEnv.STRIPE_SECRET_KEY) {
        parsed.STRIPE_SECRET_KEY = appEnv.STRIPE_SECRET_KEY;
      }
      if (!parsed.ANTHROPIC_API_KEY && appEnv.ANTHROPIC_API_KEY) {
        parsed.ANTHROPIC_API_KEY = appEnv.ANTHROPIC_API_KEY;
      }
    }
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (value && process.env[key] === undefined) process.env[key] = value;
  }

  const bootstrappedFromApp =
    appName &&
    !fs.existsSync(rootEnvPath) &&
    ACCOUNT_KEYS.some((k) => parsed[k]);

  if (bootstrappedFromApp) {
    const example = readEnvFile(path.join(REPO_ROOT, '.env.example'));
    const merged = { ...example, ...parsed };
    fs.writeFileSync(
      rootEnvPath,
      serializeEnv(merged, 'Auto-created from existing app .env.local — edit account-only keys here')
    );
    console.log(`==> Created ${rootEnvPath} from apps/${appName}/.env.local`);
  }

  if (!parsed.STRIPE_SECRET_KEY && !parsed.ANTHROPIC_API_KEY) {
    throw new Error(
      'Missing account secrets. Either:\n' +
        '  1. Create .env from .env.example and fill in STRIPE_SECRET_KEY + ANTHROPIC_API_KEY, or\n' +
        '  2. Ensure apps/' +
        (appName || '<app>') +
        '/.env.local exists with those keys (already filled once).'
    );
  }

  return parsed;
}

/**
 * Assert that every name in `keys` is present and non-empty in process.env.
 * Throws a single actionable error listing everything missing.
 */
function requireEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    let hint =
      'Fill them in root .env (see .env.example) or apps/<app>/.env.local and re-run.';
    if (missing.includes('SUPABASE_ACCESS_TOKEN')) {
      hint =
        'Add SUPABASE_ACCESS_TOKEN to root .env, run `supabase login`, or re-run a script that prompts for it.\n' +
        'Create a token at: https://supabase.com/dashboard/account/tokens';
    }
    throw new Error(`Missing required secrets: ${missing.join(', ')}\n${hint}`);
  }
}

/** Supabase personal access tokens start with sbp_ (see Supabase CLI validation). */
function isValidSupabaseAccessToken(token) {
  return typeof token === 'string' && /^sbp_/.test(token.trim());
}

/**
 * Read Supabase access token from the same places the CLI uses after `supabase login`.
 * Does not prompt — returns empty string when nothing is found.
 */
function readSupabaseCliAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN && isValidSupabaseAccessToken(process.env.SUPABASE_ACCESS_TOKEN)) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }

  const tokenPaths = [
    path.join(os.homedir(), '.supabase', 'access-token'),
    path.join(os.homedir(), '.config', 'supabase', 'access-token'),
  ];
  for (const tokenPath of tokenPaths) {
    if (!fs.existsSync(tokenPath)) continue;
    const token = fs.readFileSync(tokenPath, 'utf-8').trim();
    if (isValidSupabaseAccessToken(token)) return token;
  }

  if (process.platform === 'darwin') {
    for (const account of ['supabase', 'access-token']) {
      try {
        const token = execSync(`security find-generic-password -s "Supabase CLI" -a "${account}" -w`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        if (isValidSupabaseAccessToken(token)) return token;
      } catch {
        // try next account
      }
    }
  }

  return '';
}

/**
 * Resolve SUPABASE_ACCESS_TOKEN from .env, Supabase CLI session, or an optional prompt.
 */
async function resolveSupabaseAccessToken(options = {}) {
  const { prompt, interactive = true } = options;

  let token = readSupabaseCliAccessToken();
  if (token) {
    process.env.SUPABASE_ACCESS_TOKEN = token;
    const fromEnvFile = [path.join(REPO_ROOT, '.env'), path.join(REPO_ROOT, '..', '.env')].some(
      (p) => !!readEnvFile(p).SUPABASE_ACCESS_TOKEN
    );
    return { token, source: fromEnvFile ? 'root-env' : 'cli' };
  }

  if (interactive && prompt) {
    console.log('');
    console.log('SUPABASE_ACCESS_TOKEN is not set in root .env.');
    console.log('This script can use your `supabase login` session when available.');
    console.log('Otherwise paste a personal access token from:');
    console.log('  https://supabase.com/dashboard/account/tokens');
    console.log('');
    token = await prompt('Supabase access token (sbp_..., Enter to skip): ');
    if (token) {
      process.env.SUPABASE_ACCESS_TOKEN = token;
      return { token, source: 'prompt' };
    }
  }

  throw new Error(
    'Missing SUPABASE_ACCESS_TOKEN.\n' +
      'Either:\n' +
      '  1. Add SUPABASE_ACCESS_TOKEN=... to root .env (see .env.example), or\n' +
      '  2. Run `supabase login`, or\n' +
      '  3. Re-run this script and paste a token when prompted.\n' +
      'Create a token at: https://supabase.com/dashboard/account/tokens'
  );
}

/** Append or update a single key in root .env (gitignored). */
function upsertRootEnvKey(key, value) {
  const rootEnvPath = path.join(REPO_ROOT, '.env');
  const example = readEnvFile(path.join(REPO_ROOT, '.env.example'));
  const current = fs.existsSync(rootEnvPath) ? readEnvFile(rootEnvPath) : { ...example };
  current[key] = value;
  fs.writeFileSync(
    rootEnvPath,
    serializeEnv(current, 'Root secrets — single source of truth for account credentials')
  );
}

/** Serialize an object to dotenv format with an optional header comment. */
function serializeEnv(obj, header) {
  const lines = [];
  if (header) lines.push(`# ${header}`);
  for (const [key, value] of Object.entries(obj)) {
    lines.push(`${key}=${value ?? ''}`);
  }
  return lines.join('\n') + '\n';
}

/**
 * Reject values that could break out of a shell argument. Used for anything
 * interpolated into an execSync command (app name, project ref).
 */
function assertShellSafe(label, value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(
      `Unsafe ${label}: "${value}". Only letters, digits, dot, underscore, hyphen allowed.`
    );
  }
  return value;
}

/** Normalize and validate a public site URL (https only in production). */
function normalizeSiteUrl(url) {
  if (!url) return '';
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid site URL: ${url}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Invalid site URL protocol: ${url}`);
  }
  return parsed.origin;
}

module.exports = {
  REPO_ROOT,
  parseEnv,
  loadRootEnv,
  requireEnv,
  readSupabaseCliAccessToken,
  resolveSupabaseAccessToken,
  upsertRootEnvKey,
  serializeEnv,
  assertShellSafe,
  normalizeSiteUrl,
  appEnvLocalPaths,
};
