#!/usr/bin/env node
'use strict';

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');
const { loadRootEnv, requireEnv, REPO_ROOT } = require('./lib/env-utils');

// ---- Args --------------------------------------------------------------
// Usage: node provision-stripe.js <app-name> [price-in-cents]
//   --webhook-url=https://<app>.vercel.app  -> also create a prod webhook
//        endpoint and capture its signing secret (a live write to Stripe).
const appName = process.argv[2];
const priceCents = parseInt(process.argv[3] || '1900', 10);
const webhookUrlArg = process.argv.find((a) => a.startsWith('--webhook-url='));
const webhookUrl = webhookUrlArg ? webhookUrlArg.split('=')[1] : '';

if (!appName) {
  console.error('Usage: node provision-stripe.js <app-name> [price-in-cents] [--webhook-url=...]');
  process.exit(1);
}

// Load account secrets from the single source of truth (root .env).
try {
  loadRootEnv({ appName });
  requireEnv(['STRIPE_SECRET_KEY']);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Events the webhook route in the template actually handles.
const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

function readExistingProvisioning(appDir) {
  const outputPath = path.join(appDir, '.provisioning-stripe.json');
  if (!fs.existsSync(outputPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeProvisioning(appDir, output) {
  const outputPath = path.join(appDir, '.provisioning-stripe.json');
  const existing = readExistingProvisioning(appDir);
  const merged = { ...existing, ...output };
  if (!output.webhookSecretProd && existing.webhookSecretProd) {
    merged.webhookSecretProd = existing.webhookSecretProd;
  }
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
  console.log(`\nWrote provisioning output to ${outputPath}`);
  return merged;
}

(async () => {
  const appDir = path.join(REPO_ROOT, 'apps', appName);
  const existing = readExistingProvisioning(appDir);
  const output = {};

  if (existing.priceId && existing.productId) {
    console.log(`\nReusing existing Stripe product for ${appName}:`);
    console.log(`  Product ID: ${existing.productId}`);
    console.log(`  Price ID:   ${existing.priceId}`);
    output.productId = existing.productId;
    output.priceId = existing.priceId;
  } else {
    const product = await stripe.products.create({
      name: `${appName} Subscription`,
      metadata: { app: appName },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceCents,
      currency: 'gbp',
      recurring: { interval: 'month' },
    });

    console.log(`\nCreated Stripe product for ${appName}:`);
    console.log(`  Product ID: ${product.id}`);
    console.log(`  Price ID:   ${price.id}`);
    output.productId = product.id;
    output.priceId = price.id;
  }

  // Prod webhook endpoint is a LIVE, account-facing write — only when an
  // explicit URL is passed. Idempotent: reuse an existing endpoint for the
  // same URL rather than stacking duplicates. Stripe only returns the signing
  // secret on CREATE, so recreate the endpoint when we lost the secret locally.
  if (webhookUrl) {
    const endpointUrl = `${webhookUrl.replace(/\/$/, '')}/api/stripe/webhook`;
    const existingEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const match = existingEndpoints.data.find((e) => e.url === endpointUrl);

    if (match && existing.webhookSecretProd) {
      console.log(`\nWebhook endpoint already exists for ${endpointUrl}`);
      console.log('  Reusing saved signing secret from provisioning output.');
      output.webhookEndpointId = match.id;
      output.webhookSecretProd = existing.webhookSecretProd;
    } else if (match) {
      console.log(`\nWebhook endpoint exists for ${endpointUrl} but signing secret is missing locally.`);
      console.log('  Recreating endpoint so we can capture a new signing secret...');
      await stripe.webhookEndpoints.del(match.id);
      const endpoint = await stripe.webhookEndpoints.create({
        url: endpointUrl,
        enabled_events: WEBHOOK_EVENTS,
        metadata: { app: appName },
      });
      console.log(`\nCreated Stripe webhook endpoint:`);
      console.log(`  Endpoint ID: ${endpoint.id}`);
      console.log(`  URL:         ${endpoint.url}`);
      output.webhookEndpointId = endpoint.id;
      output.webhookSecretProd = endpoint.secret;
    } else {
      const endpoint = await stripe.webhookEndpoints.create({
        url: endpointUrl,
        enabled_events: WEBHOOK_EVENTS,
        metadata: { app: appName },
      });
      console.log(`\nCreated Stripe webhook endpoint:`);
      console.log(`  Endpoint ID: ${endpoint.id}`);
      console.log(`  URL:         ${endpoint.url}`);
      output.webhookEndpointId = endpoint.id;
      output.webhookSecretProd = endpoint.secret;
    }
  }

  if (fs.existsSync(appDir)) {
    writeProvisioning(appDir, output);
  } else {
    console.warn(`\napps/${appName} does not exist yet — skipped writing provisioning output.`);
  }
})().catch((err) => {
  console.error('Stripe provisioning failed:', err.message);
  process.exit(1);
});
