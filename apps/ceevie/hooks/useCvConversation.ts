'use client';

import { useCallback, useState } from 'react';
import { parseApiError } from '@yourorg/app-core';
import {
  EMPTY_ANSWERS,
  buildInitialMessages,
  getPrefilledAnswersFromProfile,
  nextMessageId,
  type ChatMessage,
  type CvAnswers,
} from '@/lib/cvBuilder';
import { normalizeUserProfile, type UserProfile } from '@/lib/userProfile';
import type { DraftState } from '@/hooks/useCvDraft';

function mergeAnswers(current: CvAnswers, updates?: Partial<CvAnswers>): CvAnswers {
  if (!updates) return current;
  const merged = { ...current };
  for (const key of Object.keys(EMPTY_ANSWERS) as (keyof CvAnswers)[]) {
    const value = updates[key];
    if (typeof value === 'string' && value.trim()) {
      merged[key] = merged[key].trim()
        ? `${merged[key].trim()}\n${value.trim()}`
        : value.trim();
    }
  }
  return merged;
}

function createInitialState(profile?: UserProfile | null) {
  const initial = buildInitialMessages(profile);
  return {
    messages: initial.messages,
    answers: { ...EMPTY_ANSWERS, ...getPrefilledAnswersFromProfile(profile) },
    composerHint: initial.hint,
    composerPlaceholder: initial.placeholder,
  };
}

export function useCvConversation(accessToken: string | undefined) {
  const [boot] = useState(() => createInitialState());
  const [messages, setMessages] = useState<ChatMessage[]>(boot.messages);
  const [answers, setAnswers] = useState<CvAnswers>(boot.answers);
  const [finished, setFinished] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [composerHint, setComposerHint] = useState<string | undefined>(boot.composerHint);
  const [composerPlaceholder, setComposerPlaceholder] = useState(boot.composerPlaceholder);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const restoreDraft = useCallback((draft: DraftState) => {
    setMessages(draft.messages.length > 0 ? draft.messages : createInitialState().messages);
    setAnswers({ ...EMPTY_ANSWERS, ...draft.answers });
    setFinished(draft.finished);
    setTurnCount(draft.turnCount);
    setInitialized(true);
    return draft.generatedCv ?? null;
  }, []);

  const updateAnswer = useCallback((key: keyof CvAnswers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const markInitialized = useCallback(() => {
    setInitialized(true);
  }, []);

  const sendMessage = useCallback(
    async (text: string, onError: (message: string) => void) => {
      const trimmed = text.trim();
      if (!trimmed || thinking || finished) return;

      if (!accessToken) {
        onError('Your session expired. Please sign in again.');
        return;
      }

      const userMessage: ChatMessage = { id: nextMessageId(), role: 'user', content: trimmed };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setSuggestions([]);
      setThinking(true);

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: nextMessages,
            answers,
            userMessage: trimmed,
          }),
        });

        if (!response.ok) {
          const parsed = await parseApiError(response);
          onError(parsed.message);
          return;
        }

        const data = await response.json();
        const updatedAnswers = data.answers ?? mergeAnswers(answers, data.fieldUpdates);
        setAnswers(updatedAnswers);
        setTurnCount((c) => c + 1);

        const assistantMessages: ChatMessage[] = [];
        if (data.acknowledgment) {
          assistantMessages.push({
            id: nextMessageId(),
            role: 'assistant',
            content: data.acknowledgment,
          });
        }

        if (data.ready) {
          setFinished(true);
          setSuggestions([]);
          assistantMessages.push({
            id: nextMessageId(),
            role: 'assistant',
            content:
              data.nextQuestion ??
              'Brilliant — I have got everything. Hit Build my CV whenever you are ready.',
          });
        } else if (data.nextQuestion) {
          assistantMessages.push({
            id: nextMessageId(),
            role: 'assistant',
            content: data.nextQuestion,
          });
          setComposerHint(data.hint);
          setComposerPlaceholder(data.placeholder ?? 'Talk naturally…');
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        } else {
          setSuggestions([]);
        }

        if (assistantMessages.length) {
          setMessages((prev) => [...prev, ...assistantMessages]);
        }
      } catch {
        onError('Something went wrong. Please try again.');
      } finally {
        setThinking(false);
      }
    },
    [accessToken, answers, finished, messages, thinking]
  );

  const applyProfileContext = useCallback((profile: UserProfile) => {
    const safe = normalizeUserProfile(profile);
    setAnswers((prev) => ({ ...prev, ...getPrefilledAnswersFromProfile(safe) }));

    setMessages((current) => {
      if (current.some((message) => message.role === 'user')) return current;
      const initial = buildInitialMessages(safe);
      setComposerHint(initial.hint);
      setComposerPlaceholder(initial.placeholder);
      return initial.messages;
    });
  }, []);

  const reset = useCallback(() => {
    const initial = createInitialState();
    setMessages(initial.messages);
    setAnswers(initial.answers);
    setFinished(false);
    setTurnCount(0);
    setComposerHint(initial.composerHint);
    setComposerPlaceholder(initial.composerPlaceholder);
    setSuggestions([]);
    setInitialized(true);
  }, []);

  const reopenSection = useCallback((sectionId: keyof CvAnswers) => {
    setAnswers((prev) => ({ ...prev, [sectionId]: '' }));
    setFinished(false);
  }, []);

  return {
    messages,
    answers,
    finished,
    thinking,
    turnCount,
    composerHint,
    composerPlaceholder,
    suggestions,
    initialized,
    restoreDraft,
    markInitialized,
    sendMessage,
    updateAnswer,
    reset,
    reopenSection,
    applyProfileContext,
  };
}
