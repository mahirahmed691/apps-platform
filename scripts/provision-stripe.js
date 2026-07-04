#!/usr/bin/env node
// Creates a Stripe product + monthly price for a new app.
// Run via new-app.sh, or standalone: node scripts/provision-stripe.js <app-name> [price-in-cents]

const Stripe = require('stripe');

const appName = process.argv[2];
const priceCents = parseInt(process.argv[3] || '1900', 10); // default £19/mo

if (!appName) {
  console.error('Usage: node provision-stripe.js <app-name> [price-in-cents]');
  process.exit(1);
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Set STRIPE_SECRET_KEY env var first.');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
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
  console.log(`  Price ID:   ${price.id}  <- put this in STRIPE_PRICE_ID`);
  console.log(`\nDon't forget to set up a webhook endpoint in the Stripe`);
  console.log(`dashboard pointing at your deployed app's /api/stripe/webhook,`);
  console.log(`then copy the signing secret into STRIPE_WEBHOOK_SECRET.`);
})().catch((err) => {
  console.error('Stripe provisioning failed:', err.message);
  process.exit(1);
});
