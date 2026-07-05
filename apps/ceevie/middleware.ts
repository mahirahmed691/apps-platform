import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'www.ceevie.co.uk';

/** Keep OAuth PKCE verifiers and sessions on one origin. */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (host !== 'ceevie.co.uk') return NextResponse.next();

  const url = request.nextUrl.clone();
  url.protocol = 'https:';
  url.host = CANONICAL_HOST;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
