const RECRUITER_INTENT_KEY = 'ceevie-recruiter-intent';
const AUTH_NEXT_KEY = 'ceevie-auth-next';

export function setRecruiterIntent(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) sessionStorage.setItem(RECRUITER_INTENT_KEY, '1');
  else sessionStorage.removeItem(RECRUITER_INTENT_KEY);
}

export function peekRecruiterIntent(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(RECRUITER_INTENT_KEY) === '1';
}

export function clearRecruiterIntent(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(RECRUITER_INTENT_KEY);
}

export function stashAuthNext(path: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  if (path?.startsWith('/')) sessionStorage.setItem(AUTH_NEXT_KEY, path);
  else sessionStorage.removeItem(AUTH_NEXT_KEY);
}

export function peekAuthNext(): string | null {
  if (typeof window === 'undefined') return null;
  const value = sessionStorage.getItem(AUTH_NEXT_KEY);
  return value?.startsWith('/') ? value : null;
}

export function clearAuthNext(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUTH_NEXT_KEY);
}

export async function activateRecruiterAccount(accessToken: string): Promise<boolean> {
  const response = await fetch('/api/recruiter/activate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.ok;
}

/** Apply stored recruiter intent, then return the post-auth destination path. */
export async function resolvePostAuthDestination(accessToken: string | undefined): Promise<string> {
  const nextPath = peekAuthNext();
  const wantedRecruiter = peekRecruiterIntent();

  clearAuthNext();
  clearRecruiterIntent();

  if (nextPath) return nextPath;

  if (wantedRecruiter && accessToken) {
    await activateRecruiterAccount(accessToken);
    return '/recruiter';
  }

  return '/';
}
