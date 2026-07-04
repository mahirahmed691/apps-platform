import { NextRequest, NextResponse } from 'next/server';
import { createStripeClient, createCheckoutSession, createSupabaseServer } from '@yourorg/app-core';

const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createSupabaseServer(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error } = await db.auth.getUser(token);
  if (error || !userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { priceId, successUrl, cancelUrl } = await req.json();
  if (!priceId || !successUrl || !cancelUrl) {
    return NextResponse.json({ error: 'Missing priceId, successUrl, or cancelUrl' }, { status: 400 });
  }

  const session = await createCheckoutSession(stripe, {
    userId: userData.user.id,
    email: userData.user.email!,
    priceId,
    successUrl,
    cancelUrl,
  });

  return NextResponse.json({ url: session.url });
}
