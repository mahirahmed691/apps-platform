type ApiErrorKind = 'auth' | 'specific' | 'generic';

export type ParsedApiError = {
  kind: ApiErrorKind;
  message: string;
};

export async function parseApiError(response: Response): Promise<ParsedApiError> {
  let body: { error?: string } = {};

  try {
    body = await response.json();
  } catch {
    // Response body wasn't JSON — fall through to status-based handling.
  }

  if (response.status === 401) {
    return { kind: 'auth', message: 'Your session expired. Please sign in again.' };
  }

  if (body.error) {
    return { kind: 'specific', message: body.error };
  }

  if (response.status === 429) {
    return { kind: 'specific', message: 'Daily limit reached. Try again tomorrow or upgrade.' };
  }

  if (response.status === 503) {
    return { kind: 'specific', message: 'Temporarily unavailable, try again shortly.' };
  }

  if (response.status === 504) {
    return { kind: 'specific', message: 'Request timed out, please retry.' };
  }

  if (response.status === 502) {
    return { kind: 'specific', message: 'Generation failed, please retry.' };
  }

  return { kind: 'generic', message: 'Something went wrong. Please try again.' };
}
