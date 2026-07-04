#!/usr/bin/env node
const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

const appName = process.argv[2];
const priceCents = parseInt(process.argv[3] || '1900', 10);

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
  console.log(`  Price ID:   ${price.id}`);

  const appDir = path.join(__dirname, '..', 'apps', appName);
  const outputPath = path.join(appDir, '.provisioning-stripe.json');
  if (fs.existsSync(appDir)) {
    fs.writeFileSync(outputPath, JSON.stringify({ productId: product.id, priceId: price.id }, null, 2));
    console.log(`\nWrote provisioning output to ${outputPath}`);
  }
})().catch((err) => {
  console.error('Stripe provisioning failed:', err.message);
  process.exit(1);
});
