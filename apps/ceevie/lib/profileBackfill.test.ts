import { describe, expect, it } from 'vitest';
import { draftHasUserMessages, shouldBackfillStudioSetup } from '@/lib/profileBackfill';

describe('draftHasUserMessages', () => {
  it('returns false for welcome-only thread', () => {
    expect(
      draftHasUserMessages([
        { role: 'assistant', content: 'Welcome' },
        { role: 'assistant', content: 'What is your name?' },
      ])
    ).toBe(false);
  });

  it('returns true when user spoke', () => {
    expect(
      draftHasUserMessages([
        { role: 'assistant', content: 'Welcome' },
        { role: 'user', content: 'I led a team of five' },
      ])
    ).toBe(true);
  });
});

describe('shouldBackfillStudioSetup', () => {
  it('requires completed profile fields and user messages', () => {
    expect(
      shouldBackfillStudioSetup({
        studioSetupCompletedAt: null,
        fullName: 'Mahir',
        headline: 'PM',
        location: 'London, UK',
        draftMessages: [{ role: 'user', content: 'hello' }],
      })
    ).toBe(true);
  });

  it('does not backfill incomplete profile', () => {
    expect(
      shouldBackfillStudioSetup({
        studioSetupCompletedAt: null,
        fullName: 'Mahir',
        headline: '',
        location: '',
        draftMessages: [{ role: 'user', content: 'hello' }],
      })
    ).toBe(false);
  });

  it('does not backfill when studio already complete', () => {
    expect(
      shouldBackfillStudioSetup({
        studioSetupCompletedAt: '2026-01-01T00:00:00.000Z',
        fullName: 'Mahir',
        headline: 'PM',
        location: 'London, UK',
        draftMessages: [{ role: 'user', content: 'hello' }],
      })
    ).toBe(false);
  });
});
