type AccountIntent = 'candidate' | 'recruiter';

type RecruiterIntentToggleProps = {
  value: AccountIntent;
  onChange: (value: AccountIntent) => void;
  disabled?: boolean;
};

export function RecruiterIntentToggle({ value, onChange, disabled }: RecruiterIntentToggleProps) {
  return (
    <fieldset className="auth-intent-toggle" disabled={disabled}>
      <legend className="auth-intent-legend">I&apos;m joining as a</legend>
      <div className="auth-intent-options" role="radiogroup" aria-label="Account type">
        <button
          type="button"
          role="radio"
          aria-checked={value === 'candidate'}
          className={`auth-intent-option${value === 'candidate' ? ' auth-intent-option-active' : ''}`}
          onClick={() => onChange('candidate')}
        >
          <span className="auth-intent-option-title">Job seeker</span>
          <span className="auth-intent-option-copy">Build my CV by voice</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === 'recruiter'}
          className={`auth-intent-option${value === 'recruiter' ? ' auth-intent-option-active' : ''}`}
          onClick={() => onChange('recruiter')}
        >
          <span className="auth-intent-option-title">Recruiter</span>
          <span className="auth-intent-option-copy">Send role brief invite links</span>
        </button>
      </div>
    </fieldset>
  );
}
