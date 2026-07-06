'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, CvAnswers } from '@/lib/cvBuilder';
import type { PreviewSectionKey } from '@/lib/cvPreviewDocument';

export type DraftState = {
  answers: CvAnswers;
  messages: ChatMessage[];
  finished: boolean;
  turnCount: number;
  generatedCv?: string | null;
  previewEdits?: Partial<Record<PreviewSectionKey, string>>;
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useCvDraft(accessToken: string | undefined, state: DraftState | null, enabled: boolean) {
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDraft = useCallback(async (): Promise<DraftState | null> => {
    if (!accessToken) return null;

    const response = await fetch('/api/cv/draft', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.draft) return null;

    return {
      answers: data.draft.answers,
      messages: data.draft.messages,
      finished: data.draft.finished,
      turnCount: data.draft.turnCount ?? 0,
      generatedCv: data.draft.generatedCv ?? null,
      previewEdits: data.draft.previewEdits ?? {},
    };
  }, [accessToken]);

  const saveDraft = useCallback(async (draft: DraftState) => {
    if (!accessToken) return;

    setSaveStatus('saving');
    try {
      const response = await fetch('/api/cv/draft', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(draft),
      });

      setSaveStatus(response.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
  }, [accessToken]);

  const clearDraft = useCallback(async () => {
    if (!accessToken) return;
    await fetch('/api/cv/draft', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }, [accessToken]);

  useEffect(() => {
    if (!enabled || loaded) return;
    setLoaded(true);
  }, [enabled, loaded]);

  useEffect(() => {
    if (!enabled || !state || !accessToken) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft(state);
    }, 800);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [enabled, state, accessToken, saveDraft]);

  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const timer = setTimeout(() => setSaveStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  return { loadDraft, clearDraft, saveStatus, draftReady: loaded };
}
