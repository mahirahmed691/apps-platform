export type DraftMessage = { role?: string; content?: string };

export function draftHasUserMessages(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  return messages.some(
    (message) =>
      typeof message === 'object' &&
      message !== null &&
      'role' in message &&
      (message as DraftMessage).role === 'user'
  );
}

export function shouldBackfillStudioSetup(input: {
  studioSetupCompletedAt: string | null;
  fullName: string;
  headline: string;
  location: string;
  draftMessages: unknown;
}): boolean {
  if (input.studioSetupCompletedAt) return false;
  if (!input.fullName.trim() || !input.headline.trim() || !input.location.trim()) return false;
  return draftHasUserMessages(input.draftMessages);
}
