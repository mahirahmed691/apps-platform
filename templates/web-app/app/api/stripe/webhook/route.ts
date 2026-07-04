import { NextRequest, NextResponse } from 'next/server';
import { createStripeClient, verifyWebhookSignature, createSupabaseServer } from '@yourorg/app-core';

const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event;
  try {
    event = verifyWebhookSignature(stripe, rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createSupabaseServer(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: existing } = await db
    .from('stripe_webhook_events')
    .select('stripe_event_id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        await db.from('profiles').update({
          stripe_customer_id: session.customer,
          plan: 'active',
          plan_updated_at: new Date().toISOString(),
        }).eq('id', session.client_reference_id);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const userId = sub.metadata?.supabase_user_id;
        const newPlan = event.type === 'customer.subscription.deleted' ? 'canceled'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'active' ? 'active' : 'free';
        if (userId) {
          await db.from('profiles').update({ plan: newPlan, plan_updated_at: new Date().toISOString() }).eq('id', userId);
        }
        break;
      }
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    await db.from('stripe_webhook_events').insert({ stripe_event_id: event.id, event_type: event.type });
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook processing failed', { eventId: event.id, err });
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
