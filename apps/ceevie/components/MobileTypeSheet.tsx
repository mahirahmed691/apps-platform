'use client';

import { FormEvent, useEffect, useState, type RefObject } from 'react';

type SuggestionMode = 'clarity' | 'examples' | 'enhance';

type MobileTypeSheetProps = {
  open: boolean;
  currentPrompt?: string;
  suggestions: string[];
  suggestionMode: SuggestionMode;
  unclearTranscript?: string;
  input: string;
  composerPlaceholder: string;
  thinking: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  onSendAnyway?: () => void;
  onDismissClarity?: () => void;
};

const MODE_COPY = {
  clarity: {
    title: 'Hard to catch that',
    subtitle: 'Select one or more examples, then add them to your answer.',
  },
  examples: {
    title: 'Quick examples',
    subtitle: 'Tap to select — add one or more to your answer.',
  },
  enhance: {
    title: 'Strengthen your answer',
    subtitle: 'Select examples to add more detail.',
  },
} as const;

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5 9.5 17 19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MobileTypeSheet({
  open,
  currentPrompt,
  suggestions,
  suggestionMode,
  unclearTranscript,
  input,
  composerPlaceholder,
  thinking,
  inputRef,
  onInputChange,
  onSubmit,
  onClose,
  onSendAnyway,
  onDismissClarity,
}: MobileTypeSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      return;
    }

    document.body.classList.add('mobile-type-sheet-open');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);

    return () => {
      document.body.classList.remove('mobile-type-sheet-open');
      window.clearTimeout(timer);
    };
  }, [open, inputRef]);

  function toggleSuggestion(text: string) {
    if (thinking) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });
  }

  function addSelectedToInput() {
    if (selected.size === 0) return;
    const block = Array.from(selected).join('\n\n');
    onInputChange(input.trim() ? `${input.trim()}\n\n${block}` : block);
    setSelected(new Set());
    inputRef.current?.focus();
  }

  if (!open) return null;

  const copy = MODE_COPY[suggestionMode];
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="mobile-type-sheet" role="dialog" aria-modal="true" aria-label="Type your answer">
      <header className="mobile-type-sheet-header">
        <button type="button" className="mobile-type-sheet-close" onClick={onClose}>
          Mic
        </button>
        <span className="mobile-type-sheet-title">Type answer</span>
        <button
          type="submit"
          form="mobile-type-sheet-form"
          className="mobile-type-sheet-send"
          disabled={thinking || !input.trim()}
        >
          Send
        </button>
      </header>

      <div className="mobile-type-sheet-scroll">
        {currentPrompt ? (
          <div className="mobile-type-sheet-prompt">
            <span className="mobile-type-sheet-prompt-label">Ceevie asks</span>
            <p>{currentPrompt}</p>
          </div>
        ) : null}

        {hasSuggestions ? (
          <section className="mobile-type-sheet-suggestions" aria-label={copy.title}>
            <div className="mobile-type-sheet-suggestions-head">
              <div>
                <p className="mobile-type-sheet-suggestions-title">{copy.title}</p>
                <p className="mobile-type-sheet-suggestions-subtitle">{copy.subtitle}</p>
              </div>
              {suggestionMode === 'clarity' && onDismissClarity ? (
                <button type="button" className="mobile-type-sheet-aux" onClick={onDismissClarity} disabled={thinking}>
                  Try again
                </button>
              ) : null}
            </div>

            {suggestionMode === 'clarity' && unclearTranscript ? (
              <p className="mobile-type-sheet-heard">
                We heard: <span>&ldquo;{unclearTranscript}&rdquo;</span>
              </p>
            ) : null}

            {selected.size > 0 ? (
              <button type="button" className="mobile-type-sheet-add-selected" onClick={addSelectedToInput} disabled={thinking}>
                Add {selected.size} selected
              </button>
            ) : null}

            <div className="mobile-type-sheet-suggestion-list">
              {suggestions.map((suggestion, index) => {
                const isSelected = selected.has(suggestion);
                return (
                  <button
                    key={suggestion}
                    type="button"
                    className={`mobile-type-suggestion${isSelected ? ' mobile-type-suggestion-selected' : ''}`}
                    disabled={thinking}
                    aria-pressed={isSelected}
                    onClick={() => toggleSuggestion(suggestion)}
                  >
                    <span className="mobile-type-suggestion-check" aria-hidden="true">
                      {isSelected ? <CheckIcon /> : null}
                    </span>
                    <span className="mobile-type-suggestion-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="mobile-type-suggestion-text">{suggestion}</span>
                  </button>
                );
              })}
            </div>

            {suggestionMode === 'clarity' && onSendAnyway && unclearTranscript ? (
              <button type="button" className="mobile-type-sheet-anyway" onClick={onSendAnyway} disabled={thinking}>
                Use what I said anyway
              </button>
            ) : null}
          </section>
        ) : null}

        <form id="mobile-type-sheet-form" className="mobile-type-sheet-form" onSubmit={onSubmit}>
          <label className="mobile-type-sheet-input-label" htmlFor="mobile-type-sheet-input">
            Your answer
          </label>
          <textarea
            id="mobile-type-sheet-input"
            ref={inputRef}
            rows={6}
            className="mobile-type-sheet-input"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={composerPlaceholder}
            disabled={thinking}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSubmit(event);
              }
            }}
          />
        </form>
      </div>
    </div>
  );
}
