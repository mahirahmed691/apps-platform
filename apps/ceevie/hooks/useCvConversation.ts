'use client';

import { useCallback, useState } from 'react';
import { parseApiError } from '@yourorg/app-core';
import {
  EMPTY_ANSWERS,
  FIRST_QUESTION,
  WELCOME_MESSAGE,
  nextMessageId,
  type ChatMessage,
  type CvAnswers,
} from '@/lib/cvBuilder';
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

function createInitialMessages(): ChatMessage[] {
  return [
    { id: nextMessageId(), role: 'assistant', content: WELCOME_MESSAGE },
    { id: nextMessageId(), role: 'assistant', content: FIRST_QUESTION },
  ];
}

export function useCvConversation(accessToken: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>(createInitialMessages);
  const [answers, setAnswers] = useState<CvAnswers>(EMPTY_ANSWERS);
  const [finished, setFinished] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [composerHint, setComposerHint] = useState<string | undefined>(
    'A sentence is enough. This shapes the whole CV.'
  );
  const [composerPlaceholder, setComposerPlaceholder] = useState(
    'e.g. Senior Product Manager in fintech…'
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const restoreDraft = useCallback((draft: DraftState) => {
    setMessages(draft.messages.length > 0 ? draft.messages : createInitialMessages());
    setAnswers(draft.answers);
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

  const reset = useCallback(() => {
    setMessages(createInitialMessages());
    setAnswers(EMPTY_ANSWERS);
    setFinished(false);
    setTurnCount(0);
    setComposerHint('A sentence is enough. This shapes the whole CV.');
    setComposerPlaceholder('e.g. Senior Product Manager in fintech…');
    setSuggestions([]);
    setInitialized(true);
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
  };
}
