import type { AuthError } from '@supabase/supabase-js';

export function isAlreadyRegistered(error: AuthError): boolean {
  return (
    error.code === 'user_already_exists' ||
    error.message.toLowerCase().includes('user already registered')
  );
}

export function isInvalidCredentials(error: AuthError): boolean {
  return (
    error.code === 'invalid_credentials' ||
    error.message.toLowerCase().includes('invalid login credentials')
  );
}

export function getAuthErrorMessage(error: AuthError): string {
  const message = error.message.toLowerCase();

  if (isInvalidCredentials(error)) {
    return 'Incorrect email or password.';
  }
  if (isAlreadyRegistered(error)) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (message.includes('password') && message.includes('least')) {
    return 'Password must be at least 6 characters.';
  }
  if (message.includes('valid email')) {
    return 'Enter a valid email address.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirm your email before signing in.';
  }

  return error.message || 'Authentication failed. Please try again.';
}
