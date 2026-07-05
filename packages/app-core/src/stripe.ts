import Stripe from 'stripe';

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: '2024-04-10' });
}

export async function createCheckoutSession(
  stripe: Stripe,
  params: { userId: string; email: string; priceId: string; successUrl: string; cancelUrl: string }
) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: params.email,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    subscription_data: { metadata: { supabase_user_id: params.userId } },
  });
}

export async function createPortalSession(
  stripe: Stripe,
  params: { customerId: string; returnUrl: string }
) {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}

export function verifyWebhookSignature(
  stripe: Stripe,
  rawBody: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
