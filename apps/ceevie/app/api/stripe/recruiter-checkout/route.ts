import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await auth.db.from('profiles').select('account_type').eq('id', auth.user.id).maybeSingle();
  if (profile?.account_type !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter account required' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const successUrl = typeof (body as { successUrl?: string }).successUrl === 'string' ? (body as { successUrl: string }).successUrl : `${req.nextUrl.origin}/recruiter?upgraded=1`;
  const cancelUrl = typeof (body as { cancelUrl?: string }).cancelUrl === 'string' ? (body as { cancelUrl: string }).cancelUrl : `${req.nextUrl.origin}/recruiter`;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_RECRUITER_PRICE_ID;
  if (!stripeKey || !priceId) {
    return NextResponse.json({ error: 'Recruiter billing is not configured yet' }, { status: 503 });
  }

  const params = new URLSearchParams({
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: auth.user.id,
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) return NextResponse.json({ error: 'Checkout failed' }, { status: 502 });
  const session = await response.json();
  return NextResponse.json({ url: session.url });
}
