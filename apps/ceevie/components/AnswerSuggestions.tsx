'use client';

type AnswerSuggestionsProps = {
  suggestions: string[];
  mode: 'clarity' | 'examples' | 'enhance';
  unclearTranscript?: string;
  disabled?: boolean;
  onSelect: (text: string) => void;
  onSendAnyway?: () => void;
  onDismiss?: () => void;
};

const MODE_COPY = {
  clarity: {
    title: 'Hard to catch that',
    subtitle: 'Tap an example to use it as your answer, or try the mic again.',
  },
  examples: {
    title: 'Quick examples',
    subtitle: 'Tap one to use it — edit later in the preview if needed.',
  },
  enhance: {
    title: 'Strengthen your answer',
    subtitle: 'Tap an example to add more detail.',
  },
} as const;

export function AnswerSuggestions({
  suggestions,
  mode,
  unclearTranscript,
  disabled,
  onSelect,
  onSendAnyway,
  onDismiss,
}: AnswerSuggestionsProps) {
  if (suggestions.length === 0) return null;

  const copy = MODE_COPY[mode];

  return (
    <div className={`answer-suggestions answer-suggestions-${mode}`} role="group" aria-label={copy.title}>
      <div className="answer-suggestions-head">
        <div>
          <p className="answer-suggestions-title">{copy.title}</p>
          <p className="answer-suggestions-subtitle">{copy.subtitle}</p>
        </div>
        {mode === 'clarity' && onDismiss && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss} disabled={disabled}>
            Try again
          </button>
        )}
      </div>

      {mode === 'clarity' && unclearTranscript && (
        <p className="answer-suggestions-heard">
          We heard: <span>&ldquo;{unclearTranscript}&rdquo;</span>
        </p>
      )}

      <div className="answer-suggestions-grid">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion}
            type="button"
            className="answer-suggestion-card"
            disabled={disabled}
            onClick={() => onSelect(suggestion)}
          >
            <span className="answer-suggestion-index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="answer-suggestion-text">{suggestion}</span>
          </button>
        ))}
      </div>

      {mode === 'clarity' && onSendAnyway && unclearTranscript && (
        <button type="button" className="answer-suggestions-anyway" onClick={onSendAnyway} disabled={disabled}>
          Use what I said anyway
        </button>
      )}
    </div>
  );
}
